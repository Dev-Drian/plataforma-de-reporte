import { Router } from 'express'
import { 
  getGBPLocations, 
  getGBPMetrics
} from '../controllers/gbp.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/locations', getGBPLocations)
router.get('/metrics', getGBPMetrics)

export default router
