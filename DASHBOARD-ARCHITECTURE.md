# Arquitectura del Dashboard Global

## 📊 Visión General

El Dashboard Global es una vista consolidada que agrega métricas de todas las plataformas de marketing digital conectadas:
- **Google Ads** (Google Ads API)
- **Meta Ads** (Facebook/Instagram Ads)
- **LinkedIn Ads** (LinkedIn Marketing API)
- **TikTok Ads** (TikTok Marketing API)
- **SEO** (Google Search Console)

## 🏗️ Arquitectura

### Backend (FastAPI)

#### 1. Endpoint Principal: `/api/dashboard/metrics`
- **Ubicación**: `backend-data/app/api/dashboard.py`
- **Función**: Agrega métricas de todas las plataformas conectadas
- **Cache**: Redis con TTL de 30 minutos (1800 segundos)
- **Parámetros**:
  - `startDate`: Fecha de inicio (YYYY-MM-DD)
  - `endDate`: Fecha de fin (YYYY-MM-DD)
  - `accountIds`: IDs de cuentas específicas (opcional, separados por coma)

#### 2. Flujo de Datos

```
Usuario → Frontend → Gateway → Backend → APIs Externas
                ↓
            Redis Cache (TTL: 30 min)
                ↓
            Agregación de Métricas
                ↓
            Respuesta JSON
```

#### 3. Agregación de Métricas

El backend:
1. Obtiene todas las cuentas activas del usuario
2. Agrupa cuentas por plataforma (google, meta, linkedin, tiktok)
3. Para cada plataforma:
   - Obtiene métricas de cada cuenta
   - Suma métricas de todas las cuentas de esa plataforma
4. Calcula métricas globales agregadas:
   - `totalClicks`: Suma de clicks de todas las plataformas
   - `totalImpressions`: Suma de impressions de todas las plataformas
   - `totalCost`: Suma de costos de todas las plataformas
   - `totalConversions`: Suma de conversiones de todas las plataformas
   - `totalRevenue`: Suma de ingresos de todas las plataformas
   - `totalCTR`: CTR promedio ponderado
   - `totalCPC`: CPC promedio ponderado
   - `totalCPM`: CPM promedio ponderado
   - `totalROAS`: ROAS promedio ponderado
   - `totalCPA`: CPA promedio ponderado

### Frontend (React)

#### 1. Servicio: `dashboardService`
- **Ubicación**: `frontend/src/services/analytics/dashboard.service.ts`
- **Métodos**:
  - `getGlobalMetrics()`: Obtiene métricas agregadas
  - `getGlobalTrends()`: Obtiene tendencias agregadas (próximamente)
  - `getCacheStatus()`: Obtiene estado del cache
  - `forceRefresh()`: Fuerza actualización (invalida cache)

#### 2. Componente: `Dashboard.tsx`
- **Ubicación**: `frontend/src/pages/dashboard/Dashboard.tsx`
- **Características**:
  - Selector de rango de fechas (rápido: 7, 15, 30, 90 días o personalizado)
  - Auto-actualización cada 5 minutos (opcional)
  - Botón de actualización manual (invalida cache)
  - KPIs principales globales
  - Gráficos de distribución por plataforma
  - Detalle por plataforma

## 🔄 Sistema de Actualización con Redis

### Cache en Backend

```python
# Cache key pattern
cache_key = "dashboard:global_metrics:{startDate}:{endDate}:{accountIds}"

# TTL: 30 minutos (1800 segundos)
set_to_cache(cache_key, metrics, ttl=1800)
```

### Actualización Automática en Frontend

```typescript
// Auto-refresh cada 5 minutos
useEffect(() => {
  if (!autoRefresh) return
  
  const interval = setInterval(() => {
    loadMetrics()
  }, 5 * 60 * 1000) // 5 minutos
  
  return () => clearInterval(interval)
}, [autoRefresh, loadMetrics])
```

### Forzar Actualización

```typescript
// Invalida cache y recarga datos
await dashboardService.forceRefresh(accountIds)
await loadMetrics()
```

## 📁 Organización de Archivos

