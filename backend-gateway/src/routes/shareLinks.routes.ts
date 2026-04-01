import { Router } from 'express'
import { 
  listShareLinks,
  getShareLink,
  createShareLink,
  updateShareLink,
  deleteShareLink,
  regenerateToken
} from '../controllers/shareLinks.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authMiddleware)

// CRUD de share links
router.get('/', listShareLinks)
router.get('/:id', getShareLink)
router.post('/', createShareLink)
router.put('/:id', updateShareLink)
router.delete('/:id', deleteShareLink)
router.post('/:id/regenerate-token', regenerateToken)

export default router
