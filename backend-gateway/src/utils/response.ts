import { Response } from 'express'

/**
 * Modelo estándar de respuesta para todas las APIs
 * Diseñado para SaaS multi-tenant
 */
export interface ApiResponse<T = any> {
  success: boolean
  statusCode: number
  message: string
  data?: T
  error?: string
  timestamp: string
  path?: string
  requestId?: string
}

/**
 * Helper para crear respuestas exitosas
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
    path: res.req.path,
  }
  return res.status(statusCode).json(response)
}

/**
 * Helper para crear respuestas de error
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    statusCode,
    message,
    error: error || message,
    timestamp: new Date().toISOString(),
    path: res.req.path,
  }
  return res.status(statusCode).json(response)
}

/**
 * Helper para respuestas de creación (201)
 */
export const createdResponse = <T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response => {
  return successResponse(res, data, message, 201)
}

/**
 * Helper para respuestas sin contenido (204)
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send()
}




