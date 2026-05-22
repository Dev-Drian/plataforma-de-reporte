"""
Servicio de Meta Ads API (Facebook/Instagram Ads)
Proporciona funciones para obtener métricas, campañas y cuentas de anuncios
"""
from typing import Dict, Optional, List
import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class MetaAdsService:
    """
    Servicio para interactuar con Meta Ads API
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
    
    def _normalize_account_id(self, account_id: str) -> str:
        """
        Normaliza el account_id para Meta Ads API
        - Remueve guiones
        - Asegura prefijo act_
        """
        # Remover guiones
        clean_id = account_id.replace("-", "")
        
        # Si ya tiene prefijo act_, removerlo temporalmente
        if clean_id.startswith("act_"):
            clean_id = clean_id[4:]
        
        # Remover cualquier guión que haya quedado
        clean_id = clean_id.replace("-", "")
        
        # Agregar prefijo act_
        return f"act_{clean_id}"
    
    async def get_account_info(
        self,
        account_id: str,
        credentials: Dict
    ) -> Dict:
        """
        Obtiene información de una cuenta de anuncios de Meta
        
        Args:
            account_id: ID de la cuenta (formato: act_123456789)
            credentials: Credenciales con access_token
            
        Returns:
            Dict con información de la cuenta
        """
        access_token = self._get_access_token(credentials)
        
        # Normalizar account_id
        account_id = self._normalize_account_id(account_id)
        
        logger.info(f"🔍 Obteniendo info de cuenta Meta: {account_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{account_id}",
                    params={
                        "fields": "id,name,account_status,currency,timezone_name,business",
                        "access_token": access_token
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                return {
                    "account_id": data.get("id"),
                    "account_name": data.get("name"),
                    "currency_code": data.get("currency", "USD"),
                    "time_zone": data.get("timezone_name", "UTC"),
                    "account_status": data.get("account_status"),
                    "is_manager": False,  # Meta no tiene concepto de MCC
                    "business_id": data.get("business", {}).get("id") if data.get("business") else None
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener info de cuenta Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener información de cuenta Meta Ads: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener info de cuenta Meta: {str(e)}")
            raise

    async def get_metrics(
        self,
        start_date: str,
        end_date: str,
        account_id: str,
        credentials: Dict,
        account_ids: Optional[List[str]] = None
    ) -> Dict:
        """
        Obtiene métricas de Meta Ads para un período específico
        
        Args:
            start_date: Fecha inicio (formato: YYYY-MM-DD)
            end_date: Fecha fin (formato: YYYY-MM-DD)
            account_id: ID de la cuenta principal
            credentials: Credenciales con access_token
            account_ids: Lista de IDs de cuentas (para consolidar múltiples cuentas)
            
        Returns:
            Dict con métricas agregadas
        """
        access_token = self._get_access_token(credentials)
        
        # Si hay múltiples account_ids, consolidar
        accounts_to_query = account_ids if account_ids else [account_id]
        
        total_metrics = {
            "impressions": 0,
            "clicks": 0,
            "spend": 0.0,
            "conversions": 0,
            "cpc": 0.0,
            "ctr": 0.0,
            "roas": 0.0,
            "start_date": start_date,
            "end_date": end_date
        }
        
        try:
            async with httpx.AsyncClient() as client:
                for acc_id in accounts_to_query:
                    # Normalizar account_id
                    acc_id = self._normalize_account_id(acc_id)
                    
                    logger.info(f"📊 Obteniendo métricas de Meta para: {acc_id}")
                    
                    # Obtener insights de la cuenta
                    response = await client.get(
                        f"{self.base_url}/{acc_id}/insights",
                        params={
                            "time_range": f"{{'since':'{start_date}','until':'{end_date}'}}",
                            "fields": "impressions,clicks,spend,cpc,ctr,actions,action_values",
                            "access_token": access_token,
                            "level": "account"
                        },
                        timeout=30.0
                    )
                    
                    response.raise_for_status()
                    data = response.json()
                    
                    # Procesar datos
                    insights = data.get("data", [])
                    if insights:
                        for insight in insights:
                            total_metrics["impressions"] += int(insight.get("impressions", 0))
                            total_metrics["clicks"] += int(insight.get("clicks", 0))
                            total_metrics["spend"] += float(insight.get("spend", 0))
                            
                            # Conversiones (purchase actions)
                            actions = insight.get("actions", [])
                            for action in actions:
                                if action.get("action_type") == "purchase":
                                    total_metrics["conversions"] += int(action.get("value", 0))
                            
                            # ROAS (return on ad spend)
                            action_values = insight.get("action_values", [])
                            purchase_value = 0.0
                            for action_value in action_values:
                                if action_value.get("action_type") == "purchase":
                                    purchase_value += float(action_value.get("value", 0))
                            
                            if total_metrics["spend"] > 0:
                                total_metrics["roas"] = purchase_value / total_metrics["spend"]
            
            # Calcular métricas derivadas
            if total_metrics["clicks"] > 0:
                total_metrics["cpc"] = total_metrics["spend"] / total_metrics["clicks"]
            
            if total_metrics["impressions"] > 0:
                total_metrics["ctr"] = (total_metrics["clicks"] / total_metrics["impressions"]) * 100
            
            return total_metrics
            
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener métricas Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener métricas de Meta Ads: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener métricas Meta: {str(e)}")
            raise

    async def get_campaigns(
        self,
        account_id: str,
        credentials: Dict,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """
        Obtiene lista de campañas con sus métricas
        
        Args:
            account_id: ID de la cuenta
            credentials: Credenciales con access_token
            start_date: Fecha inicio (opcional)
            end_date: Fecha fin (opcional)
            
        Returns:
            Lista de campañas con métricas
        """
        access_token = self._get_access_token(credentials)
        
        # Normalizar account_id
        account_id = self._normalize_account_id(account_id)
        
        logger.info(f"📊 Obteniendo campañas de Meta para: {account_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                # Obtener campañas
                response = await client.get(
                    f"{self.base_url}/{account_id}/campaigns",
                    params={
                        "fields": "id,name,status,objective,start_time,stop_time",
                        "access_token": access_token,
                        "limit": 100
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                campaigns = []
                for campaign in data.get("data", []):
                    campaign_info = {
                        "campaign_id": campaign.get("id"),
                        "campaign_name": campaign.get("name"),
                        "status": campaign.get("status"),
                        "objective": campaign.get("objective"),
                        "start_date": campaign.get("start_time"),
                        "end_date": campaign.get("stop_time"),
                        "impressions": 0,
                        "clicks": 0,
                        "spend": 0.0,
                        "conversions": 0
                    }
                    
                    # Si hay fechas, obtener insights de la campaña
                    if start_date and end_date:
                        insights_response = await client.get(
                            f"{self.base_url}/{campaign.get('id')}/insights",
                            params={
                                "time_range": f"{{'since':'{start_date}','until':'{end_date}'}}",
                                "fields": "impressions,clicks,spend,actions",
                                "access_token": access_token
                            },
                            timeout=30.0
                        )
                        
                        if insights_response.status_code == 200:
                            insights_data = insights_response.json()
                            insights = insights_data.get("data", [])
                            if insights:
                                insight = insights[0]
                                campaign_info["impressions"] = int(insight.get("impressions", 0))
                                campaign_info["clicks"] = int(insight.get("clicks", 0))
                                campaign_info["spend"] = float(insight.get("spend", 0))
                                
                                # Conversiones
                                actions = insight.get("actions", [])
                                for action in actions:
                                    if action.get("action_type") == "purchase":
                                        campaign_info["conversions"] = int(action.get("value", 0))
                    
                    campaigns.append(campaign_info)
                
                return campaigns
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener campañas Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener campañas de Meta Ads: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener campañas Meta: {str(e)}")
            raise

    async def get_trends(
        self,
        start_date: str,
        end_date: str,
        account_id: str,
        credentials: Dict
    ) -> List[Dict]:
        """
        Obtiene tendencias diarias de métricas
        
        Args:
            start_date: Fecha inicio (formato: YYYY-MM-DD)
            end_date: Fecha fin (formato: YYYY-MM-DD)
            account_id: ID de la cuenta
            credentials: Credenciales con access_token
            
        Returns:
            Lista de métricas por día
        """
        access_token = self._get_access_token(credentials)
        
        # Normalizar account_id
        account_id = self._normalize_account_id(account_id)
        
        logger.info(f"📈 Obteniendo tendencias de Meta para: {account_id}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/{account_id}/insights",
                    params={
                        "time_range": f"{{'since':'{start_date}','until':'{end_date}'}}",
                        "fields": "impressions,clicks,spend,cpc,ctr,actions",
                        "access_token": access_token,
                        "time_increment": 1,  # Datos diarios
                        "level": "account"
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                trends = []
                for insight in data.get("data", []):
                    # Extraer conversiones
                    conversions = 0
                    actions = insight.get("actions", [])
                    for action in actions:
                        if action.get("action_type") == "purchase":
                            conversions = int(action.get("value", 0))
                    
                    trend = {
                        "date": insight.get("date_start"),
                        "impressions": int(insight.get("impressions", 0)),
                        "clicks": int(insight.get("clicks", 0)),
                        "cost": float(insight.get("spend", 0)),
                        "conversions": conversions,
                        "cpc": float(insight.get("cpc", 0)),
                        "ctr": float(insight.get("ctr", 0))
                    }
                    trends.append(trend)
                
                return trends
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Error HTTP al obtener tendencias Meta: {e.response.status_code}")
            logger.error(f"Response: {e.response.text}")
            raise Exception(f"Error al obtener tendencias de Meta Ads: {e.response.text}")
        except Exception as e:
            logger.error(f"Error al obtener tendencias Meta: {str(e)}")
            raise


# Instancia global del servicio
meta_ads_service = MetaAdsService()


