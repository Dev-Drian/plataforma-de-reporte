from typing import Dict, Optional, List
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class OAuthExpiredError(Exception):
    """Raised when a Google OAuth token is expired or revoked and needs re-authentication."""
    pass


class SearchConsoleService:
    def __init__(self):
        self.service = None

    def _build_service(self, credentials_dict: Dict):
        """Construye el servicio de Google Search Console con las credenciales"""
        try:
            creds = Credentials(
                token=credentials_dict.get('access_token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret')
            )
            
            # Always attempt refresh: creds.expired is False when expiry is not set,
            # so the old check (if creds.expired) never triggered.
            if creds.refresh_token:
                try:
                    creds.refresh(Request())
                except RefreshError as re:
                    error_str = str(re).lower()
                    if "invalid_grant" in error_str or "revoked" in error_str:
                        raise OAuthExpiredError(
                            "The Google Search Console token has expired or was revoked. "
                            "Please reconnect your Search Console account in Settings → Accounts."
                        )
                    raise
            
            self.service = build('searchconsole', 'v1', credentials=creds)
            return True
        except OAuthExpiredError:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "invalid_grant" in error_str or "revoked" in error_str:
                raise OAuthExpiredError(
                    "The Google Search Console token has expired or was revoked. "
                    "Please reconnect your Search Console account in Settings → Accounts."
                )
            raise Exception(f"Error building Search Console service: {str(e)}")

    async def get_metrics(
        self, 
        start_date: str, 
        end_date: str, 
        property_uri: Optional[str] = None, 
        credentials: Optional[Dict] = None
    ) -> Dict:
        """
        Obtener métricas agregadas de Google Search Console
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            # Intentar obtener la primera propiedad disponible
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['date'],
                'rowLimit': 10000
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            total_clicks = sum(row.get('clicks', 0) for row in rows)
            total_impressions = sum(row.get('impressions', 0) for row in rows)
            total_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
            avg_position = sum(row.get('position', 0) for row in rows) / len(rows) if rows else 0.0
            
            return {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "ctr": round(total_ctr, 2),
                "position": round(avg_position, 2),
                "start_date": start_date,
                "end_date": end_date,
                "property_uri": property_uri
            }
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener métricas: {str(e)}")

    async def get_top_queries(
        self, 
        start_date: str, 
        end_date: str, 
        property_uri: Optional[str] = None,
        credentials: Optional[Dict] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Obtener top queries de Search Console
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['query'],
                'rowLimit': min(limit, 1000),
                'orderBys': [{'dimension': 'clicks', 'sortOrder': 'DESCENDING'}]
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            return [
                {
                    "query": row.get('keys', [''])[0],
                    "clicks": row.get('clicks', 0),
                    "impressions": row.get('impressions', 0),
                    "ctr": round(row.get('ctr', 0) * 100, 2),
                    "position": round(row.get('position', 0), 2)
                }
                for row in rows
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener queries: {str(e)}")

    async def get_top_pages(
        self,
        start_date: str,
        end_date: str,
        property_uri: Optional[str] = None,
        credentials: Optional[Dict] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Obtener top páginas de Search Console
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['page'],
                'rowLimit': min(limit, 1000),
                'orderBys': [{'dimension': 'clicks', 'sortOrder': 'DESCENDING'}]
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            return [
                {
                    "page": row.get('keys', [''])[0],
                    "clicks": row.get('clicks', 0),
                    "impressions": row.get('impressions', 0),
                    "ctr": round(row.get('ctr', 0) * 100, 2),
                    "position": round(row.get('position', 0), 2)
                }
                for row in rows
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener páginas: {str(e)}")

    async def get_performance_trends(
        self,
        start_date: str,
        end_date: str,
        property_uri: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Obtener tendencias de rendimiento por fecha
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['date'],
                'rowLimit': 10000
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            return [
                {
                    "date": row.get('keys', [''])[0],
                    "clicks": row.get('clicks', 0),
                    "impressions": row.get('impressions', 0),
                    "ctr": round(row.get('ctr', 0) * 100, 2),
                    "position": round(row.get('position', 0), 2)
                }
                for row in sorted(rows, key=lambda x: x.get('keys', [''])[0])
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener tendencias: {str(e)}")

    async def get_device_breakdown(
        self,
        start_date: str,
        end_date: str,
        property_uri: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Obtener desglose por dispositivo
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['device'],
                'rowLimit': 10
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            device_mapping = {
                'DESKTOP': 'Desktop',
                'MOBILE': 'Mobile',
                'TABLET': 'Tablet'
            }
            
            return [
                {
                    "device": device_mapping.get(row.get('keys', [''])[0], row.get('keys', [''])[0]),
                    "clicks": row.get('clicks', 0),
                    "impressions": row.get('impressions', 0),
                    "ctr": round(row.get('ctr', 0) * 100, 2),
                    "position": round(row.get('position', 0), 2)
                }
                for row in rows
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener desglose por dispositivo: {str(e)}")

    async def get_country_breakdown(
        self,
        start_date: str,
        end_date: str,
        property_uri: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Obtener desglose por país
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        if not property_uri:
            properties = await self.list_properties(credentials)
            if not properties:
                raise ValueError("No se encontraron propiedades de Search Console")
            property_uri = properties[0].get('property_uri', properties[0].get('siteUrl'))
        
        self._build_service(credentials)
        
        try:
            request = {
                'startDate': start_date,
                'endDate': end_date,
                'dimensions': ['country'],
                'rowLimit': 20,
                'orderBys': [{'dimension': 'clicks', 'sortOrder': 'DESCENDING'}]
            }
            
            response = self.service.searchanalytics().query(
                siteUrl=property_uri,
                body=request
            ).execute()
            
            rows = response.get('rows', [])
            
            return [
                {
                    "country": row.get('keys', [''])[0],
                    "clicks": row.get('clicks', 0),
                    "impressions": row.get('impressions', 0),
                    "ctr": round(row.get('ctr', 0) * 100, 2),
                    "position": round(row.get('position', 0), 2)
                }
                for row in rows
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al obtener desglose por país: {str(e)}")

    async def list_properties(self, credentials: Optional[Dict] = None) -> List[Dict]:
        """
        Listar todas las propiedades disponibles en Search Console
        """
        if not credentials:
            raise ValueError("Las credenciales son requeridas")
        
        self._build_service(credentials)
        
        try:
            sites = self.service.sites().list().execute()
            site_entries = sites.get('siteEntry', [])
            
            return [
                {
                    "property_uri": site.get('siteUrl'),
                    "permission_level": site.get('permissionLevel')
                }
                for site in site_entries
            ]
        except HttpError as e:
            raise Exception(f"Error de la API de Search Console: {str(e)}")
        except Exception as e:
            raise Exception(f"Error al listar propiedades: {str(e)}")

