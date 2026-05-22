"""
Funciones específicas de Google Ads para OAuth - VERSIÓN SIMPLIFICADA
Usando el patrón oficial de google-ads library
"""
from typing import Optional, List
import logging
from app.models import OAuthConfig

logger = logging.getLogger(__name__)


async def get_google_ads_accessible_customers(
    access_token: str, 
    config: OAuthConfig, 
    refresh_token: Optional[str] = None
) -> Optional[list]:
    """
    Obtiene TODAS las cuentas accesibles de Google Ads
    CORREGIDO: Usa el método correcto con request vacía
    """
    
    # Verificar que tenemos developer_token
    developer_token = None
    if hasattr(config, 'developer_token'):
        developer_token = config.developer_token
    
    if not developer_token:
        logger.warning(f"⚠️ Developer token no disponible en configuración OAuth")
        return None
    
    try:
        from google.ads.googleads.client import GoogleAdsClient
        try:
            from google.ads.googleads.errors import GoogleAdsException
        except ImportError:
            GoogleAdsException = Exception
        
        if not refresh_token:
            logger.error(f"❌ Refresh token es requerido para Google Ads API")
            raise ValueError("Refresh token es requerido para Google Ads API.")
        
        ads_config = {
            "developer_token": developer_token,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "refresh_token": refresh_token,
            "use_proto_plus": True
        }
        
        try:
            # IMPORTANTE: NO incluir login_customer_id para este endpoint
            # La versión de la API se determina automáticamente por la librería (google-ads 28.4.1 usa v21+)
            client = GoogleAdsClient.load_from_dict(ads_config)
            
            # Log de la versión de la API que está usando el cliente
            try:
                # Intentar obtener la versión de la API del cliente
                api_version = getattr(client, '_api_version', None)
                if api_version:
                    logger.info(f"✅ Cliente de Google Ads construido (API version: {api_version})")
                else:
                    # La versión se determina automáticamente por la librería
                    logger.info(f"✅ Cliente de Google Ads construido (versión automática por librería)")
            except:
                logger.info(f"✅ Cliente de Google Ads construido exitosamente")
        except GoogleAdsException as e:
            logger.error(f"❌ Error de Google Ads API al construir cliente: {str(e)}")
            raise ValueError(f"Error de Google Ads API: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error al construir cliente: {str(e)}")
            raise ValueError(f"Error al construir cliente: {str(e)}")
        
        try:
            # Usar el patrón oficial de google-ads library
            # ESPECIFICAR VERSIÓN EXPLÍCITAMENTE: v17 fue descontinuada, usar v21 o superior
            # El método get_service acepta el parámetro version (por defecto es 'v22')
            customer_service = client.get_service("CustomerService", version="v21")
            
            logger.info(f"🔍 Llamando a list_accessible_customers()...")
            
            # Llamar al método oficial (sin parámetros) - patrón del ejemplo oficial
            try:
                accessible_customers = customer_service.list_accessible_customers()
            except Exception as e:
                # Manejar error 501 MethodNotImplemented si ocurre
                if "501" in str(e) or "MethodNotImplemented" in str(type(e).__name__):
                    logger.warning(f"⚠️ Método no disponible en esta versión: {e}")
                    return []
                raise
            
            result_total: int = len(accessible_customers.resource_names)
            logger.info(f"✅ Total results: {result_total}")
            
            if result_total == 0:
                logger.warning(f"⚠️ No se encontraron cuentas accesibles")
                return []
            
            # Obtener información de TODAS las cuentas accesibles
            accounts_list = []
            resource_names: List[str] = accessible_customers.resource_names
            
            for resource_name in resource_names:
                customer_id_raw = resource_name.split("/")[-1]
                customer_id = customer_id_raw  # Sin guiones para API
                
                # Formatear con guiones para visualización: 123-456-7890
                if len(customer_id_raw) == 10:
                    customer_id_formatted = f"{customer_id_raw[0:3]}-{customer_id_raw[3:6]}-{customer_id_raw[6:10]}"
                else:
                    customer_id_formatted = customer_id_raw
                
                logger.info(f"🔍 Procesando cuenta: {customer_id_formatted}")
                
                # Obtener información de cada cuenta usando GoogleAdsService
                # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
                ga_service = client.get_service("GoogleAdsService", version="v21")
                query = """
                    SELECT
                        customer.id,
                        customer.descriptive_name,
                        customer.manager
                    FROM customer
                    LIMIT 1
                """
                
                try:
                    response = ga_service.search(customer_id=customer_id, query=query)
                    is_mcc = False
                    descriptive_name = None
                    
                    for row in response:
                        # USAR DIRECTAMENTE el campo manager (fuente oficial de verdad)
                        is_mcc = bool(row.customer.manager) if hasattr(row.customer, 'manager') else False
                        descriptive_name = row.customer.descriptive_name if hasattr(row.customer, 'descriptive_name') else None
                        break
                    
                    logger.info(f"   ✅ Cuenta: {customer_id_formatted}")
                    logger.info(f"   ✅ Es MCC: {is_mcc}")
                    logger.info(f"   ✅ Nombre: {descriptive_name}")
                    
                    accounts_list.append({
                        "customer_id": customer_id_formatted,
                        "customer_id_raw": customer_id,
                        "is_mcc": is_mcc,
                        "descriptive_name": descriptive_name or f"Google Ads Account {customer_id_formatted}"
                    })
                    
                    # Si es MCC, también listar las subcuentas (cuentas cliente)
                    if is_mcc:
                        logger.info(f"   🔍 Es MCC, listando subcuentas...")
                        try:
                            # Usar el mismo cliente para listar cuentas cliente
                            customer_client_query = """
                                SELECT
                                    customer_client.id,
                                    customer_client.descriptive_name,
                                    customer_client.currency_code,
                                    customer_client.time_zone,
                                    customer_client.manager,
                                    customer_client.status
                                FROM customer_client
                                WHERE customer_client.status = 'ENABLED'
                            """
                            
                            customer_client_response = ga_service.search(customer_id=customer_id, query=customer_client_query)
                            
                            subaccount_count = 0
                            for client_row in customer_client_response:
                                subaccount_id = str(client_row.customer_client.id)
                                # Formatear customer_id con guiones
                                if len(subaccount_id) == 10:
                                    subaccount_id_formatted = f"{subaccount_id[0:3]}-{subaccount_id[3:6]}-{subaccount_id[6:10]}"
                                else:
                                    subaccount_id_formatted = subaccount_id
                                
                                subaccount_name = client_row.customer_client.descriptive_name if hasattr(client_row.customer_client, 'descriptive_name') else f"Subcuenta {subaccount_id_formatted}"
                                
                                accounts_list.append({
                                    "customer_id": subaccount_id_formatted,
                                    "customer_id_raw": subaccount_id,
                                    "is_mcc": False,
                                    "is_subaccount": True,
                                    "parent_customer_id": customer_id_formatted,
                                    "descriptive_name": subaccount_name
                                })
                                subaccount_count += 1
                            
                            logger.info(f"   ✅ Encontradas {subaccount_count} subcuentas bajo MCC {customer_id_formatted}")
                        except GoogleAdsException as e:
                            logger.warning(f"⚠️ Error al listar subcuentas de MCC {customer_id_formatted}: {str(e)}")
                        except Exception as e:
                            logger.warning(f"⚠️ Error inesperado al listar subcuentas: {str(e)}")
                    
                except GoogleAdsException as e:
                    logger.warning(f"⚠️ Error al obtener info de cuenta {customer_id_formatted}: {str(e)}")
                    # Si falla obtener info, agregar igual con info básica
                    accounts_list.append({
                        "customer_id": customer_id_formatted,
                        "customer_id_raw": customer_id,
                        "is_mcc": False,
                        "descriptive_name": f"Google Ads Account {customer_id_formatted}"
                    })
            
            logger.info(f"✅ Total de cuentas procesadas: {len(accounts_list)}")
            return accounts_list
            
        except Exception as e:
            logger.error(f"❌ Error al procesar cuentas: {str(e)}")
            logger.exception(e)
            return []
        
    except ImportError as e:
        logger.error(f"❌ Error al importar librerías: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Error general: {str(e)}")
        logger.exception(e)
        return None


