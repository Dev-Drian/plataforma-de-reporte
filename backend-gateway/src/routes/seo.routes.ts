import { Router } from 'express'
import { 
  getSEOMetrics, 
  getRankings,
  getSEOQueries,
  getSEOPages,
  getSEOTrends,
  getSEODevices,
  getSEOCountries,
  getSEOProperties
} from '../controllers/seo.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/metrics', getSEOMetrics)
router.get('/queries', getSEOQueries)
router.get('/pages', getSEOPages)
router.get('/trends', getSEOTrends)
router.get('/devices', getSEODevices)
router.get('/countries', getSEOCountries)
router.get('/properties', getSEOProperties)
router.get('/rankings', getRankings)

export default router




