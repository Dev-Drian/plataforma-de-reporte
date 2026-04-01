"""
Módulo centralizado para obtener credenciales OAuth de diferentes plataformas.

Este módulo proporciona funciones reutilizables para obtener credenciales
de autenticación OAuth para diferentes tipos de cuentas (ADS, GBP, etc.)
siguiendo buenas prácticas de desarrollo.

IMPORTANTE: Este módulo NO inicia sesión con Google. Solo obtiene las credenciales
ya guardadas en la base de datos. Para conectar una cuenta por primera vez,
el usuario debe usar el flujo OAuth (/oauth/init y /oauth/callback).
Los tokens se guardan automáticamente y se usan en todas las peticiones posteriores.
Si un token expira, los servicios (AdsService, SearchConsoleService, etc.) lo
refrescan automáticamente usando el refresh_token.
"""
from typing import Optional, Dict
from sqlalchemy.orm import Session
import json
import logging
from app.models import Account, OAuthConfig

logger = logging.getLogger(__name__)


def get_oauth_credentials(
    db: Session,
    organization_id: int,
    account_id: Optional[int] = None,
    platform: str = "google",
    account_type: str = "ads"
) -> Optional[Dict[str, any]]:
    """
    Obtiene credenciales OAuth para una cuenta específica.
    
    Esta función centraliza la lógica de obtención de credenciales OAuth,
    eliminando duplicación de código y siguiendo el principio DRY.
    
    NOTA IMPORTANTE: Esta función NO inicia sesión con Google. Solo obtiene
    las credenciales ya guardadas en la base de datos. Si no hay cuenta conectada,
    retorna None. Para conectar una cuenta, el usuario debe usar el flujo OAuth
    (/oauth/init y /oauth/callback) UNA SOLA VEZ. Después, los tokens se usan
    automáticamente y se refrescan cuando expiran.
    
    Args:
        db: Sesión de base de datos SQLAlchemy
        organization_id: ID de la organización
        account_id: ID opcional de la cuenta específica. Si no se proporciona,
                   se busca la primera cuenta activa del tipo especificado
        platform: Plataforma (default: "google")
        account_type: Tipo de cuenta ("ads", "gbp", "search_console", etc.)
                    (default: "ads")
    
    Returns:
        Dict con las credenciales OAuth o None si no se encuentra cuenta válida.
        El dict incluye:
        - access_token: Token de acceso OAuth (se refresca automáticamente si expira)
        - refresh_token: Token de refresco OAuth (usado para renovar access_token)
        - client_id: ID del cliente OAuth
        - client_secret: Secret del cliente OAuth
        - developer_token: Token de desarrollador (solo para Google Ads)
        - Cualquier otra credencial adicional del campo JSON
    
    Example:
        >>> credentials = get_oauth_credentials(
        ...     db=db,
        ...     organization_id=1,
        ...     account_id=5,
        ...     platform="google",
        ...     account_type="ads"
        ... )
        >>> if credentials:
        ...     print(f"Access token: {credentials['access_token']}")
        ... else:
        ...     print("No hay cuenta conectada. Usa /oauth/init para conectar.")
    """
    # Buscar cuenta específica o primera cuenta activa
    account = _find_account(
        db=db,
        organization_id=organization_id,
        account_id=account_id,
        platform=platform,
        account_type=account_type
    )
    
    if not account:
        logger.debug(
            f"No se encontró cuenta activa para organization_id={organization_id}, "
            f"platform={platform}, account_type={account_type}"
        )
        return None
    
    # Construir credenciales desde la cuenta
    credentials = _build_credentials_from_account(account)
    
    if not credentials.get('access_token'):
        logger.warning(
            f"Cuenta {account.id} no tiene access_token válido"
        )
        return None
    
    # Enriquecer con configuración OAuth de la organización
    _enrich_with_oauth_config(
        db=db,
        organization_id=organization_id,
        platform=platform,
        credentials=credentials
    )
    
    return credentials


