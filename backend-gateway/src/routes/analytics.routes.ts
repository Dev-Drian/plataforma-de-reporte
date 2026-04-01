import { Router } from 'express'
import { 
  getAnalyticsProperties,
  getAnalyticsMetrics,
  getAnalyticsTrend,
  getAnalyticsTrafficSources,
  getAnalyticsDevices,
  getAnalyticsTopPages,
  getAnalyticsTopCountries
} from '../controllers/analytics.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

// Root endpoint para /api/analytics/
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics API',
    endpoints: [
      '/properties',
      '/metrics',
      '/trend',
      '/traffic-sources',
      '/devices',
      '/top-pages',
      '/top-countries'
    ]
  })
})

router.get('/properties', getAnalyticsProperties)
router.get('/metrics', getAnalyticsMetrics)
router.get('/trend', getAnalyticsTrend)
router.get('/traffic-sources', getAnalyticsTrafficSources)
router.get('/devices', getAnalyticsDevices)
router.get('/top-pages', getAnalyticsTopPages)
router.get('/top-countries', getAnalyticsTopCountries)

export default router
