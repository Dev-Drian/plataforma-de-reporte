import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'
import { AuthenticationError } from '../utils/errors'
import { successResponse, createdResponse, errorResponse } from '../utils/response'

export const register = asyncHandler(async (req: Request, res: Response) => {
  const response = await callFastAPIService('/auth/register', {
    method: 'POST',
    data: req.body
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  // Si no, formatear la respuesta
  return createdResponse(res, response.data, 'User registered successfully')
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const response = await callFastAPIService('/auth/login', {
    method: 'POST',
    data: req.body
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  // Si no, formatear la respuesta
  return successResponse(res, response.data, 'Login successful')
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // En JWT stateless, el logout es solo del lado del cliente
  // En producción, podrías invalidar tokens en Redis
  return successResponse(res, null, 'Logged out successfully')
})

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  // Obtener token del header Authorization
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Not authenticated')
  }
  
  // Intentar /auth/profile primero (alias), luego /auth/me
  try {
    const response = await callFastAPIService('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    })
    
    // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
    if (response.data && response.data.success !== undefined) {
      return res.status(response.status).json(response.data)
    }
    
    // Si no, formatear la respuesta
    return successResponse(res, response.data, 'Profile retrieved successfully')
  } catch (error: any) {
    // Si falla, intentar con /auth/me
    if (error.statusCode === 404) {
      const response = await callFastAPIService('/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (response.data && response.data.success !== undefined) {
        return res.status(response.status).json(response.data)
      }
      
      return successResponse(res, response.data, 'Profile retrieved successfully')
    }
    throw error
  }
})

