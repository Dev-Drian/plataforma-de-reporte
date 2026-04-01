"""
Rutas para flujo OAuth (init y callback)
"""
from fastapi import APIRouter, Depends, Request, Query, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, created_response, error_response
from app.core.config import settings
from app.models import User, OAuthConfig, Account
from app.schemas.oauth import (
    OAuthInitRequest,
    OAuthInitResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse
)
import secrets
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from app.api.oauth.utils.auth_url import build_auth_url
from app.api.oauth.utils.token_exchange import exchange_code_for_tokens
from app.api.oauth.google.ads.functions import get_google_ads_accessible_customers
from app.api.oauth.google.analytics.functions import get_first_analytics_property, get_all_analytics_properties
from app.api.oauth.google.search_console.functions import get_search_console_sites
from app.core.cache import get_from_cache, set_to_cache, delete_from_cache

logger = logging.getLogger(__name__)

router = APIRouter()


# ========== ENDPOINT "CONECTAR CON GOOGLE (TODAS LAS CUENTAS)" ==========

@router.post("/google/connect")
async def google_connect_all(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Un solo botón "Conectar con Google": pide permisos para Ads, Analytics, Search Console y Business Profile.
    El usuario va a Google, autoriza una vez, y en el callback se crean/actualizan
    las cuentas elegidas (Ads, Analytics, Search Console) y siempre una fila `gbp` con los mismos tokens.

    Uso desde el frontend:
      1. POST /oauth/google/connect (este endpoint) → respuesta con auth_url y state.
      2. Redirigir al usuario a auth_url.
      3. Cuando Google redirige al frontend con ?code=...&state=..., llamar
         POST /oauth/callback con { "platform": "google", "account_type": "all", "code": "...", "state": "..." }.
      4. Si la respuesta tiene requires_selection: true, mostrar modal de cuentas Ads y volver a
         llamar POST /oauth/callback con los mismos state y selected_customer_ids (sin code).
    """
    return await init_oauth_flow(
        oauth_data=OAuthInitRequest(platform="google", account_type="all"),
        request=request,
        current_user=current_user,
        db=db,
    )


# ========== FUNCIONES HELPER ==========

def build_credentials_dict(tokens: Dict, config: OAuthConfig) -> Dict:
    """Construye diccionario de credenciales para Google Ads API"""
    return {
        "access_token": tokens.get("access_token"),
        "refresh_token": tokens.get("refresh_token"),
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "developer_token": getattr(config, 'developer_token', None)
    }


def get_login_customer_id_for_subaccount(is_subaccount: bool, parent_customer_id: Optional[str]) -> Optional[str]:
    """Determina el login_customer_id para subcuentas"""
    if is_subaccount and parent_customer_id:
        logger.info(f"🔐 Subcuenta detectada, usando MCC padre: {parent_customer_id}")
        return parent_customer_id
    return None


def classify_google_ads_error(error: Exception) -> Tuple[str, str]:
    """
    Clasifica errores de Google Ads API
    Returns: (category, customer_id) donde category es 'inactive', 'not_found', o 'failed'
    """
    error_msg = str(error)
    error_type = type(error).__name__
    
    if "PERMISSION_DENIED" in error_msg or "403" in error_msg or "USER_PERMISSION_DENIED" in error_msg:
        return ("inactive", error_msg)
    elif "NOT_FOUND" in error_msg or "404" in error_msg:
        return ("not_found", error_msg)
    else:
        return ("failed", f"{error_type}: {error_msg}")


async def process_google_ads_account(
    customer_info: Dict,
    tokens: Dict,
    config: OAuthConfig,
    current_user: User,
    db: Session
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Procesa una cuenta de Google Ads (crea o actualiza)
    Returns: (account_data, error_category) donde error_category puede ser None, 'inactive', 'not_found', o 'failed'
    """
    customer_id_formatted = customer_info.get("customer_id")
    is_subaccount = customer_info.get("is_subaccount", False)
    parent_customer_id = customer_info.get("parent_customer_id")
    descriptive_name = customer_info.get("descriptive_name")
    
    try:
        from app.services.ads import AdsService
        ads_service = AdsService()
        
        credentials_dict = build_credentials_dict(tokens, config)
        login_customer_id = get_login_customer_id_for_subaccount(is_subaccount, parent_customer_id)
        
        # Obtener información completa de la cuenta
        account_details = await ads_service.get_account_info(
            customer_id=customer_id_formatted,
            credentials=credentials_dict,
            login_customer_id=login_customer_id
        )
        
        # Verificar si es MCC (solo para cuentas principales)
        is_mcc_verified = False
        if not is_subaccount:
            is_mcc_verified = await ads_service.is_manager_account(
                customer_id_formatted,
                credentials_dict
            )
        
        # Preparar extra_data
        extra_data_dict = {
            "is_mcc": is_mcc_verified,
            "customer_id": customer_id_formatted,
            "descriptive_name": account_details.get("descriptive_name", descriptive_name),
            "currency_code": account_details.get("currency_code"),
            "time_zone": account_details.get("time_zone"),
            "status": "ENABLED"
        }
        
        # Si es subcuenta, guardar parent_customer_id en extra_data
        if is_subaccount and parent_customer_id:
            extra_data_dict["parent_customer_id"] = parent_customer_id
            extra_data_dict["is_subaccount"] = True
        
        # Buscar cuenta MCC padre si es subcuenta
        parent_account_id = None
        if is_subaccount and parent_customer_id:
            parent_account = db.query(Account).filter(
                Account.organization_id == current_user.organization_id,
                Account.platform == "google",
                Account.account_type == "ads",
                Account.account_id == parent_customer_id,
                Account.deleted_at.is_(None)
            ).first()
            
            if parent_account:
                parent_account_id = parent_account.id
                logger.info(f"🔐 MCC padre encontrado en BD: {parent_account_id} ({parent_customer_id})")
            else:
                logger.warning(f"⚠️ MCC padre no encontrado en BD: {parent_customer_id}")
        
        # Buscar o crear cuenta (updateOrCreate pattern)
        existing_account = db.query(Account).filter(
            Account.organization_id == current_user.organization_id,
            Account.platform == "google",
            Account.account_type == "ads",
            Account.account_id == customer_id_formatted
        ).first()
        
        account_name = account_details.get("descriptive_name", descriptive_name)
        
        if existing_account:
            # Actualizar cuenta existente
            existing_account.access_token = tokens.get("access_token")
            if tokens.get("refresh_token"):
                existing_account.refresh_token = tokens.get("refresh_token")
            if tokens.get("expires_in"):
                existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            existing_account.account_name = account_name
            existing_account.extra_data = json.dumps(extra_data_dict)
            # Actualizar parent_account_id si es subcuenta
            if parent_account_id:
                existing_account.parent_account_id = parent_account_id
                logger.info(f"🔐 parent_account_id actualizado: {parent_account_id}")
            existing_account.is_active = True
            existing_account.deleted_at = None
            db.commit()
            db.refresh(existing_account)
            
            logger.info(f"✅ Cuenta actualizada: {customer_id_formatted} - {account_name}")
            return ({
                "account_id": existing_account.id,
                "customer_id": customer_id_formatted,
                "name": account_name,
                "is_mcc": is_mcc_verified,
                "action": "updated"
            }, None)
        else:
            # Crear nueva cuenta
            new_account = Account(
                organization_id=current_user.organization_id,
                platform="google",
                account_type="ads",
                account_id=customer_id_formatted,
                account_name=account_name,
                user_email=current_user.email,
                access_token=tokens.get("access_token"),
                refresh_token=tokens.get("refresh_token"),
                is_active=True,
                extra_data=json.dumps(extra_data_dict),
                parent_account_id=parent_account_id  # Asignar relación con MCC padre si es subcuenta
            )
            
            if tokens.get("expires_in"):
                new_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            
            db.add(new_account)
            db.commit()
            db.refresh(new_account)
            
            logger.info(f"✅ Cuenta creada: {customer_id_formatted} - {account_name} (parent_account_id: {parent_account_id})")
            return ({
                "account_id": new_account.id,
                "customer_id": customer_id_formatted,
                "name": account_name,
                "is_mcc": is_mcc_verified,
                "action": "created"
            }, None)
            
    except Exception as e:
        error_category, error_msg = classify_google_ads_error(e)
        logger.warning(f"⚠️ Error al procesar cuenta {customer_id_formatted} ({error_category}): {error_msg[:100]}")
        return (None, error_category)


def format_customer_id(customer_id: str) -> str:
    """Formatea customer_id con guiones (1234567890 -> 123-456-7890)"""
    customer_id_clean = customer_id.replace("-", "")
    if len(customer_id_clean) == 10:
        return f"{customer_id_clean[0:3]}-{customer_id_clean[3:6]}-{customer_id_clean[6:10]}"
    return customer_id_clean


def should_show_account_selection(accessible_customers: List[Dict], selected_customer_ids: Optional[List[str]]) -> bool:
    """Determina si se debe mostrar el modal de selección de cuentas"""
    if selected_customer_ids:
        return False
    
    total_accounts = len(accessible_customers)
    mcc_count = sum(1 for acc in accessible_customers if acc.get("is_mcc", False))
    subaccount_count = sum(1 for acc in accessible_customers if acc.get("is_subaccount", False))
    
    return total_accounts > 1 or (mcc_count > 0 and subaccount_count > 0)


@router.post("/init", response_model=OAuthInitResponse)
async def init_oauth_flow(
    oauth_data: OAuthInitRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inicia el flujo OAuth
    Retorna la URL de autorización y un state token
    """
    try:
        logger.info(f"🔐 Iniciando OAuth - Platform: {oauth_data.platform}, Type: {oauth_data.account_type}")
        
        # Obtener configuración OAuth
        config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == current_user.organization_id,
            OAuthConfig.platform == oauth_data.platform.lower(),
            OAuthConfig.is_active == True
        ).first()
        
        if not config:
            logger.warning(f"⚠️ No se encontró configuración OAuth para {oauth_data.platform}")
            return error_response(
                f"No hay configuración OAuth para {oauth_data.platform}. Configúrala primero.",
                400,
                "OAuth config not found",
                str(request.url.path)
            )
        
        # Generar state token y construir URL de autorización
        state_token = secrets.token_urlsafe(32)
        auth_url = build_auth_url(oauth_data.platform, config, state_token, oauth_data.account_type)
        
        # Guardar información del usuario en Redis para el callback (válido por 10 minutos)
        oauth_state_key = f"oauth:state:{state_token}"
        state_data = {
            "user_id": current_user.id,
            "organization_id": current_user.organization_id,
            "platform": oauth_data.platform.lower(),
            "account_type": oauth_data.account_type,
            "created_at": datetime.utcnow().isoformat()
        }
        set_to_cache(oauth_state_key, state_data, ttl=600)  # 10 minutos
        
        logger.info(f"✅ OAuth iniciado - State: {state_token[:20]}...")
        
        return success_response(
            data={
                "auth_url": auth_url,
                "state": state_token
            },
            message="OAuth flow iniciado",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        import traceback
        logger.error(f"❌ ========== Error al iniciar OAuth ==========")
        logger.error(f"❌ Error: {str(e)}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        logger.error(f"❌ ===========================================")
        return error_response(
            f"Error al iniciar OAuth: {str(e)}",
            500,
            str(e),
            str(request.url.path)
        )


@router.post("/callback", response_model=OAuthCallbackResponse)
async def oauth_callback(
    callback_data: OAuthCallbackRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Callback del flujo OAuth
    Intercambia el authorization code por tokens y crea/actualiza la cuenta
    """
    # Validar state token (en producción, validar contra Redis/sesión)
    # Por ahora solo verificamos que existe
    
    # Obtener configuración OAuth
    config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == current_user.organization_id,
        OAuthConfig.platform == callback_data.platform.lower(),
        OAuthConfig.is_active == True
    ).first()
    
    if not config:
        return error_response(
            f"No hay configuración OAuth para {callback_data.platform}",
            400,
            "OAuth config not found",
            str(request.url.path)
        )
    
    # Verificar si hay tokens guardados en Redis (de una llamada anterior con selección)
    tokens = None
    oauth_cache_key = f"oauth:tokens:{callback_data.state}"
    cached_tokens = get_from_cache(oauth_cache_key)
    
    if cached_tokens:
        logger.info(f"🔐 Reutilizando tokens de cache")
        tokens = json.loads(cached_tokens) if isinstance(cached_tokens, str) else cached_tokens
    elif callback_data.code:
        # Intercambiar code por tokens (solo si hay código y no hay tokens en cache)
        # IMPORTANTE: El código OAuth solo se puede usar UNA VEZ
        try:
            tokens = await exchange_code_for_tokens(
                callback_data.platform,
                config,
                callback_data.code,
                callback_data.account_type,
                selected_customer_id=callback_data.selected_customer_id
            )
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            logger.error(f"❌ Error al obtener tokens OAuth: {str(e)}")
            logger.error(f"❌ Traceback completo:\n{error_traceback}")
            
            # Para TikTok, proporcionar mensaje más específico
            if callback_data.platform.lower() == "tiktok":
                error_message = f"Error al conectar con TikTok: {str(e)}"
                if "redirect_uri" in str(e).lower():
                    error_message += f" Verifica que el Redirect URI en TikTok for Developers sea exactamente: {settings.FRONTEND_URL.rstrip('/')}/oauth/callback"
                return error_response(
                    error_message,
                    500,
                    "TikTok OAuth error",
                    str(request.url.path)
                )
            
            raise
        
        if not tokens:
            return error_response(
                "Error al obtener tokens OAuth",
                500,
                "Token exchange failed",
                str(request.url.path)
            )
    else:
        return error_response(
            "No se proporcionó código de autorización ni tokens guardados",
            400,
            "Missing authorization code",
            str(request.url.path)
        )
    
    # -------- Google "all": un solo OAuth; usuario elige qué conectar (Ads, Analytics, Search Console) --------
    if callback_data.platform.lower() == "google" and callback_data.account_type == "all":
        logger.info(f"🔐 Procesando Google 'all': Ads + Analytics + Search Console + Business Profile (GBP)")
        summary = {"ads": [], "analytics": [], "search_console": [], "gbp": [], "messages": []}
        user_email = current_user.email or "unknown"

        # Obtener listas de lo disponible (Ads, Analytics, Search Console)
        accessible_customers = []
        if tokens.get("refresh_token") and getattr(config, "developer_token", None):
            accessible_customers = await get_google_ads_accessible_customers(
                tokens.get("access_token"), config, tokens.get("refresh_token")
            ) or []
        analytics_properties = []
        try:
            analytics_properties = await get_all_analytics_properties(tokens.get("access_token"))
        except Exception as e:
            logger.warning(f"⚠️ Listar Analytics en 'all': {e}")
        sites_raw = []
        try:
            sites_raw = await get_search_console_sites(tokens.get("access_token")) or []
        except Exception as e:
            logger.warning(f"⚠️ Listar Search Console en 'all': {e}")
        available_sites = [{"site_url": s.get("siteUrl") or s.get("site_url")} for s in sites_raw if s.get("siteUrl") or s.get("site_url")]

        # ¿El usuario ya envió su selección? (segunda llamada al callback)
        has_selection = (
            callback_data.selected_customer_ids is not None
            or callback_data.selected_analytics_property_ids is not None
            or callback_data.selected_search_console_sites is not None
        )
        has_anything = bool(accessible_customers or analytics_properties or available_sites)

        if has_anything and not has_selection:
            set_to_cache(oauth_cache_key, json.dumps(tokens), ttl=600)
            return success_response(
                data={
                    "requires_selection": True,
                    "available_ads_accounts": [
                        {
                            "customer_id": acc.get("customer_id"),
                            "customer_id_raw": acc.get("customer_id_raw"),
                            "descriptive_name": acc.get("descriptive_name", f"Google Ads {acc.get('customer_id')}"),
                            "is_mcc": acc.get("is_mcc", False),
                            "is_subaccount": acc.get("is_subaccount", False),
                            "parent_customer_id": acc.get("parent_customer_id"),
                        }
                        for acc in accessible_customers
                    ],
                    "available_analytics_properties": [
                        {"property_id": p["property_id"], "property_name": p["property_name"], "account_name": p["account_name"]}
                        for p in analytics_properties
                    ],
                    "available_search_console_sites": available_sites,
                    "note": "Elige qué conectar (puedes dejar alguno sin marcar). Vuelve a llamar al callback con el mismo 'state' y: selected_customer_ids, selected_analytics_property_ids, selected_search_console_sites (arrays, pueden estar vacíos).",
                },
                message="Elige qué cuentas de Google conectar (Ads, Analytics, Search Console). Business Profile se guardará al confirmar con los mismos permisos.",
                status_code=200,
                path=str(request.url.path),
            )

        # Procesar solo lo que el usuario eligió
        selected_ads = set(callback_data.selected_customer_ids or [])
        selected_analytics = set(callback_data.selected_analytics_property_ids or [])
        selected_sites = set(callback_data.selected_search_console_sites or [])

        # 1) Google Ads
        if tokens.get("refresh_token") and getattr(config, "developer_token", None) and accessible_customers:
            for customer_info in accessible_customers:
                cid = customer_info.get("customer_id")
                if cid not in selected_ads and (cid or "").replace("-", "") not in selected_ads:
                    continue
                account_data, err = await process_google_ads_account(customer_info, tokens, config, current_user, db)
                if account_data:
                    summary["ads"].append(account_data)
                    summary["messages"].append(f"✅ Ads: {account_data.get('name', cid)}")
        elif not tokens.get("refresh_token"):
            summary["messages"].append("⚠️ Google Ads: no refresh_token.")
        elif not getattr(config, "developer_token", None):
            summary["messages"].append("⚠️ Google Ads: sin Developer Token.")

        # 2) Google Analytics (solo propiedades seleccionadas)
        for prop in analytics_properties:
            pid = prop.get("property_id")
            if pid not in selected_analytics:
                continue
            try:
                account_id_ga = f"{user_email}_analytics_{pid}"
                name_ga = prop.get("property_name") or f"GA4 {pid}"
                existing_ga = db.query(Account).filter(
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "google",
                    Account.account_type == "analytics",
                    Account.account_id == account_id_ga,
                ).first()
                if existing_ga:
                    existing_ga.access_token = tokens.get("access_token")
                    if tokens.get("refresh_token"):
                        existing_ga.refresh_token = tokens.get("refresh_token")
                    if tokens.get("expires_in"):
                        existing_ga.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    existing_ga.account_name = name_ga
                    existing_ga.is_active = True
                    existing_ga.deleted_at = None
                    db.commit()
                    db.refresh(existing_ga)
                    summary["analytics"].append({"id": existing_ga.id, "property_id": pid, "action": "updated"})
                else:
                    new_ga = Account(
                        organization_id=current_user.organization_id,
                        platform="google",
                        account_type="analytics",
                        account_id=account_id_ga,
                        account_name=name_ga,
                        user_email=current_user.email,
                        access_token=tokens.get("access_token"),
                        refresh_token=tokens.get("refresh_token"),
                        is_active=True,
                    )
                    if tokens.get("expires_in"):
                        new_ga.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    db.add(new_ga)
                    db.commit()
                    db.refresh(new_ga)
                    summary["analytics"].append({"id": new_ga.id, "property_id": pid, "action": "created"})
                summary["messages"].append(f"✅ Analytics: {name_ga}")
            except Exception as e:
                logger.warning(f"⚠️ Analytics property {pid}: {e}")

        # 3) Google Search Console (solo sitios seleccionados)
        for site_entry in sites_raw:
            site_url = site_entry.get("siteUrl") or site_entry.get("site_url")
            if not site_url or site_url not in selected_sites:
                continue
            try:
                existing_sc = db.query(Account).filter(
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "google",
                    Account.account_type == "search_console",
                    Account.account_id == site_url,
                ).first()
                if existing_sc:
                    existing_sc.access_token = tokens.get("access_token")
                    if tokens.get("refresh_token"):
                        existing_sc.refresh_token = tokens.get("refresh_token")
                    if tokens.get("expires_in"):
                        existing_sc.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    existing_sc.is_active = True
                    existing_sc.deleted_at = None
                    db.commit()
                    summary["search_console"].append({"account_id": existing_sc.id, "site_url": site_url, "action": "updated"})
                else:
                    new_sc = Account(
                        organization_id=current_user.organization_id,
                        platform="google",
                        account_type="search_console",
                        account_id=site_url,
                        account_name=f"Search Console - {site_url}",
                        user_email=current_user.email,
                        access_token=tokens.get("access_token"),
                        refresh_token=tokens.get("refresh_token"),
                        is_active=True,
                    )
                    if tokens.get("expires_in"):
                        new_sc.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    db.add(new_sc)
                    db.commit()
                    db.refresh(new_sc)
                    summary["search_console"].append({"account_id": new_sc.id, "site_url": site_url, "action": "created"})
                summary["messages"].append(f"✅ Search Console: {site_url}")
            except Exception as e:
                logger.warning(f"⚠️ Search Console {site_url}: {e}")

        # 4) Google Business Profile: una cuenta `gbp` por usuario (mismos tokens que el OAuth unificado)
        gbp_account_id = f"{user_email}_gbp"
        gbp_display_name = "Google Business Profile"
        try:
            existing_gbp = db.query(Account).filter(
                Account.organization_id == current_user.organization_id,
                Account.platform == "google",
                Account.account_type == "gbp",
                Account.account_id == gbp_account_id,
            ).first()
            if existing_gbp:
                existing_gbp.access_token = tokens.get("access_token")
                if tokens.get("refresh_token"):
                    existing_gbp.refresh_token = tokens.get("refresh_token")
                if tokens.get("expires_in"):
                    existing_gbp.token_expires_at = datetime.utcnow() + timedelta(
                        seconds=tokens["expires_in"]
                    )
                existing_gbp.account_name = gbp_display_name
                existing_gbp.user_email = current_user.email
                existing_gbp.is_active = True
                existing_gbp.deleted_at = None
                db.commit()
                db.refresh(existing_gbp)
                summary["gbp"].append({"id": existing_gbp.id, "action": "updated"})
                summary["messages"].append("✅ Business Profile (cuenta Monitor)")
            else:
                new_gbp = Account(
                    organization_id=current_user.organization_id,
                    platform="google",
                    account_type="gbp",
                    account_id=gbp_account_id,
                    account_name=gbp_display_name,
                    user_email=current_user.email,
                    access_token=tokens.get("access_token"),
                    refresh_token=tokens.get("refresh_token"),
                    is_active=True,
                )
                if tokens.get("expires_in"):
                    new_gbp.token_expires_at = datetime.utcnow() + timedelta(
                        seconds=tokens["expires_in"]
                    )
                db.add(new_gbp)
                db.commit()
                db.refresh(new_gbp)
                summary["gbp"].append({"id": new_gbp.id, "action": "created"})
                summary["messages"].append("✅ Business Profile (cuenta Monitor)")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo guardar cuenta GBP en OAuth 'all': {e}")
            summary["messages"].append(
                "⚠️ Business Profile: no se pudo guardar la fila en Monitor (revisa logs)"
            )

        delete_from_cache(oauth_cache_key)
        return success_response(
            data={
                "summary": summary,
                "ads_count": len(summary["ads"]),
                "analytics_count": len(summary["analytics"]),
                "search_console_count": len(summary["search_console"]),
                "gbp_count": len(summary["gbp"]),
            },
            message="; ".join(summary["messages"]) if summary["messages"] else "Google conectado",
            status_code=200,
            path=str(request.url.path),
        )

    # Para Meta Ads: Procesar todas las cuentas de Meta Ads disponibles
    if (callback_data.account_type == "ads" and 
        callback_data.platform.lower() == "meta"):
        
        logger.info(f"🔐 Procesando cuentas de Meta Ads")
        
        # Obtener cuentas de Meta Ads desde los tokens
        ads_accounts = tokens.get("ads_accounts", [])
        
        if not ads_accounts or len(ads_accounts) == 0:
            logger.warning(f"⚠️ No se encontraron cuentas de Meta Ads")
            return error_response(
                "No se encontraron cuentas de Meta Ads accesibles para este usuario.",
                400,
                "No accessible accounts found",
                str(request.url.path)
            )
        
        logger.info(f"🔐 {len(ads_accounts)} cuenta(s) de Meta Ads encontrada(s)")
        
        # Procesar cada cuenta de Meta Ads
        successful_accounts = []
        failed_accounts = []
        
        for account_info in ads_accounts:
            account_id = account_info.get("account_id")
            account_name = account_info.get("account_name")
            account_status = account_info.get("account_status")
            business_id = account_info.get("business_id")
            
            try:
                # Verificar si la cuenta ya existe
                existing_account = db.query(Account).filter(
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "meta",
                    Account.account_type == "ads",
                    Account.account_id == account_id
                ).first()
                
                if existing_account:
                    # Actualizar cuenta existente
                    existing_account.account_name = account_name
                    existing_account.access_token = tokens.get("access_token")
                    existing_account.is_active = True
                    existing_account.user_email = current_user.email
                    existing_account.deleted_at = None
                    
                    if tokens.get("expires_in"):
                        existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    
                    extra_data = {
                        "account_status": account_status,
                        "business_id": business_id
                    }
                    existing_account.extra_data = json.dumps(extra_data)
                    
                    db.commit()
                    db.refresh(existing_account)
                    
                    logger.info(f"✅ Cuenta actualizada: {account_name} ({account_id})")
                    successful_accounts.append({
                        "account_id": existing_account.id,
                        "customer_id": account_id,
                        "name": account_name,
                        "is_mcc": False,
                        "action": "updated"
                    })
                else:
                    # Crear nueva cuenta
                    extra_data = {
                        "account_status": account_status,
                        "business_id": business_id
                    }
                    
                    new_account = Account(
                        organization_id=current_user.organization_id,
                        platform="meta",
                        account_type="ads",
                        account_id=account_id,
                        account_name=account_name,
                        user_email=current_user.email,
                        access_token=tokens.get("access_token"),
                        refresh_token=None,  # Meta no proporciona refresh token
                        is_active=True,
                        extra_data=json.dumps(extra_data)
                    )
                    
                    if tokens.get("expires_in"):
                        new_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
                    
                    db.add(new_account)
                    db.commit()
                    db.refresh(new_account)
                    
                    logger.info(f"✅ Cuenta creada: {account_name} ({account_id})")
                    successful_accounts.append({
                        "account_id": new_account.id,
                        "customer_id": account_id,
                        "name": account_name,
                        "is_mcc": False,
                        "action": "created"
                    })
                    
            except Exception as e:
                logger.error(f"❌ Error al procesar cuenta {account_id}: {str(e)}")
                failed_accounts.append(account_id)
        
        # Preparar mensajes
        messages = []
        if successful_accounts:
            account_ids = [acc["customer_id"] for acc in successful_accounts]
            messages.append(f"✅ {len(successful_accounts)} cuenta(s) de Meta Ads configurada(s): {', '.join(account_ids)}")
        if failed_accounts:
            messages.append(f"❌ {len(failed_accounts)} cuenta(s) fallaron: {', '.join(failed_accounts)}")
        
        return success_response(
            data={
                "accounts": successful_accounts,
                "successful_count": len(successful_accounts),
                "failed_count": len(failed_accounts),
                "messages": messages,
                "account_id": successful_accounts[0]["account_id"] if successful_accounts else None
            },
            message="; ".join(messages) if messages else "Procesamiento completado",
            status_code=200,
            path=str(request.url.path)
        )
    
    # Para Google Ads: Procesar TODAS las cuentas accesibles automáticamente
    # Similar al comportamiento del código PHP
    if (callback_data.account_type == "ads" and 
        callback_data.platform.lower() == "google"):
        
        logger.info(f"🔐 Procesando cuentas accesibles de Google Ads")
        
        # Validar refresh_token (obligatorio para Ads)
        if not tokens.get("refresh_token"):
            return error_response(
                "No se obtuvo refresh_token de Google. Esto es requerido para Google Ads API.",
                400,
                "Refresh token required for Google Ads",
                str(request.url.path)
            )
        
        # Validar developer_token
        if not hasattr(config, 'developer_token') or not config.developer_token:
            return error_response(
                "No hay Developer Token configurado para Google Ads.",
                400,
                "Developer token required for Google Ads",
                str(request.url.path)
            )
        
        # Obtener lista de todas las cuentas accesibles
        accessible_customers = await get_google_ads_accessible_customers(
            tokens.get("access_token"),
            config,
            tokens.get("refresh_token")
        )
        
        if not accessible_customers or len(accessible_customers) == 0:
            logger.warning(f"⚠️ No se encontraron cuentas accesibles")
            return error_response(
                "No se encontraron cuentas de Google Ads accesibles para este usuario.",
                400,
                "No accessible accounts found",
                str(request.url.path)
            )
        
        logger.info(f"🔐 {len(accessible_customers)} cuenta(s) accesible(s) encontrada(s)")
        
        # Determinar si mostrar modal de selección
        if should_show_account_selection(accessible_customers, callback_data.selected_customer_ids):
            mcc_count = sum(1 for acc in accessible_customers if acc.get("is_mcc", False))
            subaccount_count = sum(1 for acc in accessible_customers if acc.get("is_subaccount", False))
            total_accounts = len(accessible_customers)
            logger.info(f"🔐 Mostrando modal: {total_accounts} cuenta(s) ({mcc_count} MCC, {subaccount_count} subcuenta(s))")
            
            # Guardar tokens en Redis para reutilizar cuando el usuario confirme la selección (TTL: 10 min)
            set_to_cache(oauth_cache_key, json.dumps(tokens), ttl=600)
            
            return success_response(
                data={
                    "requires_selection": True,
                    "available_accounts": [
                        {
                            "customer_id": acc.get("customer_id"),
                            "customer_id_raw": acc.get("customer_id_raw"),
                            "descriptive_name": acc.get("descriptive_name", f"Google Ads Account {acc.get('customer_id')}"),
                            "is_mcc": acc.get("is_mcc", False),
                            "is_subaccount": acc.get("is_subaccount", False),
                            "parent_customer_id": acc.get("parent_customer_id")
                        }
                        for acc in accessible_customers
                    ]
                },
                message=f"Se encontraron {len(accessible_customers)} cuenta(s). Selecciona las que deseas conectar (puedes seleccionar múltiples: MCC y/o subcuentas).",
                status_code=200,
                path=str(request.url.path)
            )
        
        # Procesar cuentas seleccionadas o todas si no hay selección
        successful_accounts = []
        inactive_accounts = []
        failed_accounts = []
        not_found_accounts = []
        
        selected_ids = set(callback_data.selected_customer_ids) if callback_data.selected_customer_ids else None
        
        for customer_info in accessible_customers:
            customer_id_formatted = customer_info.get("customer_id")
            
            # Filtrar por selección si hay cuentas seleccionadas
            if selected_ids:
                customer_id_clean = customer_id_formatted.replace("-", "")
                if customer_id_formatted not in selected_ids and customer_id_clean not in selected_ids:
                    continue
            
            # Procesar cuenta
            account_data, error_category = await process_google_ads_account(
                customer_info, tokens, config, current_user, db
            )
            
            if account_data:
                successful_accounts.append(account_data)
            elif error_category == "inactive":
                inactive_accounts.append(customer_id_formatted)
            elif error_category == "not_found":
                not_found_accounts.append(customer_id_formatted)
            else:
                failed_accounts.append(customer_id_formatted)
        
        # Limpiar tokens de Redis después de procesar
        delete_from_cache(oauth_cache_key)
        
        # Preparar mensajes contextuales
        messages = []
        if successful_accounts:
            customer_ids = [acc["customer_id"] for acc in successful_accounts]
            messages.append(f"✅ {len(successful_accounts)} cuenta(s) configurada(s): {', '.join(customer_ids)}")
        if inactive_accounts:
            messages.append(f"⚠️ {len(inactive_accounts)} cuenta(s) inactiva(s) o sin permisos: {', '.join(inactive_accounts)}")
        if not_found_accounts:
            messages.append(f"❌ {len(not_found_accounts)} cuenta(s) no encontrada(s): {', '.join(not_found_accounts)}")
        if failed_accounts:
            messages.append(f"❌ {len(failed_accounts)} cuenta(s) fallaron: {', '.join(failed_accounts)}")
        
        # Preparar respuesta
        accounts_data = [acc for acc in successful_accounts]
        
        return success_response(
            data={
                "accounts": accounts_data,
                "successful_count": len(successful_accounts),
                "inactive_count": len(inactive_accounts),
                "not_found_count": len(not_found_accounts),
                "failed_count": len(failed_accounts),
                "messages": messages,
                "account_id": successful_accounts[0]["account_id"] if successful_accounts else None
            },
            message="; ".join(messages) if messages else "Procesamiento completado",
            status_code=200,
            path=str(request.url.path)
        )
    
    # Para otras plataformas o tipos de cuenta, usar el flujo normal
    # Verificar si la cuenta ya existe (incluyendo eliminadas para poder restaurarlas)
    existing_account = db.query(Account).filter(
        Account.organization_id == current_user.organization_id,
        Account.platform == callback_data.platform.lower(),
        Account.account_type == callback_data.account_type,
        Account.account_id == (callback_data.account_id or tokens.get("account_id", ""))
    ).first()
    
    # Si existe pero está eliminada, restaurarla
    if existing_account and existing_account.deleted_at:
        existing_account.deleted_at = None
    
    if existing_account:
        # Actualizar tokens
        existing_account.access_token = tokens.get("access_token")
        # Solo actualizar refresh_token si se obtuvo uno nuevo
        # Si no hay refresh_token nuevo pero hay uno existente, mantener el existente
        new_refresh_token = tokens.get("refresh_token")
        if new_refresh_token:
            existing_account.refresh_token = new_refresh_token
        elif not existing_account.refresh_token:
            logger.warning(f"⚠️ No hay refresh_token - puede causar problemas para Google Ads")
        if tokens.get("expires_in"):
            existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
        if callback_data.account_name:
            existing_account.account_name = callback_data.account_name
        
        # Actualizar extra_data con información adicional (especialmente para Google Ads)
        if tokens.get("ads_info"):
            ads_info = tokens.get("ads_info")
            extra_data_dict = {}
            try:
                if existing_account.extra_data:
                    extra_data_dict = json.loads(existing_account.extra_data)
            except Exception:
                extra_data_dict = {}
            
            extra_data_dict.update({
                "is_mcc": ads_info.get("is_mcc", False),
                "customer_id": ads_info.get("customer_id"),
                "descriptive_name": ads_info.get("descriptive_name")
            })
            existing_account.extra_data = json.dumps(extra_data_dict)
        
        existing_account.is_active = True
        db.commit()
        db.refresh(existing_account)
        
        return success_response(
            data={
                "account_id": existing_account.id,
                "account_name": existing_account.account_name,
                "platform": existing_account.platform,
                "account_type": existing_account.account_type,
                "message": "Cuenta actualizada exitosamente"
            },
            message="Cuenta actualizada exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    
    # Crear nueva cuenta
    account_id_final = callback_data.account_id or tokens.get("account_id", "")
    account_name_final = callback_data.account_name or tokens.get("account_name")
    
    # VALIDACIONES ESTRICTAS ANTES DE CREAR LA CUENTA
    
    # 1. Validar que tenemos access_token
    if not tokens.get("access_token"):
        return error_response(
            "No se obtuvo access_token de Google. Por favor, intenta conectar la cuenta nuevamente.",
            400,
            "Access token required",
            str(request.url.path)
        )
    
    # 2. Validaciones específicas para Google Ads
    if callback_data.account_type == "ads" and callback_data.platform.lower() == "google":
        # Validar refresh_token (obligatorio para Ads)
        if not tokens.get("refresh_token"):
            return error_response(
                "No se obtuvo refresh_token de Google. Esto es requerido para Google Ads API. "
                "Por favor, asegúrate de autorizar la aplicación nuevamente con 'prompt=consent'. "
                "Si el problema persiste, revoca el acceso de la aplicación en tu cuenta de Google y autorízala nuevamente.",
                400,
                "Refresh token required for Google Ads",
                str(request.url.path)
            )
        
        # Validar developer_token
        if not hasattr(config, 'developer_token') or not config.developer_token:
            return error_response(
                "No hay Developer Token configurado para Google Ads. "
                "Por favor, configura el Developer Token en Settings > OAuth Config antes de conectar una cuenta de Google Ads.",
                400,
                "Developer token required for Google Ads",
                str(request.url.path)
            )
        
        # Validar que tenemos customer_id válido (no puede ser "unknown_ads")
        ads_info = tokens.get("ads_info")
        if ads_info and isinstance(ads_info, dict) and ads_info.get("customer_id"):
            account_id_final = ads_info.get("customer_id")
            logger.info(f"🔐 Usando customer_id de ads_info: {account_id_final}")
        elif account_id_final.startswith("unknown_"):
            return error_response(
                "No se pudo obtener el Customer ID de Google Ads. "
                "Asegúrate de que la cuenta tenga acceso a Google Ads y que los permisos estén correctamente configurados. "
                "Error: No se pudo obtener información de la cuenta de Google Ads.",
                400,
                "Invalid Google Ads customer ID",
                str(request.url.path)
            )
    
    # 3. Validar que para Search Console haya sitios configurados
    if callback_data.account_type == "search_console" and account_id_final.startswith("unknown_"):
        return error_response(
            "No se encontraron sitios en Google Search Console. "
            "Por favor, primero configura y verifica al menos un sitio en Google Search Console "
            "(https://search.google.com/search-console), y luego intenta conectar la cuenta nuevamente.",
            400,
            "No Search Console sites found",
            str(request.url.path)
        )
    
    # 4. Validar que para Analytics haya propiedades disponibles
    if callback_data.account_type == "analytics" and account_id_final.startswith("unknown_"):
        return error_response(
            "No se encontraron propiedades de Google Analytics o no tienes permisos para acceder. "
            "Asegúrate de que: "
            "1. La cuenta tenga acceso a Google Analytics GA4, "
            "2. Los scopes incluyan 'https://www.googleapis.com/auth/analytics.readonly', "
            "3. La cuenta tenga al menos una propiedad configurada.",
            400,
            "No Analytics properties found or insufficient permissions",
            str(request.url.path)
        )
    
    # 5. Validar account_id final no sea inválido
    if not account_id_final or account_id_final.startswith("unknown_"):
        return error_response(
            f"No se pudo obtener un ID válido para la cuenta de {callback_data.account_type}. "
            "Por favor, verifica que la cuenta tenga los permisos necesarios y que los scopes estén correctamente configurados.",
            400,
            "Invalid account ID",
            str(request.url.path)
        )
    
    # Preparar extra_data con información adicional (especialmente para Google Ads)
    extra_data_dict = {}
    if tokens.get("ads_info"):
        ads_info = tokens.get("ads_info")
        extra_data_dict.update({
            "is_mcc": ads_info.get("is_mcc", False),
            "customer_id": ads_info.get("customer_id"),
            "descriptive_name": ads_info.get("descriptive_name")
        })
    
    # Determinar si es MCC
    is_mcc = False
    if tokens.get("ads_info"):
        ads_info = tokens.get("ads_info")
        is_mcc = ads_info.get("is_mcc", False)
    
    # Crear cuenta principal (MCC o cuenta individual)
    new_account = Account(
        organization_id=current_user.organization_id,
        platform=callback_data.platform.lower(),
        account_type=callback_data.account_type,
        account_id=account_id_final,
        account_name=account_name_final,
        user_email=current_user.email,
        access_token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        is_active=True,
        extra_data=json.dumps(extra_data_dict) if extra_data_dict else None
    )
    
    if tokens.get("expires_in"):
        new_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
    
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    # Para otras plataformas (no Google Ads), retornar respuesta simple
    return created_response(
        data={
            "account_id": new_account.id,
            "account_name": new_account.account_name,
            "platform": new_account.platform,
            "account_type": new_account.account_type,
            "message": "Cuenta conectada exitosamente"
        },
        message="Cuenta conectada exitosamente",
        path=str(request.url.path)
    )


@router.get("/google/accounts-overview")
async def google_accounts_overview(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resumen de todas las cuentas de Google conectadas (Ads, Analytics, Search Console, etc.)
    para la organización del usuario actual.

    Esto NO hace un nuevo OAuth, solo lee lo que ya está guardado en la tabla Account.
    Sirve para que el frontend, con **una sola llamada**, sepa:
    - Qué tipos de cuenta de Google hay conectados
    - Qué cuentas concretas hay por tipo
    """
    try:
        from app.core.response import success_response

        accounts = (
            db.query(Account)
            .filter(
                Account.organization_id == current_user.organization_id,
                Account.platform == "google",
                Account.deleted_at.is_(None),
            )
            .all()
        )

        grouped = {
            "ads": [],
            "analytics": [],
            "search_console": [],
            "gbp": [],
            "other": [],
        }

        for acc in accounts:
            item = {
                "id": acc.id,
                "account_type": acc.account_type,
                "account_id": acc.account_id,
                "account_name": acc.account_name,
                "is_active": acc.is_active,
            }

            if acc.account_type in grouped:
                grouped[acc.account_type].append(item)
            else:
                grouped["other"].append(item)

        return success_response(
            data=grouped,
            message="Resumen de cuentas de Google obtenidas correctamente",
            status_code=200,
            path=str(request.url.path),
        )
    except Exception as e:
        from app.core.response import error_response

        return error_response(
            "Error al obtener el resumen de cuentas de Google",
            500,
            str(e),
            str(request.url.path),
        )


@router.get("/callback/linkedin")
async def linkedin_oauth_callback(
    code: str = Query(..., description="Authorization code de LinkedIn"),
    state: str = Query(..., description="State token para validar"),
    db: Session = Depends(get_db)
):
    """
    Callback público GET para LinkedIn OAuth
    LinkedIn redirige aquí después de que el usuario autoriza
    """
    try:
        logger.info(f"🔐 LinkedIn OAuth callback recibido - State: {state[:20]}...")
        
        # Recuperar información del usuario desde Redis usando el state
        oauth_state_key = f"oauth:state:{state}"
        state_data = get_from_cache(oauth_state_key)
        
        # Si no hay state en cache puede ser porque:
        # - Nunca existió (request inválido)
        # - O ya fue usado en un callback previo (reintento/idempotencia)
        if not state_data:
            logger.warning(f"⚠️ State token no encontrado en cache (posiblemente ya fue usado): {state[:20]}...")
            # Redirigir al frontend indicando state inválido/reutilizado
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback?error=invalid_state&state={state}",
                status_code=302
            )
        
        user_id = state_data.get("user_id")
        organization_id = state_data.get("organization_id")
        platform = state_data.get("platform", "linkedin")
        account_type = state_data.get("account_type", "ads")
        
        logger.info(f"🔐 Usuario recuperado - User ID: {user_id}, Org ID: {organization_id}")
        
        # Obtener configuración OAuth
        config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == organization_id,
            OAuthConfig.platform == platform,
            OAuthConfig.is_active == True
        ).first()
        
        if not config:
            logger.error(f"❌ No se encontró configuración OAuth para LinkedIn")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback?error=config_not_found&state={state}",
                status_code=302
            )
        
        # Intercambiar código por tokens usando funciones de LinkedIn
        from app.api.oauth.linkedin.functions import (
            exchange_linkedin_code_for_token,
            get_linkedin_user_info
        )
        
        from app.api.oauth.utils.redirect_uri import resolve_oauth_redirect_uri

        linkedin_redirect = resolve_oauth_redirect_uri(config, "linkedin")
        logger.info(f"🔐 Intercambiando código por tokens de LinkedIn...")
        token_response = await exchange_linkedin_code_for_token(
            client_id=config.client_id,
            client_secret=config.client_secret,
            code=code,
            redirect_uri=linkedin_redirect,
        )
        
        access_token = token_response.get("access_token")
        if not access_token:
            logger.error(f"❌ No se obtuvo access_token de LinkedIn")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback?error=token_exchange_failed&state={state}",
                status_code=302
            )
        
        # Obtener información del usuario
        logger.info(f"🔐 Obteniendo información del usuario de LinkedIn...")
        user_info = await get_linkedin_user_info(access_token)
        
        logger.info(f"🔐 User info recibido: {user_info}")
        
        # Determinar account_id y account_name
        # LinkedIn userinfo devuelve 'sub' (subject) para el ID del usuario
        # LinkedIn /me devuelve 'id' 
        account_id = user_info.get("sub") or user_info.get("id") or user_info.get("preferred_username") or ""
        account_name = user_info.get("name", "")
        if not account_name:
            account_name = (user_info.get("given_name", "") + " " + user_info.get("family_name", "")).strip()
        if not account_name:
            account_name = user_info.get("localizedFirstName", "") + " " + user_info.get("localizedLastName", "")
        if not account_name.strip():
            account_name = user_info.get("email", user_info.get("emailAddress", "LinkedIn Account"))
        
        # Si aún no hay account_id, usar el email como fallback
        if not account_id:
            account_id = user_info.get("email", user_info.get("emailAddress", ""))
        
        logger.info(f"🔐 Account ID determinado: {account_id}")
        logger.info(f"🔐 Account Name determinado: {account_name}")
        
        # Preparar tokens para guardar
        tokens = {
            "access_token": access_token,
            "refresh_token": None,  # LinkedIn no proporciona refresh token
            "expires_in": token_response.get("expires_in", 5184000),
            "token_type": token_response.get("token_type", "Bearer"),
            "account_id": account_id,
            "account_name": account_name
        }
        
        # Verificar si la cuenta ya existe (incluyendo eliminadas para poder restaurarlas)
        existing_account = db.query(Account).filter(
            Account.organization_id == organization_id,
            Account.platform == platform,
            Account.account_type == account_type,
            Account.account_id == account_id
        ).first()  # Buscar sin filtrar deleted_at para poder restaurar si está eliminada
        
        if existing_account:
            # Actualizar cuenta existente
            logger.info(f"🔐 Actualizando cuenta existente: {existing_account.id}")
            existing_account.access_token = access_token
            existing_account.refresh_token = None
            existing_account.account_name = account_name
            existing_account.is_active = True
            existing_account.deleted_at = None  # Restaurar si estaba eliminada (soft delete)
            if tokens.get("expires_in"):
                existing_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            db.commit()
            db.refresh(existing_account)
            
            account_id_db = existing_account.id
        else:
            # Crear nueva cuenta
            logger.info(f"🔐 Creando nueva cuenta de LinkedIn...")
            new_account = Account(
                organization_id=organization_id,
                platform=platform,
                account_type=account_type,
                account_id=account_id,
                account_name=account_name,
                access_token=access_token,
                refresh_token=None,
                is_active=True
            )
            if tokens.get("expires_in"):
                new_account.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            db.add(new_account)
            db.commit()
            db.refresh(new_account)
            account_id_db = new_account.id
        
        # Eliminar el state token del cache (ya fue usado)
        delete_from_cache(oauth_state_key)
        
        logger.info(f"✅ LinkedIn OAuth callback completado exitosamente")
        
        # Redirigir al frontend con éxito
        # NO incluir el código en la URL porque ya fue usado y procesado
        # El frontend solo necesita saber que fue exitoso
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback?state={state}&platform=linkedin&account_type={account_type}&success=true",
            status_code=302
        )
        
    except Exception as e:
        import traceback
        logger.error(f"❌ Error en callback de LinkedIn: {str(e)}\n{traceback.format_exc()}")
        # Redirigir al frontend con error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback?error={str(e)}&state={state if 'state' in locals() else ''}",
            status_code=302
        )
