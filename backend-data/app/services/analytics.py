from typing import Dict, Optional, List
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
    OrderBy
)
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging
from datetime import datetime, timedelta
from app.services.search_console import OAuthExpiredError

logger = logging.getLogger(__name__)


def _refresh_credentials(creds: Credentials, service_name: str) -> Credentials:
    """Attempt to refresh OAuth credentials. Raises OAuthExpiredError on invalid_grant."""
    if creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError as re:
            error_str = str(re).lower()
            if "invalid_grant" in error_str or "revoked" in error_str:
                raise OAuthExpiredError(
                    f"The Google {service_name} token has expired or was revoked. "
                    "Please reconnect your account in Settings → Accounts."
                )
            raise
    return creds


class AnalyticsService:
    def __init__(self):
        self.admin_service = None
        self.data_client = None
        self._credentials = None

    def _build_admin_service(self, credentials_dict: Dict):
        """Construye el servicio de Google Analytics Admin con las credenciales"""
        try:
            creds = Credentials(
                token=credentials_dict.get('access_token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret')
            )
            
            creds = _refresh_credentials(creds, "Analytics")
            
            self._credentials = creds
            self.admin_service = build('analyticsadmin', 'v1beta', credentials=creds)
            return True
        except OAuthExpiredError:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "invalid_grant" in error_str or "revoked" in error_str:
                raise OAuthExpiredError(
                    "The Google Analytics token has expired or was revoked. "
                    "Please reconnect your account in Settings → Accounts."
                )
            raise Exception(f"Error building Analytics Admin service: {str(e)}")

    def _build_data_client(self, credentials_dict: Dict):
        """Construye el cliente de GA4 Data API"""
        try:
            creds = Credentials(
                token=credentials_dict.get('access_token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret')
            )
            
            creds = _refresh_credentials(creds, "Analytics")
            
            self._credentials = creds
            self.data_client = BetaAnalyticsDataClient(credentials=creds)
            return True
        except OAuthExpiredError:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "invalid_grant" in error_str or "revoked" in error_str:
                raise OAuthExpiredError(
                    "The Google Analytics token has expired or was revoked. "
                    "Please reconnect your account in Settings → Accounts."
                )
            raise Exception(f"Error building GA4 Data client: {str(e)}")

    async def list_properties(self, credentials: Optional[Dict] = None) -> List[Dict]:
        """
        Lista todas las propiedades de Google Analytics disponibles
        Similar a list_customer_accounts de AdsService
        """
        if not credentials:
            raise ValueError("Credentials are required")
        
        self._build_admin_service(credentials)
        
        try:
            account_summaries = self.admin_service.accountSummaries().list().execute()
            
            properties_list = []
            
            for account_summary in account_summaries.get('accountSummaries', []):
                account_name = account_summary.get('name', '')
                account_display_name = account_summary.get('displayName', '')
                
                for property_summary in account_summary.get('propertySummaries', []):
                    property_name = property_summary.get('property', '')
                    property_display_name = property_summary.get('displayName', '')
                    
                    property_id = property_name.split('/')[-1] if '/' in property_name else property_name
                    
                    properties_list.append({
                        "property_id": property_id,
                        "property_name": property_display_name,
                        "property_path": property_name,
                        "account_name": account_display_name,
                        "account_path": account_name
                    })
            
            return properties_list
        except HttpError as e:
            raise Exception(f"Analytics API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Error listing properties: {str(e)}")

    async def get_metrics(
        self,
        start_date: str,
        end_date: str,
        property_id: Optional[str] = None,
        credentials: Optional[Dict] = None
    ) -> Dict:
        """
        Get metrics from Google Analytics GA4 Data API.
        Returns users, sessions, pageviews, bounce rate, avg session duration.
        """
        if not credentials:
            raise ValueError("Credentials are required")
        
        if not property_id:
            raise ValueError("Property ID is required")
        
        self._build_data_client(credentials)
        
        try:
            # Format property for GA4 Data API
            property_resource = f"properties/{property_id}"
            
            # Request basic metrics
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                metrics=[
                    Metric(name="totalUsers"),
                    Metric(name="sessions"),
                    Metric(name="screenPageViews"),
                    Metric(name="bounceRate"),
                    Metric(name="averageSessionDuration"),
                    Metric(name="newUsers"),
                    Metric(name="engagedSessions"),
                ]
            )
            
            response = self.data_client.run_report(request)
            
            # Parse response
            metrics_data = {
                "users": 0,
                "sessions": 0,
                "pageviews": 0,
                "bounce_rate": 0.0,
                "avg_session_duration": 0.0,
                "new_users": 0,
                "engaged_sessions": 0,
                "start_date": start_date,
                "end_date": end_date
            }
            
            if response.rows:
                row = response.rows[0]
                metric_values = [v.value for v in row.metric_values]
                
                metrics_data["users"] = int(float(metric_values[0])) if metric_values[0] else 0
                metrics_data["sessions"] = int(float(metric_values[1])) if metric_values[1] else 0
                metrics_data["pageviews"] = int(float(metric_values[2])) if metric_values[2] else 0
                metrics_data["bounce_rate"] = round(float(metric_values[3]) * 100, 2) if metric_values[3] else 0.0
                metrics_data["avg_session_duration"] = round(float(metric_values[4]), 2) if metric_values[4] else 0.0
                metrics_data["new_users"] = int(float(metric_values[5])) if metric_values[5] else 0
                metrics_data["engaged_sessions"] = int(float(metric_values[6])) if metric_values[6] else 0
            
            return metrics_data
            
        except Exception as e:
            logger.error(f"Error getting GA4 metrics: {str(e)}")
            raise Exception(f"Error getting Analytics metrics: {str(e)}")

    async def get_users_trend(
        self,
        start_date: str,
        end_date: str,
        property_id: str,
        credentials: Dict
    ) -> List[Dict]:
        """Get daily users and sessions trend"""
        self._build_data_client(credentials)
        
        try:
            property_resource = f"properties/{property_id}"
            
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="date")],
                metrics=[
                    Metric(name="totalUsers"),
                    Metric(name="sessions"),
                    Metric(name="newUsers"),
                ],
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))]
            )
            
            response = self.data_client.run_report(request)
            
            trend_data = []
            for row in response.rows:
                date_str = row.dimension_values[0].value
                # Format date from YYYYMMDD to YYYY-MM-DD
                formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                trend_data.append({
                    "date": formatted_date,
                    "users": int(float(row.metric_values[0].value)),
                    "sessions": int(float(row.metric_values[1].value)),
                    "newUsers": int(float(row.metric_values[2].value)),
                })
            
            return trend_data
            
        except Exception as e:
            logger.error(f"Error getting users trend: {str(e)}")
            return []

    async def get_traffic_sources(
        self,
        start_date: str,
        end_date: str,
        property_id: str,
        credentials: Dict
    ) -> List[Dict]:
        """Get traffic sources breakdown"""
        self._build_data_client(credentials)
        
        try:
            property_resource = f"properties/{property_id}"
            
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                metrics=[Metric(name="sessions")],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=10
            )
            
            response = self.data_client.run_report(request)
            
            total_sessions = sum(int(float(row.metric_values[0].value)) for row in response.rows)
            
            sources_data = []
            for row in response.rows:
                sessions = int(float(row.metric_values[0].value))
                percentage = round((sessions / total_sessions * 100), 1) if total_sessions > 0 else 0
                sources_data.append({
                    "name": row.dimension_values[0].value,
                    "value": percentage,
                    "sessions": sessions
                })
            
            return sources_data
            
        except Exception as e:
            logger.error(f"Error getting traffic sources: {str(e)}")
            return []

    async def get_device_breakdown(
        self,
        start_date: str,
        end_date: str,
        property_id: str,
        credentials: Dict
    ) -> List[Dict]:
        """Get device category breakdown"""
        self._build_data_client(credentials)
        
        try:
            property_resource = f"properties/{property_id}"
            
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="deviceCategory")],
                metrics=[Metric(name="sessions")],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)]
            )
            
            response = self.data_client.run_report(request)
            
            device_data = []
            for row in response.rows:
                device_data.append({
                    "device": row.dimension_values[0].value.capitalize(),
                    "sessions": int(float(row.metric_values[0].value))
                })
            
            return device_data
            
        except Exception as e:
            logger.error(f"Error getting device breakdown: {str(e)}")
            return []

    async def get_top_pages(
        self,
        start_date: str,
        end_date: str,
        property_id: str,
        credentials: Dict,
        limit: int = 10
    ) -> List[Dict]:
        """Get top pages by pageviews"""
        self._build_data_client(credentials)
        
        try:
            property_resource = f"properties/{property_id}"
            
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="pagePath")],
                metrics=[
                    Metric(name="screenPageViews"),
                    Metric(name="totalUsers"),
                    Metric(name="averageSessionDuration"),
                ],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
                limit=limit
            )
            
            response = self.data_client.run_report(request)
            
            pages_data = []
            for row in response.rows:
                pages_data.append({
                    "page": row.dimension_values[0].value,
                    "pageviews": int(float(row.metric_values[0].value)),
                    "uniqueUsers": int(float(row.metric_values[1].value)),
                    "avgTime": int(float(row.metric_values[2].value))
                })
            
            return pages_data
            
        except Exception as e:
            logger.error(f"Error getting top pages: {str(e)}")
            return []

    async def get_top_countries(
        self,
        start_date: str,
        end_date: str,
        property_id: str,
        credentials: Dict,
        limit: int = 10
    ) -> List[Dict]:
        """Get top countries by sessions"""
        self._build_data_client(credentials)
        
        try:
            property_resource = f"properties/{property_id}"
            
            request = RunReportRequest(
                property=property_resource,
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="country")],
                metrics=[Metric(name="sessions")],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
                limit=limit
            )
            
            response = self.data_client.run_report(request)
            
            countries_data = []
            for row in response.rows:
                countries_data.append({
                    "country": row.dimension_values[0].value,
                    "sessions": int(float(row.metric_values[0].value))
                })
            
            return countries_data
            
        except Exception as e:
            logger.error(f"Error getting top countries: {str(e)}")
            return []

    async def get_dimension_data(self, start_date: str, end_date: str, dimension: str) -> list:
        """
        Obtener datos por dimensión (legacy method)
        """
        return []

