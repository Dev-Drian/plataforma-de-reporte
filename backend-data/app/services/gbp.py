from typing import Dict, Optional, List
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging
import httpx

logger = logging.getLogger(__name__)


class GBPService:
    def __init__(self):
        self.service = None

    def _build_service(self, credentials_dict: Dict):
        """Construye el servicio de Google Business Profile con las credenciales"""
        try:
            creds = Credentials(
                token=credentials_dict.get('access_token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret')
            )
            
            # Si el token expiró, refrescarlo
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
            
            # Google Business Profile API v1
            self.service = build('mybusinessaccountmanagement', 'v1', credentials=creds)
            return True
        except Exception as e:
            logger.error(f"Error al construir el servicio de GBP: {str(e)}")
            raise Exception(f"Error al construir el servicio de GBP: {str(e)}")

    async def list_locations(self, credentials: Optional[Dict] = None) -> List[Dict]:
        """
        Lista todas las ubicaciones de Google Business Profile disponibles
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        try:
            # Usar la API de Google Business Profile
            # Primero obtener las cuentas
            access_token = credentials.get('access_token')
            
            # Si el token expiró, refrescarlo
            creds = Credentials(
                token=credentials.get('access_token'),
                refresh_token=credentials.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials.get('client_id'),
                client_secret=credentials.get('client_secret')
            )
            
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                access_token = creds.token
            
            # Obtener cuentas usando la API REST
            async with httpx.AsyncClient() as client:
                # Obtener cuentas
                accounts_response = await client.get(
                    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0
                )
                
                if accounts_response.status_code != 200:
                    logger.error(f"Error al obtener cuentas: {accounts_response.status_code} - {accounts_response.text}")
                    return []
                
                accounts_data = accounts_response.json()
                accounts = accounts_data.get('accounts', [])
                
                locations_list = []
                
                # Para cada cuenta, obtener ubicaciones
                for account in accounts:
                    account_name = account.get('name', '')
                    account_display_name = account.get('accountName', '')
                    
                    # Obtener ubicaciones de esta cuenta
                    locations_response = await client.get(
                        f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_name}/locations",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=10.0
                    )
                    
                    if locations_response.status_code == 200:
                        locations_data = locations_response.json()
                        locations = locations_data.get('locations', [])
                        
                        for location in locations:
                            location_name = location.get('name', '')
                            location_display_name = location.get('title', '')
                            location_id = location_name.split('/')[-1] if '/' in location_name else location_name
                            
                            locations_list.append({
                                "location_id": location_id,
                                "location_name": location_display_name,
                                "location_path": location_name,
                                "account_name": account_display_name,
                                "account_path": account_name,
                                "address": location.get('storefrontAddress', {}).get('addressLines', [])
                            })
                
                return locations_list
                
        except Exception as e:
            logger.error(f"Error al listar ubicaciones de GBP: {str(e)}")
            # Si falla, retornar lista vacía en lugar de lanzar error
            return []

    async def get_metrics(
        self, 
        start_date: str, 
        end_date: str, 
        location_id: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> Dict:
        """
        Obtener métricas de Google Business Profile
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        try:
            # Refrescar token si es necesario
            creds = Credentials(
                token=credentials.get('access_token'),
                refresh_token=credentials.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials.get('client_id'),
                client_secret=credentials.get('client_secret')
            )
            
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                access_token = creds.token
            else:
                access_token = credentials.get('access_token')
            
            async with httpx.AsyncClient() as client:
                # Si no hay location_id, obtener la primera ubicación disponible
                if not location_id:
                    locations = await self.list_locations(credentials)
                    if not locations:
                        return self._empty_metrics(start_date, end_date)
                    location_id = locations[0].get('location_id')
                
                # Construir el nombre completo de la ubicación
                location_name = f"locations/{location_id}"
                
                # Obtener métricas de insights
                # Nota: La API de Business Profile requiere el nombre completo de la cuenta
                # Por ahora, intentamos obtener métricas básicas
                
                # Obtener métricas de búsqueda y Maps
                metrics_response = await client.get(
                    f"https://mybusinessbusinessinformation.googleapis.com/v1/{location_name}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"readMask": "name,title,storefrontAddress"},
                    timeout=10.0
                )
                
                if metrics_response.status_code != 200:
                    logger.warning(f"No se pudieron obtener métricas detalladas: {metrics_response.status_code}")
                    return self._empty_metrics(start_date, end_date)
                
                # Intentar obtener insights (puede requerir permisos adicionales)
                # Por ahora retornamos estructura con valores por defecto
                # En producción, esto debería usar la API de Insights
                
                return {
                    "views_search": 0,
                    "views_maps": 0,
                    "total_views": 0,
                    "actions_website": 0,
                    "actions_directions": 0,
                    "actions_phone": 0,
                    "total_actions": 0,
                    "total_reviews": 0,
                    "average_rating": 0.0,
                    "new_reviews": 0,
                    "start_date": start_date,
                    "end_date": end_date,
                    "location_id": location_id
                }
                
        except Exception as e:
            logger.error(f"Error al obtener métricas de GBP: {str(e)}")
            return self._empty_metrics(start_date, end_date)
    
    def _empty_metrics(self, start_date: str, end_date: str) -> Dict:
        """Retorna estructura de métricas vacía"""
        return {
            "views_search": 0,
            "views_maps": 0,
            "total_views": 0,
            "actions_website": 0,
            "actions_directions": 0,
            "actions_phone": 0,
            "total_actions": 0,
            "total_reviews": 0,
            "average_rating": 0.0,
            "new_reviews": 0,
            "start_date": start_date,
            "end_date": end_date
        }
