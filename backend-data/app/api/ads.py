from fastapi import APIRouter, Query, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional
import json
from app.core.database import get_db
from app.core.auth_middleware import get_current_user
from app.core.response import success_response, error_response
from app.core.cache import get_from_cache, set_to_cache, cache_key
from app.core.auth_credentials import get_ads_credentials
from app.models import User, Account
from app.services.ads import AdsService
from app.services.meta_ads import MetaAdsService
from app.services.linkedin_ads import LinkedInAdsService
from app.services.tiktok_ads import TikTokAdsService
from app.services.search_console import OAuthExpiredError
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
google_ads_service = AdsService()
meta_ads_service = MetaAdsService()
linkedin_ads_service = LinkedInAdsService()
tiktok_ads_service = TikTokAdsService()


# ========== FUNCIONES HELPER ==========

def normalize_customer_id(customer_id: str) -> str:
    """
    Normaliza customer_id removiendo guiones para Google Ads API
    Google Ads API requiere formato sin guiones: 1234567890 (no 123-456-7890)
    """
    return customer_id.replace('-', '') if customer_id else customer_id


def get_customer_id_from_account(accountId: int, db: Session, current_user: User) -> tuple[Optional[str], Optional[str]]:
    """
    Obtiene customerId y loginCustomerId desde la base de datos
    Returns: (customerId, loginCustomerId)
    """
    try:
        account = db.query(Account).filter(
            Account.id == accountId,
            Account.organization_id == current_user.organization_id,
            Account.platform == "google",
            Account.account_type == "ads",
            Account.deleted_at.is_(None)
        ).first()
        
        if not account or not account.account_id:
            return (None, None)
        
        customerId = account.account_id
        loginCustomerId = None
        
        # Si es subcuenta, obtener loginCustomerId del padre
        if account.parent_account_id:
            parent_account = db.query(Account).filter(
                Account.id == account.parent_account_id,
                Account.organization_id == current_user.organization_id
            ).first()
            
            if parent_account:
                loginCustomerId = parent_account.account_id
                logger.info(f"🔐 Subcuenta detectada por parent_account_id, usando MCC padre: {loginCustomerId}")
        
        # Si no se encontró por parent_account_id, intentar desde extra_data
        if not loginCustomerId and account.extra_data:
            try:
                extra_data = json.loads(account.extra_data)
                parent_customer_id = extra_data.get("parent_customer_id")
                if parent_customer_id:
                    loginCustomerId = parent_customer_id
                    logger.info(f"🔐 Subcuenta detectada por extra_data, usando MCC padre: {loginCustomerId}")
            except Exception as e:
                logger.debug(f"No se pudo parsear extra_data: {str(e)}")
        
        return (customerId, loginCustomerId)
    except Exception as e:
        logger.warning(f"⚠️ Error al obtener customerId de cuenta: {str(e)}")
        return (None, None)


def detect_login_customer_id_for_subaccount(
    customerId: str,
    accountId: Optional[int],
    db: Session,
    current_user: User
) -> Optional[str]:
    """
    Detecta si un customerId es subcuenta y retorna el loginCustomerId del MCC padre
    Busca en parent_account_id, extra_data, y todas las cuentas MCC de la organización
    """
    if not accountId:
        return None
    
    try:
        account = db.query(Account).filter(
            Account.id == accountId,
            Account.organization_id == current_user.organization_id,
            Account.platform == "google",
            Account.account_type == "ads",
            Account.deleted_at.is_(None)
        ).first()
        
        if not account:
            return None
        
        customer_id_normalized = normalize_customer_id(customerId)
        
        # 1. Intentar desde parent_account_id de la cuenta
        if account.parent_account_id:
            parent_account = db.query(Account).filter(
                Account.id == account.parent_account_id,
                Account.organization_id == current_user.organization_id
            ).first()
            
            if parent_account and parent_account.account_id:
                login_customer_id = normalize_customer_id(parent_account.account_id)
                logger.info(f"🔐 loginCustomerId detectado desde parent_account_id: {login_customer_id}")
                return login_customer_id
        
        # 2. Intentar desde extra_data de la cuenta
        if account.extra_data:
            try:
                extra_data = json.loads(account.extra_data)
                parent_customer_id = extra_data.get("parent_customer_id")
                if parent_customer_id:
                    login_customer_id = normalize_customer_id(parent_customer_id)
                    logger.info(f"🔐 loginCustomerId detectado desde extra_data: {login_customer_id}")
                    return login_customer_id
            except Exception:
                pass
        
        # 3. Buscar en todas las cuentas MCC de la organización
        # Si el customerId no coincide con el account_id, puede ser una subcuenta
        account_id_normalized = normalize_customer_id(account.account_id) if account.account_id else None
        
        if customer_id_normalized != account_id_normalized or not account_id_normalized:
            # Buscar todas las cuentas MCC que puedan ser el padre
            all_accounts = db.query(Account).filter(
                Account.organization_id == current_user.organization_id,
                Account.platform == "google",
                Account.account_type == "ads",
                Account.deleted_at.is_(None)
            ).all()
            
            for acc in all_accounts:
                # Verificar si es MCC
                is_mcc = False
                if acc.extra_data:
                    try:
                        extra_data = json.loads(acc.extra_data)
                        is_mcc = extra_data.get("is_mcc", False)
                    except Exception:
                        pass
                
                # Si es MCC y tiene account_id, puede ser el padre
                if is_mcc and acc.account_id:
                    mcc_id_normalized = normalize_customer_id(acc.account_id)
                    # Si el customerId es diferente al MCC, el MCC puede ser el padre
                    if mcc_id_normalized != customer_id_normalized:
                        logger.info(f"🔐 MCC candidato encontrado: {mcc_id_normalized} para subcuenta {customer_id_normalized}")
                        return mcc_id_normalized
        
        return None
    except Exception as e:
        logger.warning(f"⚠️ Error al detectar loginCustomerId: {str(e)}")
        return None


