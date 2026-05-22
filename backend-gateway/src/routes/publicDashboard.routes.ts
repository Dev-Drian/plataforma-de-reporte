import { Router } from 'express'
import { 
  getPublicDashboardInfo,
  verifyPublicDashboardPassword,
  getPublicDashboardMetrics
} from '../controllers/shareLinks.controller'

const router = Router()

// Rutas públicas - NO requieren autenticación
router.get('/:token', getPublicDashboardInfo)
router.post('/:token/verify', verifyPublicDashboardPassword)
router.get('/:token/metrics', getPublicDashboardMetrics)

export default router
