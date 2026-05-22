import { Router } from 'express'
import { 
  getOAuthConfigs, 
  getOAuthConfig, 
  createOAuthConfig, 
  updateOAuthConfig,
  initOAuthFlow,
  oauthCallback,
  getOAuthProviders,
  getOAuthProvider,
  linkedinOAuthCallback
} from '../controllers/oauth.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

// Ruta pública para callback de LinkedIn (debe ir ANTES del middleware de autenticación)
router.get('/callback/linkedin', linkedinOAuthCallback)

// Todas las demás rutas requieren autenticación
router.use(authMiddleware)

// Rutas de proveedores OAuth (solo admin)
router.get('/providers', getOAuthProviders)
router.get('/providers/:providerName', getOAuthProvider)

// Rutas de configuración OAuth
router.get('/configs', getOAuthConfigs)
router.get('/configs/:platform', getOAuthConfig)
router.post('/configs', createOAuthConfig)
router.put('/configs/:platform', updateOAuthConfig)

// Rutas de flujo OAuth
router.post('/init', initOAuthFlow)
router.post('/callback', oauthCallback)

export default router

