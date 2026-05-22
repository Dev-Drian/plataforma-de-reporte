import { Router } from 'express'
import { login, register, logout, getProfile } from '../controllers/auth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', authMiddleware, logout)
router.get('/profile', authMiddleware, getProfile)

export default router




