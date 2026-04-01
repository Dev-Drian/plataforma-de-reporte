import { Router } from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/theme', getSettings)
router.put('/theme', updateSettings)

export default router

