"""
Servicio de Meta SEO API (Facebook/Instagram Search Insights)
Proporciona funciones para obtener métricas de búsqueda interna, hashtags y Explore
"""
from typing import Dict, Optional, List
import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class MetaSEOService:
    """
    Servicio para interactuar con Meta Graph API para métricas SEO
    (búsqueda interna, hashtags, Explore, etc.)
    """
    
    def __init__(self):
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
    
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
        page_id: str,
        credentials: Dict
    ) -> Dict:
        """
        Obtiene métricas SEO de Meta (búsqueda interna, hashtags, Explore)
        
        Args:
            start_date: Fecha inicio (formato: YYYY-MM-DD)
            end_date: Fecha fin (formato: YYYY-MM-DD)
            page_id: ID de la página/perfil de Facebook/Instagram
            credentials: Credenciales con access_token
            
        Returns:
            Dict con métricas SEO agregadas
        """
        access_token = self._get_access_token(credentials)
        
        logger.info(f"🔍 Obteniendo métricas SEO de Meta para página: {page_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                # Obtener insights de la página relacionados con búsqueda
                # Meta Graph API insights para búsqueda y descubrimiento
                response = await client.get(
                    f"{self.base_url}/{page_id}/insights",
                    params={
                        "metric": "page_impressions_by_impression_type,page_reach_by_impression_type,page_engaged_users",
                        "period": "day",
                        "since": start_date,
                        "until": end_date,
                        "access_token": access_token
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Procesar métricas de búsqueda
                total_impressions = 0
                total_reach = 0
                total_engaged_users = 0
                search_impressions = 0
                explore_impressions = 0
                
                insights = data.get("data", [])
                for insight in insights:
                    metric_name = insight.get("name", "")
                    values = insight.get("values", [])
                    
                    # Sumar todos los valores del período
                    for value_obj in values:
                        value = value_obj.get("value", {})
                        
                        if "page_impressions_by_impression_type" in metric_name:
                            # Desglose por tipo de impresión
                            if isinstance(value, dict):
                                total_impressions += sum(int(v) for v in value.values() if isinstance(v, (int, str)))
                                # Búsqueda interna
                                search_impressions += int(value.get("search", 0))
                                # Explore/Discover
                                explore_impressions += int(value.get("other", 0))
                        elif "page_reach_by_impression_type" in metric_name:
                            if isinstance(value, dict):
                                total_reach += sum(int(v) for v in value.values() if isinstance(v, (int, str)))
                        elif "page_engaged_users" in metric_name:
                            if isinstance(value, (int, str)):
                                total_engaged_users += int(value)
                
                # Obtener métricas de hashtags (si es Instagram)
                hashtag_impressions = 0
                hashtag_reach = 0
                
                try:
                    # Intentar obtener métricas de Instagram (si el page_id es de Instagram)
                    instagram_response = await client.get(
                        f"{self.base_url}/{page_id}",
                        params={
                            "fields": "instagram_business_account",
                            "access_token": access_token
                        },
                        timeout=30.0
                    )
                    
                    if instagram_response.status_code == 200:
                        instagram_data = instagram_response.json()
                        instagram_account_id = instagram_data.get("instagram_business_account", {}).get("id")
                        
                        if instagram_account_id:
                            # Obtener insights de Instagram (hashtags, Explore)
                            instagram_insights = await client.get(
                                f"{self.base_url}/{instagram_account_id}/insights",
                                params={
                                    "metric": "impressions,reach,profile_views",
                                    "period": "day",
                                    "since": start_date,
                                    "until": end_date,
                                    "access_token": access_token
                                },
                                timeout=30.0
                            )
                            
                            if instagram_insights.status_code == 200:
                                instagram_insights_data = instagram_insights.json()
                                for insight in instagram_insights_data.get("data", []):
                                    values = insight.get("values", [])
                                    for value_obj in values:
                                        val = value_obj.get("value", 0)
                                        if isinstance(val, (int, str)):
                                            if "impressions" in insight.get("name", ""):
                                                hashtag_impressions += int(val)
                                            elif "reach" in insight.get("name", ""):
                                                hashtag_reach += int(val)
                except Exception as e:
                    logger.debug(f"No se pudieron obtener métricas de Instagram: {str(e)}")
                
                # Calcular CTR aproximado (clics estimados / impresiones)
                # Meta no proporciona clics directos de búsqueda, usamos engaged_users como proxy
                estimated_clicks = total_engaged_users
                ctr = (estimated_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
                
                return {
                    "clicks": estimated_clicks,  # Usando engaged_users como proxy
                    "impressions": total_impressions,
                    "ctr": round(ctr, 2),
                    "position": 0.0,  # Meta no tiene posición como Google
                    "search_impressions": search_impressions,
                    "explore_impressions": explore_impressions,
                    "hashtag_impressions": hashtag_impressions,
                    "hashtag_reach": hashtag_reach,
                    "reach": total_reach,
                    "engaged_users": total_engaged_users,
                    "start_date": start_date,
                    "end_date": end_date,
                    "property_uri": page_id
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener métricas SEO Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener métricas SEO de Meta: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener métricas SEO Meta: {str(e)}")
            raise
    
    async def get_queries(
        self,
        start_date: str,
        end_date: str,
        page_id: str,
        credentials: Dict,
        limit: int = 100
    ) -> List[Dict]:
        """
        Obtiene top keywords/hashtags que traen tráfico
        
        Args:
            start_date: Fecha inicio (formato: YYYY-MM-DD)
            end_date: Fecha fin (formato: YYYY-MM-DD)
            page_id: ID de la página/perfil
            credentials: Credenciales con access_token
            limit: Límite de resultados
            
        Returns:
            Lista de keywords/hashtags con métricas
        """
        # Meta no proporciona keywords directamente, pero podemos obtener hashtags de posts
        # Por ahora retornamos estructura vacía, se puede implementar obteniendo posts y sus hashtags
        logger.info(f"📊 Obteniendo queries/hashtags de Meta para página: {page_id}")
        
        return []
    
    async def get_trends(
        self,
        start_date: str,
        end_date: str,
        page_id: str,
        credentials: Dict
    ) -> List[Dict]:
        """
        Obtiene tendencias diarias de métricas SEO
        
        Args:
            start_date: Fecha inicio (formato: YYYY-MM-DD)
            end_date: Fecha fin (formato: YYYY-MM-DD)
            page_id: ID de la página/perfil
            credentials: Credenciales con access_token
            
        Returns:
            Lista de métricas por día
        """
        access_token = self._get_access_token(credentials)
        
        logger.info(f"📈 Obteniendo tendencias SEO de Meta para página: {page_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{page_id}/insights",
                    params={
                        "metric": "page_impressions_by_impression_type,page_engaged_users",
                        "period": "day",
                        "since": start_date,
                        "until": end_date,
                        "access_token": access_token
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                trends = []
                # Procesar datos diarios
                insights_by_date = {}
                
                for insight in data.get("data", []):
                    metric_name = insight.get("name", "")
                    values = insight.get("values", [])
                    
                    for value_obj in values:
                        date_str = value_obj.get("end_time", "")[:10]  # YYYY-MM-DD
                        value = value_obj.get("value", {})
                        
                        if date_str not in insights_by_date:
                            insights_by_date[date_str] = {
                                "date": date_str,
                                "impressions": 0,
                                "clicks": 0,
                                "ctr": 0.0,
                                "position": 0.0
                            }
                        
                        if "page_impressions_by_impression_type" in metric_name:
                            if isinstance(value, dict):
                                total = sum(int(v) for v in value.values() if isinstance(v, (int, str)))
                                insights_by_date[date_str]["impressions"] += total
                        elif "page_engaged_users" in metric_name:
                            if isinstance(value, (int, str)):
                                insights_by_date[date_str]["clicks"] += int(value)
                
                # Calcular CTR y agregar a trends
                for date_str, metrics in insights_by_date.items():
                    if metrics["impressions"] > 0:
                        metrics["ctr"] = (metrics["clicks"] / metrics["impressions"]) * 100
                    trends.append(metrics)
                
                return sorted(trends, key=lambda x: x["date"])
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener tendencias SEO Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener tendencias SEO de Meta: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener tendencias SEO Meta: {str(e)}")
            raise
