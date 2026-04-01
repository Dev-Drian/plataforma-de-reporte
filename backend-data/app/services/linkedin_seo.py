"""
Servicio de LinkedIn SEO API
Proporciona funciones para obtener métricas de búsqueda interna y keywords
"""
from typing import Dict, Optional, List
import httpx
import logging

logger = logging.getLogger(__name__)


class LinkedInSEOService:
    """
    Servicio para integración con LinkedIn API para métricas SEO
    (búsqueda interna, keywords, search appearances)
    """
    
    BASE_URL = "https://api.linkedin.com/v2"
    
    def __init__(self, access_token: Optional[str] = None):
        """
        Inicializa el servicio de LinkedIn SEO
        
        Args:
            access_token: Token de acceso OAuth 2.0 de LinkedIn
        """
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}" if access_token else "",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def _get_access_token(self, credentials: Dict) -> str:
        """Extrae el access token de las credenciales"""
        access_token = credentials.get("access_token")
        if not access_token:
            raise ValueError("Access token no encontrado en credenciales")
        return access_token

    async def get_metrics(
        self, 
        start_date: str, 
        end_date: str, 
        organization_id: Optional[str] = None, 
        credentials: Optional[Dict] = None
    ) -> Dict:
        """
        Obtener métricas SEO de LinkedIn (búsqueda interna, keywords)
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            organization_id: ID de la organización/página de LinkedIn
            credentials: Diccionario con access_token si no fue proporcionado en init
        
        Returns:
            Diccionario con métricas SEO agregadas
        """
        try:
            if credentials and "access_token" in credentials:
                self.access_token = credentials["access_token"]
                self.headers["Authorization"] = f"Bearer {self.access_token}"
            
            if not self.access_token:
                logger.error("No access token provided for LinkedIn SEO API")
                raise Exception("Access token required for LinkedIn SEO API")
            
            logger.info(f"🔍 Obteniendo métricas SEO de LinkedIn para organización: {organization_id}")
            
            # LinkedIn Page Statistics API
            # https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/organizations/page-statistics
            
            async with httpx.AsyncClient() as client:
                # Obtener estadísticas de la página/organización
                # Nota: LinkedIn no tiene un endpoint directo para métricas de búsqueda
                # Usamos Page Statistics como proxy
                
                if organization_id:
                    # Si organization_id viene con formato URN, usarlo directamente
                    if organization_id.startswith("urn:li:organization:"):
                        org_urn = organization_id
                    else:
                        org_urn = f"urn:li:organization:{organization_id}"
                    
                    # Obtener estadísticas de la página
                    stats_url = f"{self.BASE_URL}/organizationPageStatistics"
                    
                    params = {
                        "q": "organization",
                        "organization": org_urn,
                        "timeGranularity": "DAY",
                        "startTime": int(start_date.replace("-", "")),
                        "endTime": int(end_date.replace("-", ""))
                    }
                    
                    response = await client.get(
                        stats_url,
                        params=params,
                        headers=self.headers,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Procesar métricas de búsqueda
                        # LinkedIn proporciona métricas como:
                        # - pageViews (vistas de página)
                        # - uniqueVisitors (visitantes únicos)
                        # - clicks (clics)
                        
                        total_impressions = 0
                        total_clicks = 0
                        total_page_views = 0
                        
                        elements = data.get("elements", [])
                        for element in elements:
                            # LinkedIn devuelve métricas en formato específico
                            time_range = element.get("timeRange", {})
                            metrics = element.get("metrics", {})
                            
                            total_page_views += int(metrics.get("pageViews", {}).get("value", 0))
                            total_impressions += int(metrics.get("uniqueVisitors", {}).get("value", 0))
                            total_clicks += int(metrics.get("clicks", {}).get("value", 0))
                        
                        # Calcular CTR
                        ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
                        
                        return {
                            "clicks": total_clicks,
                            "impressions": total_impressions,
                            "ctr": round(ctr, 2),
                            "position": 0.0,  # LinkedIn no tiene posición como Google
                            "page_views": total_page_views,
                            "search_impressions": total_impressions,  # Aproximación
                            "start_date": start_date,
                            "end_date": end_date,
                            "property_uri": organization_id
                        }
                    else:
                        logger.warning(f"LinkedIn API returned {response.status_code}: {response.text}")
                        # Retornar estructura vacía si falla
                        return {
                            "clicks": 0,
                            "impressions": 0,
                            "ctr": 0.0,
                            "position": 0.0,
                            "page_views": 0,
                            "search_impressions": 0,
                            "start_date": start_date,
                            "end_date": end_date,
                            "property_uri": organization_id or ""
                        }
                else:
                    # Sin organization_id, retornar estructura vacía
                    return {
                        "clicks": 0,
                        "impressions": 0,
                        "ctr": 0.0,
                        "position": 0.0,
                        "page_views": 0,
                        "search_impressions": 0,
                        "start_date": start_date,
                        "end_date": end_date,
                        "property_uri": ""
                    }
                
        except Exception as e:
            logger.error(f"Error fetching LinkedIn SEO metrics: {str(e)}")
            return {
                "clicks": 0,
                "impressions": 0,
                "ctr": 0.0,
                "position": 0.0,
                "page_views": 0,
                "search_impressions": 0,
                "start_date": start_date,
                "end_date": end_date,
                "property_uri": organization_id or "",
                "error": str(e)
            }

    async def get_queries(
        self,
        start_date: str,
        end_date: str,
        organization_id: Optional[str] = None,
        credentials: Optional[Dict] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Obtiene top keywords que traen tráfico a la página/perfil
        
        Args:
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)
            organization_id: ID de la organización
            credentials: Credenciales con access_token
            limit: Límite de resultados
            
        Returns:
            Lista de keywords con métricas
        """
        # LinkedIn no proporciona keywords directamente en su API pública
        # Por ahora retornamos estructura vacía
        logger.info(f"📊 Obteniendo queries/keywords de LinkedIn para organización: {organization_id}")
        
        return []

    async def get_trends(
        self,
        start_date: str,
        end_date: str,
        organization_id: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Obtiene tendencias diarias de métricas SEO
        
        Args:
            start_date: Fecha inicio (YYYY-MM-DD)
            end_date: Fecha fin (YYYY-MM-DD)
            organization_id: ID de la organización
            credentials: Credenciales con access_token
            
        Returns:
            Lista de métricas por día
        """
        try:
            if credentials and "access_token" in credentials:
                self.access_token = credentials["access_token"]
                self.headers["Authorization"] = f"Bearer {self.access_token}"
            
            if not self.access_token:
                raise Exception("Access token required for LinkedIn SEO API")
            
            logger.info(f"📈 Obteniendo tendencias SEO de LinkedIn para organización: {organization_id}")
            
            async with httpx.AsyncClient() as client:
                if organization_id:
                    if organization_id.startswith("urn:li:organization:"):
                        org_urn = organization_id
                    else:
                        org_urn = f"urn:li:organization:{organization_id}"
                    
                    stats_url = f"{self.BASE_URL}/organizationPageStatistics"
                    
                    params = {
                        "q": "organization",
                        "organization": org_urn,
                        "timeGranularity": "DAY",
                        "startTime": int(start_date.replace("-", "")),
                        "endTime": int(end_date.replace("-", ""))
                    }
                    
                    response = await client.get(
                        stats_url,
                        params=params,
                        headers=self.headers,
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        trends = []
                        
                        elements = data.get("elements", [])
                        for element in elements:
                            time_range = element.get("timeRange", {})
                            metrics = element.get("metrics", {})
                            
                            date_str = time_range.get("start", "")[:10] if time_range.get("start") else ""
                            
                            impressions = int(metrics.get("uniqueVisitors", {}).get("value", 0))
                            clicks = int(metrics.get("clicks", {}).get("value", 0))
                            ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
                            
                            trends.append({
                                "date": date_str,
                                "impressions": impressions,
                                "clicks": clicks,
                                "ctr": round(ctr, 2),
                                "position": 0.0
                            })
                        
                        return sorted(trends, key=lambda x: x["date"])
                    else:
                        logger.warning(f"LinkedIn API returned {response.status_code}")
                        return []
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching LinkedIn SEO trends: {str(e)}")
            return []
