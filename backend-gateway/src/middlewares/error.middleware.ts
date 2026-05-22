import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { errorResponse } from '../utils/response'

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si ya se envió una respuesta, no hacer nada
  if (res.headersSent) {
    return next(err)
  }

  const statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'
  
  // Mensajes más amigables para errores comunes
  if (err.isConnectionError) {
    message = 'El servicio de datos no está disponible. Por favor, intenta más tarde.'
  } else if (statusCode === 401) {
    message = 'No autorizado. Por favor, inicia sesión.'
  } else if (statusCode === 403) {
    message = 'No tienes permisos para realizar esta acción.'
  } else if (statusCode === 404) {
    message = 'Recurso no encontrado.'
  } else if (statusCode === 500) {
    message = 'Error interno del servidor. Por favor, intenta más tarde.'
  }

  // Log del error para debugging (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
    })
  }

  return errorResponse(res, message, statusCode, err.message)
}