def _find_account(
    db: Session,
    organization_id: int,
    account_id: Optional[int],
    platform: str,
    account_type: str
) -> Optional[Account]:
    """
    Busca una cuenta en la base de datos según los criterios especificados.
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
        account_id: ID opcional de cuenta específica
        platform: Plataforma de la cuenta
        account_type: Tipo de cuenta
    
    Returns:
        Account encontrada o None
    """
    query = db.query(Account).filter(
        Account.organization_id == organization_id,
        Account.platform == platform,
        Account.account_type == account_type,
        Account.is_active == True,
        Account.deleted_at.is_(None)  # Excluir cuentas eliminadas
    )
    
    if account_id:
        query = query.filter(Account.id == account_id)
    
    return query.first()


def _build_credentials_from_account(account: Account) -> Dict[str, any]:
    """
    Construye un diccionario de credenciales desde un objeto Account.
    
    Args:
        account: Objeto Account de la base de datos
    
    Returns:
        Dict con credenciales extraídas de la cuenta
    """
    credentials = {}
    
    # Tokens OAuth (prioridad: campos directos)
    if account.access_token:
        credentials['access_token'] = account.access_token
    if account.refresh_token:
        credentials['refresh_token'] = account.refresh_token
    
    # Credenciales adicionales del campo JSON
    if account.credentials:
        try:
            creds_json = json.loads(account.credentials)
            credentials.update(creds_json)
        except json.JSONDecodeError as e:
            logger.warning(
                f"Error al parsear JSON de credenciales para cuenta {account.id}: {str(e)}"
            )
    
    return credentials


def _enrich_with_oauth_config(
    db: Session,
    organization_id: int,
    platform: str,
    credentials: Dict[str, any]
) -> None:
    """
    Enriquece las credenciales con la configuración OAuth de la organización.
    
    Modifica el dict credentials in-place agregando client_id, client_secret
    y otros campos de configuración OAuth.
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
        platform: Plataforma
        credentials: Dict de credenciales a enriquecer (modificado in-place)
    """
    oauth_config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == organization_id,
        OAuthConfig.platform == platform,
        OAuthConfig.is_active == True
    ).first()
    
    if not oauth_config:
        logger.debug(
            f"No se encontró OAuthConfig activa para organization_id={organization_id}, "
            f"platform={platform}"
        )
        return
    
    # Agregar client_id y client_secret
    credentials['client_id'] = oauth_config.client_id
    credentials['client_secret'] = oauth_config.client_secret
    
    # Agregar developer_token si está disponible (requerido para Google Ads)
    if hasattr(oauth_config, 'developer_token') and oauth_config.developer_token:
        credentials['developer_token'] = oauth_config.developer_token


# Funciones de conveniencia para tipos específicos de cuenta

def get_ads_credentials(
    db: Session,
    organization_id: int,
    account_id: Optional[int] = None,
    platform: str = "google"
) -> Optional[Dict[str, any]]:
    """
    Obtiene credenciales OAuth para cuentas de ADS.
    
    Función de conveniencia específica para cuentas de publicidad.
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
        account_id: ID opcional de cuenta específica
        platform: Plataforma ("google", "meta", "linkedin", "tiktok")
    
    Returns:
        Dict con credenciales OAuth o None
    """
    return get_oauth_credentials(
        db=db,
        organization_id=organization_id,
        account_id=account_id,
        platform=platform,
        account_type="ads"
    )


def get_gbp_credentials(
    db: Session,
    organization_id: int,
    account_id: Optional[int] = None
) -> Optional[Dict[str, any]]:
    """
    Obtiene credenciales OAuth para cuentas de Google Business Profile (GBP).
    
    Función de conveniencia específica para cuentas de GBP.
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización
        account_id: ID opcional de cuenta específica
    
    Returns:
        Dict con credenciales OAuth o None
    """
    return get_oauth_credentials(
        db=db,
        organization_id=organization_id,
        account_id=account_id,
        platform="google",
        account_type="gbp"
    )

