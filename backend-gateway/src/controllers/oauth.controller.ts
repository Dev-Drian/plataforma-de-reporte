import { Request, Response } from 'express'
import { asyncHandler } from '../middlewares/error.middleware'
// ...existing code...
import axios from 'axios'
import { callFastAPIService } from '../services/fastapi.service'

export const getOAuthConfigs = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/oauth/configs', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const getOAuthConfig = asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/oauth/configs/${platform}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const createOAuthConfig = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  try {
    const response = await callFastAPIService('/oauth/configs', {
      method: 'POST',
      data: req.body,
      headers: {
        'Authorization': authHeader
      }
    })
    
    // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
    if (response.data && response.data.success !== undefined) {
      return res.status(response.status).json(response.data)
    }
    
    return res.status(201).json(response.data)
  } catch (error: any) {
    // Si es un error 409, propagarlo con el formato correcto
    if (error.statusCode === 409 || error.response?.status === 409) {
      const errorData = error.responseData || error.response?.data || {
        success: false,
        statusCode: 409,
        message: error.message || 'Ya existe una configuración para esta plataforma',
        error: error.message
      }
      return res.status(409).json(errorData)
    }
    // Para otros errores, lanzarlos para que el errorHandler los maneje
    throw error
  }
})

export const updateOAuthConfig = asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/oauth/configs/${platform}`, {
    method: 'PUT',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const initOAuthFlow = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/oauth/init', {
    method: 'POST',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/oauth/callback', {
    method: 'POST',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const getOAuthProviders = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/oauth/providers', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

export const getOAuthProvider = asyncHandler(async (req: Request, res: Response) => {
  const { providerName } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/oauth/providers/${providerName}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  return res.json(response.data)
})

// Callback público para LinkedIn OAuth (no requiere autenticación)
export const linkedinOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' })
  }
  
  try {
    // Usar axios directamente para poder controlar el seguimiento de redirecciones
    const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000'
    
    const response = await axios({
      method: 'GET',
      url: `${FASTAPI_BASE_URL}/oauth/callback/linkedin`,
      params: { code, state },
      maxRedirects: 0, // No seguir redirecciones automáticamente
      validateStatus: (status: number) => status < 400 || status === 302 // Permitir 302
    })
    
    // Si el backend devuelve una redirección (302), seguirla
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      return res.redirect(response.headers.location)
    }
    
    // Si FastAPI ya devuelve el formato estándar, pasarlo directamente
    if (response.data && response.data.success !== undefined) {
      return res.status(response.status).json(response.data)
    }
    
    return res.json(response.data)
  } catch (error: any) {
    // Si es una redirección (error 302), seguirla
    if (error.response && error.response.status === 302 && error.response.headers.location) {
      return res.redirect(error.response.headers.location)
    }
    // Si axios no sigue redirecciones, intentar obtener la location del header
    if (error.response && error.response.headers && error.response.headers.location) {
      return res.redirect(error.response.headers.location)
    }
    throw error
  }
})
