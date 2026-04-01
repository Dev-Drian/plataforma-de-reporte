import { Router } from 'express'
import { 
  getAdsMetrics,
  getAdsCampaigns,
  getAdsTrends,
  getAccountInfo,
  getCustomerAccounts
} from '../controllers/ads.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/account-info', getAccountInfo)
router.get('/customers', getCustomerAccounts)
router.get('/metrics', getAdsMetrics)
router.get('/campaigns', getAdsCampaigns)
router.get('/trends', getAdsTrends)

export default router