```
backend-data/
├── app/
│   ├── api/
│   │   ├── dashboard.py          # Endpoint del dashboard global
│   │   ├── ads.py                # Endpoint de Google Ads
│   │   ├── seo.py                # Endpoint de SEO
│   │   └── ...
│   ├── services/
│   │   ├── ads.py                # Servicio de Google Ads
│   │   ├── meta_ads.py           # Servicio de Meta Ads
│   │   ├── linkedin_ads.py       # Servicio de LinkedIn Ads
│   │   └── tiktok_ads.py          # Servicio de TikTok Ads
│   └── core/
│       └── cache.py              # Utilidades de Redis

frontend/
├── src/
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx     # Componente principal del dashboard
│   │   ├── ads/
│   │   │   └── AdsPage.tsx       # Página de Google Ads
│   │   └── seo/
│   │       └── SEOPage.tsx       # Página de SEO
│   └── services/
│       └── analytics/
│           ├── dashboard.service.ts  # Servicio del dashboard
│           ├── ads.service.ts        # Servicio de Ads
│           └── seo.service.ts        # Servicio de SEO
```

## 🔌 Cómo Agregar una Nueva Plataforma

### 1. Backend

1. **Crear servicio** en `backend-data/app/services/`:
   ```python
   class NuevaPlataformaService:
       async def get_metrics(self, start_date, end_date, credentials):
           # Implementar obtención de métricas
           return {
               "clicks": ...,
               "impressions": ...,
               "cost": ...,
               "conversions": ...,
           }
   ```

2. **Agregar al dashboard** en `backend-data/app/api/dashboard.py`:
   ```python
   nueva_plataforma_service = NuevaPlataformaService()
   
   # En get_global_metrics():
   nueva_accounts = accounts_by_platform.get("nueva_plataforma", [])
   if nueva_accounts:
       # Obtener métricas y agregar a platforms_metrics
   ```

### 2. Frontend

1. **Agregar color** en `Dashboard.tsx`:
   ```typescript
   const COLORS = {
     // ...
     nueva_plataforma: "#COLOR_HEX",
   }
   ```

2. **Agregar nombre** en la visualización:
   ```typescript
   {key === "nueva_plataforma" ? "Nueva Plataforma" : ...}
   ```

## 🎯 Estructura de Respuesta del API

```json
{
  "data": {
    "totalClicks": 15000,
    "totalImpressions": 500000,
    "totalCost": 5000.50,
    "totalConversions": 300,
    "totalRevenue": 15000.00,
    "totalCTR": 3.0,
    "totalCPC": 0.33,
    "totalCPM": 10.00,
    "totalROAS": 3.0,
    "totalCPA": 16.67,
    "platforms": {
      "google": {
        "platform": "google",
        "clicks": 10000,
        "impressions": 300000,
        "cost": 3000.00,
        "conversions": 200,
        "revenue": 10000.00,
        "ctr": 3.33,
        "cpc": 0.30,
        "cpm": 10.00,
        "roas": 3.33,
        "cpa": 15.00
      },
      "meta": {
        "platform": "meta",
        "clicks": 5000,
        "impressions": 200000,
        "cost": 2000.50,
        "conversions": 100,
        "revenue": 5000.00,
        "ctr": 2.5,
        "cpc": 0.40,
        "cpm": 10.00,
        "roas": 2.5,
        "cpa": 20.00
      }
    },
    "trends": [],
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

## 🚀 Próximas Mejoras

1. **Tendencias Agregadas**: Implementar `/api/dashboard/trends` para gráficos de tendencias
2. **Comparación de Períodos**: Agregar métricas del período anterior para calcular cambios
3. **Filtros Avanzados**: Permitir filtrar por campaña, dispositivo, etc.
4. **Exportación**: Permitir exportar datos a CSV/Excel
5. **Alertas**: Notificaciones cuando métricas cambien significativamente
6. **WebSockets**: Actualización en tiempo real en lugar de polling

## 📝 Notas Importantes

- **Cache**: Los datos se cachean por 30 minutos para reducir llamadas a APIs externas
- **Rate Limits**: Respetar límites de rate de cada plataforma
- **Errores**: Si una plataforma falla, las demás siguen funcionando
- **Performance**: La agregación se hace en el backend para optimizar el frontend

