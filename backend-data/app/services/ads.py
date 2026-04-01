"""
Servicio de Google Ads API - FIXED VERSION
Soporta detección de cuentas MCC (Manager) y cuentas cliente
"""
from typing import Dict, Optional, List
import json
import logging

logger = logging.getLogger(__name__)

# Importaciones opcionales de Google Ads (pueden fallar si no están instaladas)
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google.ads.googleads.client import GoogleAdsClient
    from google.ads.googleads.errors import GoogleAdsException
    GOOGLE_ADS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Google Ads libraries not available: {str(e)}")
    GOOGLE_ADS_AVAILABLE = False
    # Crear clases dummy para evitar errores de importación
    Credentials = None
    Request = None
    GoogleAdsClient = None
    GoogleAdsException = Exception


from app.services.search_console import OAuthExpiredError


class AdsService:
    def __init__(self):
        self.client = None
        self.login_customer_id = None

    def _build_client(self, credentials_dict: Dict, developer_token: Optional[str] = None, login_customer_id: Optional[str] = None):
        """
        Construye el cliente de Google Ads con las credenciales
        
        Args:
            credentials_dict: Diccionario con credenciales OAuth
            developer_token: Developer token de Google Ads (opcional, se puede obtener de credentials_dict)
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
                              Se usa cuando el usuario tiene acceso indirecto a través de una cuenta MCC
        """
        if not GOOGLE_ADS_AVAILABLE:
            raise Exception("Google Ads libraries are not installed. Please install google-ads package.")
        
        try:
            creds = Credentials(
                token=credentials_dict.get('access_token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret')
            )
            
            # Always attempt refresh: creds.expired is False when expiry is not set
            if creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as refresh_err:
                    error_str = str(refresh_err).lower()
                    if "invalid_grant" in error_str or "revoked" in error_str:
                        raise OAuthExpiredError(
                            "The Google Ads token has expired or was revoked. "
                            "Please reconnect your Google Ads account in Settings → Accounts."
                        )
                    raise
            
            # Configurar Google Ads Client
            # Si no hay developer_token en credenciales, intentar obtenerlo de la configuración
            if not developer_token:
                developer_token = credentials_dict.get('developer_token')
            
            if not developer_token:
                raise Exception("Developer Token es requerido para Google Ads API")
            
            config = {
                "developer_token": developer_token,
                "client_id": credentials_dict.get('client_id'),
                "client_secret": credentials_dict.get('client_secret'),
                "refresh_token": credentials_dict.get('refresh_token'),
                "use_proto_plus": True,
                "version": "v21"  # Especificar versión de API explícitamente (v17 fue descontinuada)
            }
            
            # Si se proporciona login_customer_id, agregarlo a la configuración
            # Esto permite acceso indirecto a cuentas a través de una cuenta MCC
            if login_customer_id:
                # Formatear login_customer_id (remover guiones si los tiene)
                login_customer_id_formatted = login_customer_id.replace('-', '')
                config["login_customer_id"] = login_customer_id_formatted
                self.login_customer_id = login_customer_id
                logger.info(f"Usando login-customer-id: {login_customer_id} para acceso indirecto")
            
            self.client = GoogleAdsClient.load_from_dict(config)
            return True
        except OAuthExpiredError:
            raise
        except Exception as e:
            raise Exception(f"Error al construir el cliente de Google Ads: {str(e)}")

    async def list_accessible_customers(self, credentials: Dict) -> List[str]:
        """
        Lista todos los customer IDs accesibles para las credenciales dadas
        FIXED: Usa el método correcto de la API
        
        Returns:
            Lista de customer IDs (strings con formato: '1234567890')
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        # Construir cliente SIN login_customer_id para este endpoint
        self._build_client(credentials, login_customer_id=None)
        
        try:
            # FIX: Usar CustomerServiceClient correctamente
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            customer_service = self.client.get_service("CustomerService", version="v21")
            
            # FIX: Llamar al método correcto sin parámetros
            # Este endpoint no requiere customer_id
            accessible_customers = customer_service.list_accessible_customers()
            
            # Extraer los customer IDs de los resource names
            # El formato es: customers/1234567890
            customer_ids = []
            for resource_name in accessible_customers.resource_names:
                # Extraer el ID del resource name
                customer_id = resource_name.split('/')[-1]
                customer_ids.append(customer_id)
            
            logger.info(f"✅ Cuentas accesibles encontradas: {len(customer_ids)}")
            return customer_ids
            
        except GoogleAdsException as ex:
            logger.error(f"❌ Error de Google Ads API al listar cuentas accesibles: {ex}")
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    logger.error(f"   Error: {error.message}")
            raise Exception(f"Error al listar cuentas accesibles: {str(ex)}")
        except Exception as e:
            logger.error(f"❌ Error al listar cuentas accesibles: {str(e)}")
            raise Exception(f"Error al listar cuentas accesibles: {str(e)}")

    async def get_customer_info_batch(
        self,
        customer_ids: List[str],
        credentials: Dict
    ) -> List[Dict]:
        """
        Obtiene información de múltiples cuentas en batch
        Útil para obtener detalles de todas las cuentas accesibles
        
        Args:
            customer_ids: Lista de customer IDs
            credentials: Credenciales OAuth
            
        Returns:
            Lista de diccionarios con información de cada cuenta
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_ids:
            return []
        
        results = []
        
        for customer_id in customer_ids:
            try:
                info = await self.get_account_info(
                    customer_id=customer_id,
                    credentials=credentials,
                    login_customer_id=None
                )
                results.append(info)
            except Exception as e:
                logger.warning(f"⚠️ No se pudo obtener info de cuenta {customer_id}: {str(e)}")
                # Agregar entrada básica con el error
                results.append({
                    "customer_id": customer_id,
                    "error": str(e),
                    "accessible": False
                })
        
        return results

    async def is_manager_account(
        self,
        customer_id: str,
        credentials: Optional[Dict] = None
    ) -> bool:
        """
        Verifica si una cuenta es MCC (Manager Account)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        # Formatear customer_id (remover guiones)
        customer_id_clean = customer_id.replace('-', '')
        
        self._build_client(credentials)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            # Query simple y directo para verificar si es manager account
            query = """
                SELECT
                    customer.id,
                    customer.manager,
                    customer.descriptive_name
                FROM customer
                LIMIT 1
            """
            
            logger.info(f"🔍 Verificando si cuenta {customer_id_clean} es MCC...")
            response = ga_service.search(customer_id=customer_id_clean, query=query)
            
            for row in response:
                # USAR DIRECTAMENTE el campo manager (fuente oficial de verdad)
                # True = Es MCC, False o no presente = No es MCC
                is_mcc = bool(row.customer.manager) if hasattr(row.customer, 'manager') else False
                logger.info(f"✅ Campo manager: {row.customer.manager if hasattr(row.customer, 'manager') else 'N/A'}, is_mcc={is_mcc}")
                return is_mcc
            
            # Si no se obtuvo respuesta, asumir que no es MCC
            logger.warning(f"⚠️ No se obtuvo respuesta de la query, asumiendo que no es MCC")
            return False
                
        except GoogleAdsException as ex:
            logger.error(f"❌ Error de Google Ads API al verificar MCC:")
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    logger.error(f"   {error.message}")
            # Si hay error de permisos, probablemente no es MCC
            return False
        except Exception as e:
            logger.error(f"❌ Error al verificar si es MCC: {str(e)}")
            return False

    async def list_customer_accounts(
        self,
        manager_customer_id: str,
        credentials: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Lista todas las cuentas cliente bajo un Manager Account (MCC)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        # Formatear customer_id (remover guiones)
        manager_customer_id_clean = manager_customer_id.replace('-', '')
        
        self._build_client(credentials)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            query = """
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
            
            response = ga_service.search(customer_id=manager_customer_id_clean, query=query)
            
            customers = []
            for row in response:
                customer_id = str(row.customer_client.id)
                customers.append({
                    "customer_id": customer_id,
                    "descriptive_name": row.customer_client.descriptive_name,
                    "currency_code": row.customer_client.currency_code,
                    "time_zone": row.customer_client.time_zone,
                    "is_manager": bool(row.customer_client.manager),
                    "status": row.customer_client.status.name
                })
            
            logger.info(f"✅ Encontradas {len(customers)} cuentas cliente bajo MCC {manager_customer_id_clean}")
            return customers
            
        except GoogleAdsException as ex:
            logger.error(f"❌ Error de Google Ads API al listar cuentas:")
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    logger.error(f"   {error.message}")
            raise Exception(f"Error al listar cuentas cliente: {str(ex)}")
        except Exception as e:
            raise Exception(f"Error al listar cuentas cliente: {str(e)}")

    async def get_account_info(
        self,
        customer_id: str,
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> Dict:
        """
        Obtiene información de una cuenta (Manager o cliente)
        
        Args:
            customer_id: ID de la cuenta (puede tener formato con guiones: 123-456-7890)
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta MCC para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        # Formatear customer_id (remover guiones para la query)
        customer_id_formatted = customer_id.replace('-', '')
        
        logger.info(f"🔐 get_account_info - customer_id: {customer_id_formatted}, login_customer_id: {login_customer_id}")
        
        self._build_client(credentials, login_customer_id=login_customer_id)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            query = """
                SELECT
                    customer.id,
                    customer.descriptive_name,
                    customer.currency_code,
                    customer.time_zone,
                    customer.manager
                FROM customer
            """
            
            # Usar customer_id formateado (sin guiones) para el search
            response = ga_service.search(customer_id=customer_id_formatted, query=query)
            
            for row in response:
                return {
                    "customer_id": str(row.customer.id),
                    "descriptive_name": row.customer.descriptive_name,
                    "currency_code": row.customer.currency_code,
                    "time_zone": row.customer.time_zone,
                    "is_manager": row.customer.manager if hasattr(row.customer, 'manager') else False
                }
            
            raise Exception("Cuenta no encontrada")
            
        except GoogleAdsException as ex:
            logger.error(f"❌ Error de Google Ads API:")
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    logger.error(f"   {error.message}")
            raise Exception(f"Error al obtener información de cuenta: {str(ex)}")
        except Exception as e:
            raise Exception(f"Error al obtener información de cuenta: {str(e)}")

    async def get_metrics(
        self,
        start_date: str,
        end_date: str,
        customer_id: Optional[str] = None,
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> Dict:
        """
        Obtener métricas agregadas de Google Ads
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            customer_id: ID de la cuenta de Google Ads de la cual obtener métricas
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
                              Se usa cuando el usuario tiene acceso indirecto a través de una cuenta MCC
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_id:
            raise ValueError("customer_id es requerido")
        
        # Formatear customer_id
        customer_id = customer_id.replace('-', '')
        
        self._build_client(credentials, login_customer_id=login_customer_id)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            # Query para obtener métricas agregadas por día y luego sumarlas
            query = f"""
                SELECT
                    segments.date,
                    metrics.clicks,
                    metrics.impressions,
                    metrics.cost_micros,
                    metrics.conversions,
                    metrics.ctr,
                    metrics.average_cpc
                FROM customer
                WHERE segments.date >= '{start_date}' AND segments.date <= '{end_date}'
                ORDER BY segments.date
            """
            
            response = ga_service.search(customer_id=customer_id, query=query)
            
            total_clicks = 0
            total_impressions = 0
            total_cost_micros = 0
            total_conversions = 0
            total_ctr_sum = 0.0
            total_cpc_sum = 0.0
            row_count = 0
            
            for row in response:
                total_clicks += row.metrics.clicks
                total_impressions += row.metrics.impressions
                total_cost_micros += row.metrics.cost_micros
                total_conversions += row.metrics.conversions
                total_ctr_sum += row.metrics.ctr
                total_cpc_sum += row.metrics.average_cpc
                row_count += 1
            
            cost = total_cost_micros / 1_000_000 if total_cost_micros > 0 else 0.0
            ctr = (total_ctr_sum / row_count * 100) if row_count > 0 else 0.0
            cpc = (total_cpc_sum / row_count / 1_000_000) if row_count > 0 else 0.0
            
            return {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "cost": round(cost, 2),
                "conversions": total_conversions,
                "cpc": round(cpc, 2),
                "ctr": round(ctr, 2),
                "roas": 0.0,
                "start_date": start_date,
                "end_date": end_date,
                "customer_id": customer_id
            }
            
        except GoogleAdsException as ex:
            logger.error(f"❌ Error de Google Ads API al obtener métricas:")
            error_message = str(ex)
            
            # Detectar error específico de cuenta MCC
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    logger.error(f"   {error.message}")
                    error_message = error.message
                    
                    # Verificar si es error de cuenta MCC
                    if hasattr(error, 'error_code') and hasattr(error.error_code, 'query_error'):
                        if str(error.error_code.query_error) == 'REQUESTED_METRICS_FOR_MANAGER':
                            raise Exception(
                                "Esta es una cuenta MCC (Manager). Las cuentas MCC no tienen métricas propias. "
                                "Por favor, selecciona una cuenta cliente específica desde el selector de cuentas, "
                                "o ve a Configuración → Cuentas para conectar las subcuentas del MCC."
                            )
            
            raise Exception(f"Error al obtener métricas: {error_message}")
        except Exception as e:
            logger.error(f"❌ Error al obtener métricas: {str(e)}")
            raise Exception(f"Error al obtener métricas: {str(e)}")

    async def get_consolidated_metrics(
        self,
        start_date: str,
        end_date: str,
        customer_ids: List[str],
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> Dict:
        """
        Obtener métricas consolidadas de múltiples cuentas de Google Ads
        Suma las métricas de todas las cuentas proporcionadas
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            customer_ids: Lista de IDs de cuentas de Google Ads
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_ids or len(customer_ids) == 0:
            raise ValueError("Se requiere al menos un customer_id")
        
        # Obtener métricas de cada cuenta
        all_metrics = []
        for customer_id in customer_ids:
            try:
                metrics = await self.get_metrics(
                    start_date,
                    end_date,
                    customer_id=customer_id,
                    credentials=credentials,
                    login_customer_id=login_customer_id
                )
                all_metrics.append(metrics)
            except Exception as e:
                logger.warning(f"⚠️ Error al obtener métricas de cuenta {customer_id}: {str(e)}")
                # Continuar con las demás cuentas
                continue
        
        if not all_metrics:
            raise Exception("No se pudieron obtener métricas de ninguna cuenta")
        
        # Consolidar métricas (sumar todos los valores)
        consolidated = {
            "clicks": sum(m.get("clicks", 0) for m in all_metrics),
            "impressions": sum(m.get("impressions", 0) for m in all_metrics),
            "cost": round(sum(m.get("cost", 0.0) for m in all_metrics), 2),
            "conversions": sum(m.get("conversions", 0) for m in all_metrics),
            "start_date": start_date,
            "end_date": end_date,
            "customer_ids": customer_ids,
            "accounts_count": len(all_metrics)
        }
        
        # Calcular promedios para CTR y CPC
        total_ctr_sum = sum(m.get("ctr", 0.0) for m in all_metrics)
        total_cpc_sum = sum(m.get("cpc", 0.0) for m in all_metrics)
        accounts_with_data = len([m for m in all_metrics if m.get("clicks", 0) > 0])
        
        consolidated["ctr"] = round(total_ctr_sum / accounts_with_data, 2) if accounts_with_data > 0 else 0.0
        consolidated["cpc"] = round(total_cpc_sum / accounts_with_data, 2) if accounts_with_data > 0 else 0.0
        
        # Calcular ROAS (si hay revenue en el futuro)
        consolidated["roas"] = 0.0
        
        # Agregar métricas por cuenta para referencia
        consolidated["by_account"] = all_metrics
        
        return consolidated

    async def get_campaigns(
        self,
        customer_id: Optional[str] = None,
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Obtener lista de campañas
        
        Args:
            customer_id: ID de la cuenta de Google Ads
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_id:
            raise ValueError("customer_id es requerido")
        
        self._build_client(credentials, login_customer_id=login_customer_id)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            query = """
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.advertising_channel_type,
                    campaign.start_date,
                    campaign.end_date,
                    metrics.clicks,
                    metrics.impressions,
                    metrics.cost_micros,
                    metrics.conversions
                FROM campaign
                ORDER BY campaign.id
                LIMIT 1000
            """
            
            response = ga_service.search(customer_id=customer_id, query=query)
            
            campaigns = []
            for row in response:
                campaigns.append({
                    "campaign_id": row.campaign.id,
                    "campaign_name": row.campaign.name,
                    "status": row.campaign.status.name,
                    "advertising_channel_type": row.campaign.advertising_channel_type.name,
                    "start_date": row.campaign.start_date,
                    "end_date": row.campaign.end_date if row.campaign.end_date else None,
                    "clicks": row.metrics.clicks,
                    "impressions": row.metrics.impressions,
                    "cost": row.metrics.cost_micros / 1_000_000,
                    "conversions": row.metrics.conversions
                })
            
            return campaigns
            
        except GoogleAdsException as e:
            logger.error(f"Error de Google Ads API: {str(e)}")
            raise Exception(f"Error al obtener campañas: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener campañas: {str(e)}")

    async def get_consolidated_campaigns(
        self,
        customer_ids: List[str],
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Obtener campañas consolidadas de múltiples cuentas de Google Ads
        Combina todas las campañas de las cuentas seleccionadas
        
        Args:
            customer_ids: Lista de IDs de cuentas de Google Ads
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_ids or len(customer_ids) == 0:
            raise ValueError("Se requiere al menos un customer_id")
        
        # Obtener campañas de cada cuenta
        all_campaigns = []
        campaigns_by_account = {}
        
        for customer_id in customer_ids:
            try:
                campaigns = await self.get_campaigns(
                    customer_id=customer_id,
                    credentials=credentials,
                    login_customer_id=login_customer_id
                )
                # Agregar customer_id a cada campaña para identificar de dónde viene
                for campaign in campaigns:
                    campaign["source_customer_id"] = customer_id
                all_campaigns.extend(campaigns)
                campaigns_by_account[customer_id] = campaigns
            except Exception as e:
                logger.warning(f"⚠️ Error al obtener campañas de cuenta {customer_id}: {str(e)}")
                continue
        
        if not all_campaigns:
            raise Exception("No se pudieron obtener campañas de ninguna cuenta")
        
        # Consolidar campañas por nombre (si hay campañas con el mismo nombre en diferentes cuentas)
        # Agrupar por campaign_name y sumar métricas
        campaigns_dict = {}
        for campaign in all_campaigns:
            campaign_name = campaign.get("campaign_name", "")
            campaign_key = f"{campaign_name}_{campaign.get('advertising_channel_type', '')}"
            
            if campaign_key in campaigns_dict:
                # Sumar métricas si la campaña ya existe
                existing = campaigns_dict[campaign_key]
                existing["clicks"] += campaign.get("clicks", 0)
                existing["impressions"] += campaign.get("impressions", 0)
                existing["cost"] += campaign.get("cost", 0.0)
                existing["conversions"] += campaign.get("conversions", 0)
                # Agregar customer_id a la lista de fuentes
                if "source_customer_ids" not in existing:
                    existing["source_customer_ids"] = [existing.get("source_customer_id", "")]
                existing["source_customer_ids"].append(campaign.get("source_customer_id", ""))
            else:
                # Nueva campaña
                campaign["source_customer_ids"] = [campaign.get("source_customer_id", "")]
                campaigns_dict[campaign_key] = campaign
        
        consolidated_campaigns = list(campaigns_dict.values())
        
        # Ordenar por clicks descendente
        consolidated_campaigns.sort(key=lambda x: x.get("clicks", 0), reverse=True)
        
        return consolidated_campaigns

    async def get_performance_trends(
        self,
        start_date: str,
        end_date: str,
        customer_id: Optional[str] = None,
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Obtener tendencias de rendimiento por fecha
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            customer_id: ID de la cuenta de Google Ads
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_id:
            raise ValueError("customer_id es requerido")
        
        self._build_client(credentials, login_customer_id=login_customer_id)
        
        try:
            # Especificar versión explícitamente (v17 fue descontinuada, usar v21+)
            ga_service = self.client.get_service("GoogleAdsService", version="v21")
            
            query = f"""
                SELECT
                    segments.date,
                    metrics.clicks,
                    metrics.impressions,
                    metrics.cost_micros,
                    metrics.conversions,
                    metrics.ctr,
                    metrics.average_cpc
                FROM customer
                WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
                ORDER BY segments.date
            """
            
            response = ga_service.search(customer_id=customer_id, query=query)
            
            trends = []
            for row in response:
                trends.append({
                    "date": row.segments.date,
                    "clicks": row.metrics.clicks,
                    "impressions": row.metrics.impressions,
                    "cost": row.metrics.cost_micros / 1_000_000,
                    "conversions": row.metrics.conversions,
                    "ctr": row.metrics.ctr * 100,
                    "cpc": row.metrics.average_cpc / 1_000_000
                })
            
            return trends
            
        except GoogleAdsException as ex:
            logger.error(f"Error de Google Ads API: {str(ex)}")
            error_message = str(ex)
            
            # Detectar error específico de cuenta MCC
            if hasattr(ex, 'failure') and hasattr(ex.failure, 'errors'):
                for error in ex.failure.errors:
                    error_message = error.message
                    
                    # Verificar si es error de cuenta MCC
                    if hasattr(error, 'error_code') and hasattr(error.error_code, 'query_error'):
                        if str(error.error_code.query_error) == 'REQUESTED_METRICS_FOR_MANAGER':
                            raise Exception(
                                "Esta es una cuenta MCC (Manager). Las cuentas MCC no tienen métricas propias. "
                                "Por favor, selecciona una cuenta cliente específica desde el selector de cuentas, "
                                "o ve a Configuración → Cuentas para conectar las subcuentas del MCC."
                            )
            
            raise Exception(f"Error al obtener tendencias: {error_message}")
        except Exception as e:
            raise Exception(f"Error al obtener tendencias: {str(e)}")

    async def get_consolidated_trends(
        self,
        start_date: str,
        end_date: str,
        customer_ids: List[str],
        credentials: Optional[Dict] = None,
        login_customer_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Obtener tendencias consolidadas de múltiples cuentas de Google Ads
        Consolida las tendencias por fecha sumando las métricas
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            customer_ids: Lista de IDs de cuentas de Google Ads
            credentials: Credenciales OAuth
            login_customer_id: ID de cuenta raíz para acceso indirecto (opcional)
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not customer_ids or len(customer_ids) == 0:
            raise ValueError("Se requiere al menos un customer_id")
        
        # Obtener tendencias de cada cuenta
        all_trends_by_date = {}
        
        for customer_id in customer_ids:
            try:
                trends = await self.get_performance_trends(
                    start_date,
                    end_date,
                    customer_id=customer_id,
                    credentials=credentials,
                    login_customer_id=login_customer_id
                )
                
                # Consolidar por fecha
                for trend in trends:
                    date = trend.get("date")
                    if date not in all_trends_by_date:
                        all_trends_by_date[date] = {
                            "date": date,
                            "clicks": 0,
                            "impressions": 0,
                            "cost": 0.0,
                            "conversions": 0,
                            "ctr": 0.0,
                            "cpc": 0.0
                        }
                    
                    all_trends_by_date[date]["clicks"] += trend.get("clicks", 0)
                    all_trends_by_date[date]["impressions"] += trend.get("impressions", 0)
                    all_trends_by_date[date]["cost"] += trend.get("cost", 0.0)
                    all_trends_by_date[date]["conversions"] += trend.get("conversions", 0)
                    
            except Exception as e:
                logger.warning(f"⚠️ Error al obtener tendencias de cuenta {customer_id}: {str(e)}")
                continue
        
        if not all_trends_by_date:
            raise Exception("No se pudieron obtener tendencias de ninguna cuenta")
        
        # Calcular CTR y CPC promedio para cada fecha
        consolidated_trends = []
        for date in sorted(all_trends_by_date.keys()):
            trend = all_trends_by_date[date]
            # Calcular CTR
            if trend["impressions"] > 0:
                trend["ctr"] = round((trend["clicks"] / trend["impressions"]) * 100, 2)
            # Calcular CPC
            if trend["clicks"] > 0:
                trend["cpc"] = round(trend["cost"] / trend["clicks"], 2)
            
            trend["cost"] = round(trend["cost"], 2)
            consolidated_trends.append(trend)
        
        return consolidated_trends
