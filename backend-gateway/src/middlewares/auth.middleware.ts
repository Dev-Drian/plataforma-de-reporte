import { Request, Response, NextFunction } from 'express'

/**
 * Middleware de autenticación que solo verifica que el token exista
 * La validación real del token se hace en el backend de datos (FastAPI)
 * Esto permite que el gateway simplemente pase el token sin validarlo
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // Solo verificamos que el token exista, no lo validamos
  // El backend de datos (FastAPI) es quien valida el token
  const token = authHeader.replace('Bearer ', '')
  
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Invalid token format' })
  }

  // Guardar el token en el request para que los controllers lo pasen al backend
  req.token = token
  next()
}

declare global {
  namespace Express {
    interface Request {
      token?: string
      user?: {
        userId: string
        email: string
        role: string
        tenantId?: string
      }
    }
  }
}

