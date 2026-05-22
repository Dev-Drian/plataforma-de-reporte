from typing import Dict, Optional
import httpx
import logging
import json

logger = logging.getLogger(__name__)


class LinkedInAdsService:
    """
    Servicio para integración con LinkedIn Ads API
    Utiliza OAuth 2.0 para autenticación
    """
    
    # LinkedIn API Base URL
    BASE_URL = "https://api.linkedin.com/v2"
    
    def __init__(self, access_token: Optional[str] = None):
        """
        Inicializa el servicio de LinkedIn Ads
        
        Args:
            access_token: Token de acceso OAuth 2.0 de LinkedIn
        """
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}" if access_token else "",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    async def get_metrics(
        self, 
        start_date: str, 
        end_date: str, 
        account_id: Optional[str] = None, 
        credentials: Optional[Dict] = None
    ) -> Dict:
        """
        Obtener métricas de LinkedIn Ads
        
        Args:
            start_date: Fecha de inicio (YYYY-MM-DD)
            end_date: Fecha de fin (YYYY-MM-DD)
            account_id: ID de la cuenta de LinkedIn
            credentials: Diccionario con access_token si no fue proporcionado en init
        
        Returns:
            Diccionario con métricas agregadas
        """
        try:
            if credentials and "access_token" in credentials:
                self.access_token = credentials["access_token"]
                self.headers["Authorization"] = f"Bearer {self.access_token}"
            
            if not self.access_token:
                logger.error("No access token provided for LinkedIn Ads API")
                raise Exception("Access token required for LinkedIn Ads API")
            
            # LinkedIn Ads Campaign Analytics Endpoint
            # https://docs.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting
            
            analytics_url = f"{self.BASE_URL}/adAnalyticsV2"
            
            params = {
                "q": "analytics",
                "pivot": "CAMPAIGN",
                "timeGranularity": "DAILY",
                "dateRange.start.day": int(start_date.split("-")[2]),
                "dateRange.start.month": int(start_date.split("-")[1]),
                "dateRange.start.year": int(start_date.split("-")[0]),
                "dateRange.end.day": int(end_date.split("-")[2]),
                "dateRange.end.month": int(end_date.split("-")[1]),
                "dateRange.end.year": int(end_date.split("-")[0]),
            }
            
            if account_id:
                params["accounts[0]"] = f"urn:li:sponsoredAccount:{account_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    analytics_url,
                    params=params,
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"LinkedIn API error: {response.status_code} - {response.text}")
                    # Return mock data if API fails
                    return {
                        "clicks": 0,
                        "impressions": 0,
                        "spend": 0.0,
                        "conversions": 0,
                        "cpc": 0.0,
                        "ctr": 0.0,
                        "start_date": start_date,
                        "end_date": end_date,
                        "error": f"LinkedIn API returned {response.status_code}"
                    }
                
                data = response.json()
                
                # Parse LinkedIn API response and aggregate metrics
                metrics = await self._parse_analytics_response(data, start_date, end_date)
                
                return metrics
                
        except Exception as e:
            logger.error(f"Error fetching LinkedIn Ads metrics: {str(e)}")
            return {
                "clicks": 0,
                "impressions": 0,
                "spend": 0.0,
                "conversions": 0,
                "cpc": 0.0,
                "ctr": 0.0,
                "start_date": start_date,
                "end_date": end_date,
                "error": str(e)
            }

    async def _parse_analytics_response(self, data: Dict, start_date: str, end_date: str) -> Dict:
        """
        Procesa la respuesta del API de analytics de LinkedIn
        
        Args:
            data: Respuesta del API
            start_date: Fecha de inicio
            end_date: Fecha de fin
        
        Returns:
            Diccionario con métricas agregadas
        """
        try:
            elements = data.get("elements", [])
            
            total_clicks = 0
            total_impressions = 0
            total_spend = 0.0
            total_conversions = 0
            
            for element in elements:
                pivot_value = element.get("pivotValues", [])
                metric_values = element.get("metricValues", [])
                
                # Mapear métricas desde la respuesta
                for i, metric in enumerate(metric_values):
                    value = metric.get("value", 0)
                    
                    # Los índices dependen del orden solicitado
                    # Típicamente: [impressions, clicks, spend]
                    if i == 0:  # impressions
                        total_impressions += value
                    elif i == 1:  # clicks
                        total_clicks += value
                    elif i == 2:  # spend
                        total_spend += value
            
            # Calcular ratios
            cpc = total_spend / total_clicks if total_clicks > 0 else 0.0
            ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
            
            return {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "spend": round(total_spend, 2),
                "conversions": total_conversions,
                "cpc": round(cpc, 4),
                "ctr": round(ctr, 2),
                "start_date": start_date,
                "end_date": end_date
            }
            
        except Exception as e:
            logger.error(f"Error parsing LinkedIn analytics response: {str(e)}")
            raise

