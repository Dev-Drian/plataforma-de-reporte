import { Router } from 'express'
import { 
  getGlobalMetrics,
  getGlobalTrends,
  getCacheStatus,
  forceRefresh
} from '../controllers/dashboard.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/metrics', getGlobalMetrics)
router.get('/trends', getGlobalTrends)
router.get('/cache-status', getCacheStatus)
router.post('/refresh', forceRefresh)

export default router