@router.get("/account-info")
async def get_account_info(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    customerId: Optional[str] = Query(None, alias="customerId"),
    loginCustomerId: Optional[str] = Query(None, alias="loginCustomerId"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener información de cuenta de Google Ads (detecta si es MCC)"""
    if platform != "google":
        return error_response(
            message="Este endpoint solo está disponible para Google Ads",
            status_code=400,
            error="Platform not supported",
            path=str(request.url.path)
        )
    
    if not customerId:
        return error_response(
            message="customerId es requerido",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = get_ads_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Google Ads configurada",
            status_code=400,
            error="No Google Ads account configured",
            path=str(request.url.path)
        )
    
    # Si no se proporciona loginCustomerId, intentar detectarlo desde la base de datos
    if not loginCustomerId and accountId and customerId:
        detected_login = detect_login_customer_id_for_subaccount(customerId, accountId, db, current_user)
        if detected_login:
            loginCustomerId = detected_login
            logger.info(f"🔐 loginCustomerId detectado para account-info: {loginCustomerId}")
    
    try:
        # Normalizar customerId (remover guiones)
        customer_id_normalized = normalize_customer_id(customerId)
        login_customer_id_normalized = normalize_customer_id(loginCustomerId) if loginCustomerId else None
        
        logger.info(f"🔐 Llamando get_account_info con customerId: {customer_id_normalized}, loginCustomerId: {login_customer_id_normalized}")
        
        account_info = await google_ads_service.get_account_info(
            customer_id_normalized,
            credentials,
            login_customer_id=login_customer_id_normalized
        )
        
        # Verificar si es MCC (solo si no es subcuenta)
        is_mcc = False
        if not loginCustomerId:  # Si hay loginCustomerId, es subcuenta, no MCC
            try:
                is_mcc = await google_ads_service.is_manager_account(customer_id_normalized, credentials)
            except Exception as e:
                logger.warning(f"⚠️ Error al verificar si es MCC: {str(e)}")
        
        account_info['is_manager'] = is_mcc
        
        return success_response(
            data=account_info,
            message="Información de cuenta obtenida exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except Exception as e:
        error_msg = str(e)
        
        # Mejorar mensajes de error para PERMISSION_DENIED
        if "PERMISSION_DENIED" in error_msg or "USER_PERMISSION_DENIED" in error_msg:
            friendly_message = (
                "No tienes permisos para acceder a esta cuenta. "
                "Si es una subcuenta, asegúrate de que el MCC padre esté configurado correctamente."
            )
            logger.error(f"❌ Error de permisos al obtener información de cuenta: {error_msg[:200]}")
            return error_response(
                message=friendly_message,
                status_code=403,
                error="PERMISSION_DENIED",
                path=str(request.url.path)
            )
        
        logger.error(f"❌ Error al obtener información de cuenta: {error_msg[:200]}")
        return error_response(
            message="Error al obtener información de la cuenta. Por favor, verifica que la cuenta esté correctamente configurada.",
            status_code=500,
            error="Error al obtener información de cuenta",
            path=str(request.url.path)
        )


@router.get("/customers")
async def get_customer_accounts(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    managerCustomerId: Optional[str] = Query(None, alias="managerCustomerId"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar cuentas cliente bajo un Manager Account (MCC)"""
    if platform != "google":
        return error_response(
            message="Este endpoint solo está disponible para Google Ads",
            status_code=400,
            error="Platform not supported",
            path=str(request.url.path)
        )
    
    if not managerCustomerId:
        return error_response(
            message="managerCustomerId es requerido",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    credentials = get_ads_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform
    )
    
    if not credentials:
        return error_response(
            message="No hay cuenta de Google Ads configurada",
            status_code=400,
            error="No Google Ads account configured",
            path=str(request.url.path)
        )
    
    try:
        # Cache para lista de clientes (1 hora)
        cache_key_str = cache_key(
            "ads:customers",
            managerCustomerId,
            accountId=accountId
        )
        cached_customers = get_from_cache(cache_key_str)
        
        if cached_customers:
            return success_response(
                data=cached_customers,
                message="Cuentas cliente obtenidas exitosamente (cache)",
                status_code=200,
                path=str(request.url.path)
            )
        
        customers = await google_ads_service.list_customer_accounts(
            managerCustomerId,
            credentials
        )
        
        set_to_cache(cache_key_str, customers, ttl=3600)
        
        return success_response(
            data=customers,
            message="Cuentas cliente obtenidas exitosamente",
            status_code=200,
            path=str(request.url.path)
        )
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error al obtener cuentas cliente: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener cuentas cliente",
            path=str(request.url.path)
        )


@router.get("/metrics")
async def get_ads_metrics(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    customerId: Optional[str] = Query(None, alias="customerId"),
    customerIds: Optional[str] = Query(None, alias="customerIds"),  # Múltiples IDs separados por coma
    loginCustomerId: Optional[str] = Query(None, alias="loginCustomerId"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint consolidado para métricas de Ads (Google, Meta, LinkedIn, TikTok)
    
    Para Google Ads:
    - customerId: ID de la cuenta de la cual obtener estadísticas (una sola cuenta)
    - customerIds: IDs de múltiples cuentas separados por coma (ej: "123-456-7890,987-654-3210")
                   Si se proporciona, se consolidan las estadísticas de todas las cuentas
    - loginCustomerId: ID de cuenta raíz para acceso indirecto (opcional)
                       Se usa cuando el usuario tiene acceso indirecto a través de una cuenta MCC
    """
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    platform_name = platform or "google"
    
    credentials = get_ads_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform_name
    )
    
    if not credentials:
        return error_response(
            message=f"No hay cuenta de {platform_name} Ads configurada. Configúrala en Settings > Cuentas.",
            status_code=400,
            error=f"No {platform_name} Ads account configured",
            path=str(request.url.path)
        )
    
    # Detectar loginCustomerId si no se proporciona y hay accountId
    if not loginCustomerId and accountId:
        _, detected_loginCustomerId = get_customer_id_from_account(accountId, db, current_user)
        if detected_loginCustomerId:
            loginCustomerId = detected_loginCustomerId
            logger.info(f"🔐 loginCustomerId detectado automáticamente para metrics: {loginCustomerId}")
    
    try:
        if platform_name == "google":
            # Determinar si se usan múltiples cuentas o una sola
            if customerIds:
                # Múltiples cuentas: consolidar estadísticas
                customer_id_list = [cid.strip() for cid in customerIds.split(",") if cid.strip()]
                if not customer_id_list:
                    return error_response(
                        message="customerIds debe contener al menos un ID válido",
                        status_code=400,
                        error="Invalid customerIds",
                        path=str(request.url.path)
                    )
                
                # Cache para métricas consolidadas
                cache_key_str = cache_key(
                    "ads:metrics:consolidated",
                    startDate,
                    endDate,
                    accountId=accountId,
                    customerIds=customerIds,
                    loginCustomerId=loginCustomerId,
                    platform=platform_name
                )
                cached_metrics = get_from_cache(cache_key_str)
                
                if cached_metrics:
                    return success_response(
                        data=cached_metrics,
                        message="Métricas consolidadas obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                # Normalizar customerIds (remover guiones)
                customer_id_list_normalized = [normalize_customer_id(cid) for cid in customer_id_list]
                
                # Obtener métricas de todas las cuentas y consolidarlas
                consolidated_metrics = await google_ads_service.get_consolidated_metrics(
                    startDate,
                    endDate,
                    customer_ids=customer_id_list_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, consolidated_metrics, ttl=1800)
                
                return success_response(
                    data=consolidated_metrics,
                    message=f"Métricas consolidadas de {len(customer_id_list)} cuenta(s) obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            elif customerId:
                # Una sola cuenta (comportamiento original)
                # Si no hay loginCustomerId pero hay accountId, intentar detectarlo
                if not loginCustomerId and accountId:
                    _, detected_loginCustomerId = get_customer_id_from_account(accountId, db, current_user)
                    if detected_loginCustomerId:
                        loginCustomerId = detected_loginCustomerId
                        logger.info(f"🔐 loginCustomerId detectado para customerId {customerId}: {loginCustomerId}")
                
                # Normalizar customerId (remover guiones)
                customer_id_normalized = normalize_customer_id(customerId)
                
                cache_key_str = cache_key(
                    "ads:metrics",
                    startDate,
                    endDate,
                    accountId=accountId,
                    customerId=customerId,
                    loginCustomerId=loginCustomerId,
                    platform=platform_name
                )
                cached_metrics = get_from_cache(cache_key_str)
                
                if cached_metrics:
                    return success_response(
                        data=cached_metrics,
                        message="Métricas obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                metrics = await google_ads_service.get_metrics(
                    startDate,
                    endDate,
                    customer_id=customer_id_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, metrics, ttl=1800)
                
                return success_response(
                    data=metrics,
                    message="Métricas obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            else:
                # Si no hay customerId ni customerIds, intentar obtenerlo de la base de datos
                if accountId:
                    try:
                        account = db.query(Account).filter(
                            Account.id == accountId,
                            Account.organization_id == current_user.organization_id,
                            Account.platform == "google",
                            Account.account_type == "ads",
                            Account.deleted_at.is_(None)
                        ).first()
                        
                        if account and account.account_id:
                            # Usar el account_id de la cuenta como customerId
                            customerId = account.account_id
                            logger.info(f"🔐 Usando customerId de cuenta: {customerId}")
                            
                            # Si es subcuenta, obtener loginCustomerId del padre
                            if not loginCustomerId and account.parent_account_id:
                                parent_account = db.query(Account).filter(
                                    Account.id == account.parent_account_id,
                                    Account.organization_id == current_user.organization_id
                                ).first()
                                
                                if parent_account:
                                    loginCustomerId = parent_account.account_id
                                    logger.info(f"🔐 Subcuenta detectada, usando MCC padre: {loginCustomerId}")
                            
                            # Obtener métricas con el customerId detectado
                            cache_key_str = cache_key(
                                "ads:metrics",
                                startDate,
                                endDate,
                                accountId=accountId,
                                customerId=customerId,
                                loginCustomerId=loginCustomerId,
                                platform=platform_name
                            )
                            cached_metrics = get_from_cache(cache_key_str)
                            
                            if cached_metrics:
                                return success_response(
                                    data=cached_metrics,
                                    message="Métricas obtenidas exitosamente (cache)",
                                    status_code=200,
                                    path=str(request.url.path)
                                )
                            
                            # Normalizar customerId
                            customer_id_normalized = normalize_customer_id(customerId)
                            
                            metrics = await google_ads_service.get_metrics(
                                startDate,
                                endDate,
                                customer_id_normalized,
                                credentials,
                                login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                            )
                            
                            set_to_cache(cache_key_str, metrics, ttl=1800)
                            
                            return success_response(
                                data=metrics,
                                message="Métricas obtenidas exitosamente",
                                status_code=200,
                                path=str(request.url.path)
                            )
                    except Exception as e:
                        logger.warning(f"⚠️ Error al obtener customerId de cuenta: {str(e)}")
                
                # Error: se requiere customerId o customerIds
                return error_response(
                    message="customerId o customerIds es requerido para Google Ads. Si seleccionaste una cuenta, verifica que tenga un customerId configurado.",
                    status_code=400,
                    error="customerId o customerIds es requerido para Google Ads",
                    path=str(request.url.path)
                )
        elif platform_name == "meta":
            # Meta Ads: usar accountId directamente
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para Meta Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            # Obtener account_id de la base de datos si se proporciona accountId
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "meta",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de Meta Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            # Cache para Meta
            cache_key_str = cache_key(
                "ads:metrics:meta",
                startDate,
                endDate,
                accountId=accountId,
                customerId=account_id_to_use,
                platform=platform_name
            )
            cached_metrics = get_from_cache(cache_key_str)
            
            if cached_metrics:
                return success_response(
                    data=cached_metrics,
                    message="Métricas de Meta Ads obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            # Obtener múltiples cuentas si se proporciona customerIds
            account_ids_list = None
            if customerIds:
                account_ids_list = [aid.strip() for aid in customerIds.split(",") if aid.strip()]
            
            metrics = await meta_ads_service.get_metrics(
                startDate,
                endDate,
                account_id_to_use,
                credentials,
                account_ids=account_ids_list
            )
            
            set_to_cache(cache_key_str, metrics, ttl=1800)
            
            return success_response(
                data=metrics,
                message="Métricas de Meta Ads obtenidas exitosamente",
                status_code=200,
                path=str(request.url.path)
            )
        elif platform_name == "linkedin":
            # LinkedIn Ads: obtener métricas
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para LinkedIn Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "linkedin",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de LinkedIn Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            cache_key_str = cache_key(
                "ads:metrics:linkedin",
                startDate,
                endDate,
                accountId=accountId,
                customerId=account_id_to_use,
                platform=platform_name
            )
            cached_metrics = get_from_cache(cache_key_str)
            
            if cached_metrics:
                return success_response(
                    data=cached_metrics,
                    message="Métricas de LinkedIn Ads obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            metrics = await linkedin_ads_service.get_metrics(
                startDate,
                endDate,
                account_id=account_id_to_use,
                credentials=credentials
            )
            
            set_to_cache(cache_key_str, metrics, ttl=1800)
            
            return success_response(
                data=metrics,
                message="Métricas de LinkedIn Ads obtenidas exitosamente",
                status_code=200,
                path=str(request.url.path)
            )
        elif platform_name == "tiktok":
            metrics = await tiktok_ads_service.get_metrics(startDate, endDate, credentials=credentials)
            return success_response(
                data=metrics,
                message="Métricas obtenidas exitosamente",
                status_code=200,
                path=str(request.url.path)
            )
        else:
            return error_response(
                message=f"Plataforma {platform_name} no soportada",
                status_code=400,
                error="Platform not supported",
                path=str(request.url.path)
            )
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error al obtener métricas: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener métricas",
            path=str(request.url.path)
        )


@router.get("/campaigns")
async def get_campaigns(
    request: Request,
    accountId: Optional[int] = Query(None, alias="accountId"),
    customerId: Optional[str] = Query(None, alias="customerId"),
    customerIds: Optional[str] = Query(None, alias="customerIds"),  # Múltiples IDs separados por coma
    loginCustomerId: Optional[str] = Query(None, alias="loginCustomerId"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener lista de campañas
    
    Para Google Ads:
    - customerId: ID de la cuenta de la cual obtener campañas (una sola cuenta)
    - customerIds: IDs de múltiples cuentas separados por coma
                   Si se proporciona, se consolidan las campañas de todas las cuentas
    - loginCustomerId: ID de cuenta raíz para acceso indirecto (opcional)
    """
    platform_name = platform or "google"
    
    credentials = get_ads_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform_name
    )
    
    if not credentials:
        return error_response(
            message=f"No hay cuenta de {platform_name} Ads configurada",
            status_code=400,
            error=f"No {platform_name} Ads account configured",
            path=str(request.url.path)
        )
    
    try:
        if platform_name == "google":
            # Determinar si se usan múltiples cuentas o una sola
            if customerIds:
                # Múltiples cuentas: consolidar campañas
                customer_id_list = [cid.strip() for cid in customerIds.split(",") if cid.strip()]
                if not customer_id_list:
                    return error_response(
                        message="customerIds debe contener al menos un ID válido",
                        status_code=400,
                        error="Invalid customerIds",
                        path=str(request.url.path)
                    )
                
                # Cache para campañas consolidadas
                cache_key_str = cache_key(
                    "ads:campaigns:consolidated",
                    customerIds,
                    accountId=accountId,
                    loginCustomerId=loginCustomerId
                )
                cached_campaigns = get_from_cache(cache_key_str)
                
                if cached_campaigns:
                    return success_response(
                        data=cached_campaigns,
                        message="Campañas consolidadas obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                # Normalizar customerIds (remover guiones)
                customer_id_list_normalized = [normalize_customer_id(cid) for cid in customer_id_list]
                
                # Obtener campañas de todas las cuentas y consolidarlas
                consolidated_campaigns = await google_ads_service.get_consolidated_campaigns(
                    customer_ids=customer_id_list_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, consolidated_campaigns, ttl=3600)
                
                return success_response(
                    data=consolidated_campaigns,
                    message=f"Campañas consolidadas de {len(customer_id_list)} cuenta(s) obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            elif customerId:
                # Una sola cuenta (comportamiento original)
                cache_key_str = cache_key(
                    "ads:campaigns",
                    customerId,
                    accountId=accountId,
                    loginCustomerId=loginCustomerId
                )
                cached_campaigns = get_from_cache(cache_key_str)
                
                if cached_campaigns:
                    return success_response(
                        data=cached_campaigns,
                        message="Campañas obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                # Normalizar customerId (remover guiones)
                customer_id_normalized = normalize_customer_id(customerId)
                
                campaigns = await google_ads_service.get_campaigns(
                    customer_id=customer_id_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, campaigns, ttl=3600)
                
                return success_response(
                    data=campaigns,
                    message="Campañas obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            else:
                return error_response(
                    message="customerId o customerIds es requerido para Google Ads",
                    status_code=400,
                    error="Missing required parameters",
                    path=str(request.url.path)
                )
        elif platform_name == "meta":
            # Meta Ads: obtener campañas
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para Meta Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "meta",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de Meta Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            cache_key_str = cache_key(
                "ads:campaigns:meta",
                accountId=accountId,
                customerId=account_id_to_use,
                platform=platform_name
            )
            cached_campaigns = get_from_cache(cache_key_str)
            
            if cached_campaigns:
                return success_response(
                    data=cached_campaigns,
                    message="Campañas de Meta Ads obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            campaigns = await meta_ads_service.get_campaigns(
                account_id_to_use,
                credentials
            )
            
            set_to_cache(cache_key_str, campaigns, ttl=3600)
            
            return success_response(
                data=campaigns,
                message="Campañas de Meta Ads obtenidas exitosamente",
                status_code=200,
                path=str(request.url.path)
            )
        elif platform_name == "linkedin":
            # LinkedIn Ads: obtener campañas
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para LinkedIn Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "linkedin",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de LinkedIn Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            # LinkedIn Ads no tiene endpoint de campañas en la API actual
            # Retornar array vacío por ahora
            return success_response(
                data=[],
                message="Campañas de LinkedIn Ads (próximamente)",
                status_code=200,
                path=str(request.url.path)
            )
        else:
            return error_response(
                message=f"Plataforma {platform_name} no soportada para campañas",
                status_code=400,
                error="Platform not supported",
                path=str(request.url.path)
            )
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error al obtener campañas: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener campañas",
            path=str(request.url.path)
        )


@router.get("/trends")
async def get_ads_trends(
    request: Request,
    startDate: Optional[str] = Query(None, alias="startDate"),
    endDate: Optional[str] = Query(None, alias="endDate"),
    accountId: Optional[int] = Query(None, alias="accountId"),
    customerId: Optional[str] = Query(None, alias="customerId"),
    customerIds: Optional[str] = Query(None, alias="customerIds"),  # Múltiples IDs separados por coma
    loginCustomerId: Optional[str] = Query(None, alias="loginCustomerId"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener tendencias de rendimiento
    
    Para Google Ads:
    - customerId: ID de la cuenta de la cual obtener tendencias (requerido)
    - loginCustomerId: ID de cuenta raíz para acceso indirecto (opcional)
    """
    if not startDate or not endDate:
        return error_response(
            message="startDate and endDate are required",
            status_code=400,
            error="Missing required parameters",
            path=str(request.url.path)
        )
    
    platform_name = platform or "google"
    
    credentials = get_ads_credentials(
        db,
        current_user.organization_id,
        accountId,
        platform_name
    )
    
    if not credentials:
        return error_response(
            message=f"No hay cuenta de {platform_name} Ads configurada",
            status_code=400,
            error=f"No {platform_name} Ads account configured",
            path=str(request.url.path)
        )
    
    try:
        if platform_name == "google":
            # Determinar si se usan múltiples cuentas o una sola
            if customerIds:
                # Múltiples cuentas: consolidar tendencias
                customer_id_list = [cid.strip() for cid in customerIds.split(",") if cid.strip()]
                if not customer_id_list:
                    return error_response(
                        message="customerIds debe contener al menos un ID válido",
                        status_code=400,
                        error="Invalid customerIds",
                        path=str(request.url.path)
                    )
                
                # Cache para tendencias consolidadas
                cache_key_str = cache_key(
                    "ads:trends:consolidated",
                    startDate,
                    endDate,
                    customerIds,
                    accountId=accountId,
                    loginCustomerId=loginCustomerId
                )
                cached_trends = get_from_cache(cache_key_str)
                
                if cached_trends:
                    return success_response(
                        data=cached_trends,
                        message="Tendencias consolidadas obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                # Normalizar customerIds (remover guiones)
                customer_id_list_normalized = [normalize_customer_id(cid) for cid in customer_id_list]
                
                # Obtener tendencias de todas las cuentas y consolidarlas
                consolidated_trends = await google_ads_service.get_consolidated_trends(
                    startDate,
                    endDate,
                    customer_ids=customer_id_list_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, consolidated_trends, ttl=1800)
                
                return success_response(
                    data=consolidated_trends,
                    message=f"Tendencias consolidadas de {len(customer_id_list)} cuenta(s) obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            elif customerId:
                # Una sola cuenta (comportamiento original)
                # Si no hay loginCustomerId pero hay accountId, intentar detectarlo
                if not loginCustomerId and accountId:
                    _, detected_loginCustomerId = get_customer_id_from_account(accountId, db, current_user)
                    if detected_loginCustomerId:
                        loginCustomerId = detected_loginCustomerId
                        logger.info(f"🔐 loginCustomerId detectado para customerId {customerId}: {loginCustomerId}")
                
                # Normalizar customerId (remover guiones)
                customer_id_normalized = normalize_customer_id(customerId)
                
                cache_key_str = cache_key(
                    "ads:trends",
                    startDate,
                    endDate,
                    customerId,
                    accountId=accountId,
                    loginCustomerId=loginCustomerId
                )
                cached_trends = get_from_cache(cache_key_str)
                
                if cached_trends:
                    return success_response(
                        data=cached_trends,
                        message="Tendencias obtenidas exitosamente (cache)",
                        status_code=200,
                        path=str(request.url.path)
                    )
                
                trends = await google_ads_service.get_performance_trends(
                    startDate,
                    endDate,
                    customer_id=customer_id_normalized,
                    credentials=credentials,
                    login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                )
                
                set_to_cache(cache_key_str, trends, ttl=1800)
                
                return success_response(
                    data=trends,
                    message="Tendencias obtenidas exitosamente",
                    status_code=200,
                    path=str(request.url.path)
                )
            else:
                # Si no hay customerId ni customerIds, intentar obtenerlo de la base de datos
                if accountId:
                    customerId, detected_loginCustomerId = get_customer_id_from_account(accountId, db, current_user)
                    
                    if customerId:
                        loginCustomerId = loginCustomerId or detected_loginCustomerId
                        logger.info(f"🔐 Usando customerId de cuenta: {customerId}")
                        
                        # Normalizar customerId
                        customer_id_normalized = normalize_customer_id(customerId)
                        
                        cache_key_str = cache_key(
                            "ads:trends",
                            startDate,
                            endDate,
                            customerId,
                            accountId=accountId,
                            loginCustomerId=loginCustomerId
                        )
                        cached_trends = get_from_cache(cache_key_str)
                        
                        if cached_trends:
                            return success_response(
                                data=cached_trends,
                                message="Tendencias obtenidas exitosamente (cache)",
                                status_code=200,
                                path=str(request.url.path)
                            )
                        
                        trends = await google_ads_service.get_performance_trends(
                            startDate,
                            endDate,
                            customer_id=customer_id_normalized,
                            credentials=credentials,
                            login_customer_id=normalize_customer_id(loginCustomerId) if loginCustomerId else None
                        )
                        
                        set_to_cache(cache_key_str, trends, ttl=1800)
                        
                        return success_response(
                            data=trends,
                            message="Tendencias obtenidas exitosamente",
                            status_code=200,
                            path=str(request.url.path)
                        )
                
                return error_response(
                    message="customerId o customerIds es requerido para Google Ads. Si seleccionaste una cuenta, verifica que tenga un customerId configurado.",
                    status_code=400,
                    error="customerId o customerIds es requerido para Google Ads",
                    path=str(request.url.path)
                )
        elif platform_name == "meta":
            # Meta Ads: obtener tendencias
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para Meta Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "meta",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de Meta Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            cache_key_str = cache_key(
                "ads:trends:meta",
                startDate,
                endDate,
                accountId=accountId,
                customerId=account_id_to_use,
                platform=platform_name
            )
            cached_trends = get_from_cache(cache_key_str)
            
            if cached_trends:
                return success_response(
                    data=cached_trends,
                    message="Tendencias de Meta Ads obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            trends = await meta_ads_service.get_trends(
                startDate,
                endDate,
                account_id_to_use,
                credentials
            )
            
            set_to_cache(cache_key_str, trends, ttl=1800)
            
            return success_response(
                data=trends,
                message="Tendencias de Meta Ads obtenidas exitosamente",
                status_code=200,
                path=str(request.url.path)
            )
        elif platform_name == "linkedin":
            # LinkedIn Ads: obtener tendencias
            if not accountId and not customerId:
                return error_response(
                    message="accountId o customerId es requerido para LinkedIn Ads",
                    status_code=400,
                    error="accountId required",
                    path=str(request.url.path)
                )
            
            account_id_to_use = customerId
            if accountId and not account_id_to_use:
                account = db.query(Account).filter(
                    Account.id == accountId,
                    Account.organization_id == current_user.organization_id,
                    Account.platform == "linkedin",
                    Account.account_type == "ads",
                    Account.deleted_at.is_(None)
                ).first()
                
                if account:
                    account_id_to_use = account.account_id
            
            if not account_id_to_use:
                return error_response(
                    message="No se pudo determinar el account_id de LinkedIn Ads",
                    status_code=400,
                    error="Invalid account_id",
                    path=str(request.url.path)
                )
            
            cache_key_str = cache_key(
                "ads:trends:linkedin",
                startDate,
                endDate,
                accountId=accountId,
                customerId=account_id_to_use,
                platform=platform_name
            )
            cached_trends = get_from_cache(cache_key_str)
            
            if cached_trends:
                return success_response(
                    data=cached_trends,
                    message="Tendencias de LinkedIn Ads obtenidas exitosamente (cache)",
                    status_code=200,
                    path=str(request.url.path)
                )
            
            # LinkedIn Ads: usar get_metrics y formatear como trends
            # Por ahora retornar array vacío, se puede implementar después
            trends = []
            
            set_to_cache(cache_key_str, trends, ttl=1800)
            
            return success_response(
                data=trends,
                message="Tendencias de LinkedIn Ads (próximamente)",
                status_code=200,
                path=str(request.url.path)
            )
        else:
            return error_response(
                message=f"Plataforma {platform_name} no soportada para tendencias",
                status_code=400,
                error="Platform not supported",
                path=str(request.url.path)
            )
    except OAuthExpiredError as auth_err:
        return error_response(message=str(auth_err), status_code=401, error="oauth_expired", path=str(request.url.path))
    except Exception as e:
        logger.error(f"Error al obtener tendencias: {str(e)}")
        return error_response(
            message=str(e),
            status_code=500,
            error="Error al obtener tendencias",
            path=str(request.url.path)
        )


@router.get("/batch-summary")
async def get_ads_batch_summary(
    request: Request,
    startDate: str = Query(..., alias="startDate"),
    endDate: str = Query(..., alias="endDate"),
    accountIds: str = Query(..., alias="accountIds"),
    platform: Optional[str] = Query("google"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Batch endpoint: returns aggregated metrics + trends for multiple Ads accounts
    in a single HTTP call. Replaces N individual frontend requests.
    accountIds: comma-separated DB account IDs (e.g. "1,2,3,4,5")
    """
    platform_name = platform or "google"
    account_id_list = []
    try:
        account_id_list = [int(aid.strip()) for aid in accountIds.split(",") if aid.strip()]
    except ValueError:
        return error_response(
            message="accountIds must be comma-separated integers",
            status_code=400,
            error="Invalid accountIds",
            path=str(request.url.path)
        )

    if not account_id_list:
        return error_response(
            message="At least one accountId is required",
            status_code=400,
            error="Missing accountIds",
            path=str(request.url.path)
        )

    # Check cache for the full batch
    cache_key_str = cache_key(
        "ads:batch_summary",
        startDate,
        endDate,
        accountIds=accountIds,
        platform=platform_name
    )
    cached = get_from_cache(cache_key_str)
    if cached:
        return success_response(
            data=cached,
            message="Batch summary from cache",
            status_code=200,
            path=str(request.url.path)
        )

    all_metrics = []
    all_trends_by_date = {}
    errors = []
    oauth_expired_hit = False

    # Process a single account — returns (metrics_dict|None, trends_list|None)
    async def _process_account(acct_id: int):
        credentials = get_ads_credentials(db, current_user.organization_id, acct_id, platform_name)
        if not credentials:
            return None, None

        customer_id, login_customer_id = get_customer_id_from_account(acct_id, db, current_user)
        if not customer_id:
            return None, None

        cid = normalize_customer_id(customer_id)
        lcid = normalize_customer_id(login_customer_id) if login_customer_id else None

        svc = AdsService()

        # --- metrics ---
        m_cache_key = cache_key("ads:metrics", startDate, endDate, accountId=acct_id, customerId=customer_id, loginCustomerId=login_customer_id, platform=platform_name)
        m = get_from_cache(m_cache_key)
        if not m:
            try:
                m = await svc.get_metrics(startDate, endDate, customer_id=cid, credentials=credentials, login_customer_id=lcid)
                set_to_cache(m_cache_key, m, ttl=1800)
            except Exception as me:
                err_str = str(me).lower()
                if "mcc" in err_str or "manager" in err_str or "requested_metrics_for_manager" in err_str:
                    logger.info(f"Skipping MCC account {acct_id} in batch")
                    return None, None
                raise

        # --- trends ---
        t_cache_key = cache_key("ads:trends", startDate, endDate, accountId=acct_id, customerId=customer_id, loginCustomerId=login_customer_id, platform=platform_name)
        t = get_from_cache(t_cache_key)
        if not t:
            t = await svc.get_performance_trends(startDate, endDate, customer_id=cid, credentials=credentials, login_customer_id=lcid)
            set_to_cache(t_cache_key, t, ttl=1800)

        return m, t

    # Run accounts in parallel batches of 5
    BATCH_SIZE = 5
    for batch_start in range(0, len(account_id_list), BATCH_SIZE):
        batch_ids = account_id_list[batch_start:batch_start + BATCH_SIZE]
        tasks = [_process_account(aid) for aid in batch_ids]

        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception:
            results = []

        for idx, result in enumerate(results):
            acct_id = batch_ids[idx]
            if isinstance(result, OAuthExpiredError):
                oauth_expired_hit = True
                errors.append(f"Account {acct_id}: {str(result)}")
                break
            if isinstance(result, Exception):
                errors.append(f"Account {acct_id}: {str(result)}")
                continue
            if not isinstance(result, tuple):
                continue

            m, t = result
            if m:
                all_metrics.append(m)
            if t:
                for point in t:
                    d = point.get("date")
                    if d not in all_trends_by_date:
                        all_trends_by_date[d] = {"date": d, "clicks": 0, "impressions": 0, "cost": 0.0, "conversions": 0}
                    all_trends_by_date[d]["clicks"] += point.get("clicks", 0)
                    all_trends_by_date[d]["impressions"] += point.get("impressions", 0)
                    all_trends_by_date[d]["cost"] += point.get("cost", 0.0)
                    all_trends_by_date[d]["conversions"] += point.get("conversions", 0)

        if oauth_expired_hit:
            break

    if oauth_expired_hit:
        return error_response(
            message=errors[0] if errors else "OAuth token expired",
            status_code=401,
            error="oauth_expired",
            path=str(request.url.path)
        )

    # Aggregate metrics
    agg_metrics = None
    if all_metrics:
        total_clicks = sum(m.get("clicks", 0) for m in all_metrics)
        total_impressions = sum(m.get("impressions", 0) for m in all_metrics)
        total_cost = sum(m.get("cost", 0.0) for m in all_metrics)
        total_conversions = sum(m.get("conversions", 0) for m in all_metrics)
        agg_metrics = {
            "clicks": total_clicks,
            "impressions": total_impressions,
            "cost": round(total_cost, 2),
            "conversions": total_conversions,
            "ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
            "cpc": round((total_cost / total_clicks) if total_clicks > 0 else 0, 2),
            "roas": 0.0,
            "start_date": startDate,
            "end_date": endDate,
        }

    # Aggregate trends
    agg_trends = []
    for d in sorted(all_trends_by_date.keys()):
        pt = all_trends_by_date[d]
        pt["cost"] = round(pt["cost"], 2)
        pt["ctr"] = round((pt["clicks"] / pt["impressions"] * 100) if pt["impressions"] > 0 else 0, 2)
        pt["cpc"] = round((pt["cost"] / pt["clicks"]) if pt["clicks"] > 0 else 0, 2)
        agg_trends.append(pt)

    result = {
        "metrics": agg_metrics,
        "trends": agg_trends,
        "account_count": len(all_metrics),
        "errors": errors if errors else None,
    }

    if all_metrics:
        set_to_cache(cache_key_str, result, ttl=1800)

    return success_response(
        data=result,
        message=f"Batch summary for {len(all_metrics)} accounts",
        status_code=200,
        path=str(request.url.path)
    )