async def get_google_ads_customer_id(
    access_token: str, 
    config: OAuthConfig, 
    refresh_token: Optional[str] = None,
    selected_customer_id: Optional[str] = None
) -> Optional[dict]:
    """
    Obtiene el customer_id de Google Ads y valida si es MCC
    CORREGIDO: Usa el método correcto con request vacía
    """
    
    # Verificar que tenemos developer_token
    developer_token = None
    if hasattr(config, 'developer_token'):
        developer_token = config.developer_token
    
    if not developer_token:
        logger.warning(f"⚠️ Developer token no disponible en configuración OAuth")
        return None
    
    try:
        from google.ads.googleads.client import GoogleAdsClient
        try:
            from google.ads.googleads.errors import GoogleAdsException
        except ImportError:
            GoogleAdsException = Exception
        
        if not refresh_token:
            logger.error(f"❌ Refresh token es requerido para Google Ads API")
            raise ValueError("Refresh token es requerido para Google Ads API.")
        
        ads_config = {
            "developer_token": developer_token,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "refresh_token": refresh_token,
            "use_proto_plus": True
        }
        
        try:
            # IMPORTANTE: NO incluir login_customer_id para este endpoint
            # La versión de la API se determina automáticamente por la librería (google-ads 28.4.1 usa v21+)
            client = GoogleAdsClient.load_from_dict(ads_config)
            
            # Log de la versión de la API que está usando el cliente
            try:
                # Intentar obtener la versión de la API del cliente
                api_version = getattr(client, '_api_version', None)
                if api_version:
                    logger.info(f"✅ Cliente de Google Ads construido (API version: {api_version})")
                else:
                    # La versión se determina automáticamente por la librería
                    logger.info(f"✅ Cliente de Google Ads construido (versión automática por librería)")
            except:
                logger.info(f"✅ Cliente de Google Ads construido exitosamente")
        except GoogleAdsException as e:
            logger.error(f"❌ Error de Google Ads API: {str(e)}")
            raise ValueError(f"Error de Google Ads API: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error al construir cliente: {str(e)}")
            raise ValueError(f"Error al construir cliente: {str(e)}")
        
        try:
            # Usar el patrón oficial de google-ads library
            # ESPECIFICAR VERSIÓN EXPLÍCITAMENTE: v17 fue descontinuada, usar v21 o superior
            # El método get_service acepta el parámetro version (por defecto es 'v22')
            customer_service = client.get_service("CustomerService", version="v21")
            
            logger.info(f"🔍 Llamando a list_accessible_customers()...")
            
            # Llamar al método oficial (sin parámetros) - patrón del ejemplo oficial
            try:
                accessible_customers = customer_service.list_accessible_customers()
            except Exception as e:
                # Manejar error 501 MethodNotImplemented si ocurre
                if "501" in str(e) or "MethodNotImplemented" in str(type(e).__name__):
                    logger.warning(f"⚠️ Método no disponible en esta versión: {e}")
                    return None
                raise
            
            result_total: int = len(accessible_customers.resource_names)
            logger.info(f"✅ Total results: {result_total}")
            
            if result_total == 0:
                logger.warning(f"⚠️ No se encontraron cuentas accesibles")
                return None
            
            resource_names: List[str] = accessible_customers.resource_names
            
            # Si se proporcionó un customer_id seleccionado, usarlo
            # Si no, usar el primero (comportamiento legacy)
            if selected_customer_id:
                selected_customer_id_clean = selected_customer_id.replace('-', '')
                logger.info(f"🔍 Buscando cuenta seleccionada: {selected_customer_id}")
                
                # Buscar en las cuentas accesibles
                found = False
                for resource_name in resource_names:
                    customer_id_raw = resource_name.split("/")[-1]
                    if customer_id_raw == selected_customer_id_clean:
                        first_customer_resource = resource_name
                        found = True
                        logger.info(f"✅ Cuenta seleccionada encontrada")
                        break
                
                if not found:
                    logger.warning(f"⚠️ Customer ID seleccionado no encontrado, usando primera cuenta")
                    first_customer_resource = resource_names[0]
            else:
                logger.info(f"ℹ️ No se seleccionó cuenta específica, usando primera disponible")
                first_customer_resource = resource_names[0]
            
            # Extraer el ID del resource name (formato: "customers/1234567890")
            customer_id_raw = first_customer_resource.split("/")[-1]
            customer_id = customer_id_raw  # Sin guiones para API
            
            # Formatear con guiones: 123-456-7890
            if len(customer_id_raw) == 10:
                customer_id_formatted = f"{customer_id_raw[0:3]}-{customer_id_raw[3:6]}-{customer_id_raw[6:10]}"
            else:
                customer_id_formatted = customer_id_raw
            
            logger.info(f"🔍 Procesando cuenta: {customer_id_formatted}")
            
            # Obtener información detallada
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = client.get_service("GoogleAdsService", version="v21")
            
            query = """
                SELECT
                    customer.id,
                    customer.descriptive_name,
                    customer.manager
                FROM customer
                LIMIT 1
            """
            
            is_mcc = False
            descriptive_name = None
            
            try:
                logger.info(f"🔍 Obteniendo información de la cuenta...")
                response = ga_service.search(customer_id=customer_id, query=query)
                
                for row in response:
                    # USAR DIRECTAMENTE el campo manager (fuente oficial de verdad)
                    is_mcc = bool(row.customer.manager) if hasattr(row.customer, 'manager') else False
                    descriptive_name = row.customer.descriptive_name if hasattr(row.customer, 'descriptive_name') else None
                    break
                
                logger.info(f"✅ Cuenta: {customer_id_formatted}")
                logger.info(f"✅ Es MCC: {is_mcc}")
                logger.info(f"✅ Nombre: {descriptive_name}")
                
            except GoogleAdsException as e:
                logger.error(f"❌ Error al buscar información de cuenta: {str(e)}")
                # Retornar al menos el customer_id
                return {
                    "customer_id": customer_id_formatted,
                    "is_mcc": False,
                    "descriptive_name": None
                }
            
            result = {
                "customer_id": customer_id_formatted,
                "is_mcc": is_mcc,
                "descriptive_name": descriptive_name or f"Google Ads Account {customer_id_formatted}"
            }
            
            logger.info(f"✅ ========== Resultado Final ==========")
            logger.info(f"✅ Customer ID: {customer_id_formatted}")
            logger.info(f"✅ Es MCC: {is_mcc}")
            logger.info(f"✅ Nombre: {descriptive_name}")
            logger.info(f"✅ =====================================")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error al obtener información: {str(e)}")
            logger.exception(e)
            if 'customer_id_formatted' in locals():
                return {
                    "customer_id": customer_id_formatted,
                    "is_mcc": False,
                    "descriptive_name": None
                }
            return None
        
    except ImportError as e:
        logger.error(f"❌ Error al importar librerías: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Error general: {str(e)}")
        logger.exception(e)
        return None
