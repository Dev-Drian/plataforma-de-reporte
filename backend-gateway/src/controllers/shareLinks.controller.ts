import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

// === Rutas autenticadas para gestión de share links ===

export const listShareLinks = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/share-links', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  res.status(response.status).json(response.data)
})

export const getShareLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/share-links/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  res.status(response.status).json(response.data)
})

export const createShareLink = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/share-links', {
    method: 'POST',
    data: req.body,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  })
  
  res.status(response.status).json(response.data)
})

export const updateShareLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/share-links/${id}`, {
    method: 'PUT',
    data: req.body,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  })
  
  res.status(response.status).json(response.data)
})

export const deleteShareLink = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/share-links/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader
    }
  })
  
  res.status(response.status).json(response.data)
})

export const regenerateToken = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/share-links/${id}/regenerate-token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader
    }
  })
  
  res.status(response.status).json(response.data)
})

// === Rutas públicas (sin autenticación) ===

export const getPublicDashboardInfo = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params
  
  const response = await callFastAPIService(`/public/dashboard/${token}`, {
    method: 'GET'
  })
  
  res.status(response.status).json(response.data)
})

export const verifyPublicDashboardPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params
  
  const response = await callFastAPIService(`/public/dashboard/${token}/verify`, {
    method: 'POST',
    data: req.body,
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  res.status(response.status).json(response.data)
})

export const getPublicDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params
  const { startDate, endDate } = req.query
  
  // El access_token se envía en el header para dashboards con contraseña
  const accessToken = req.headers['x-access-token']
  
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers['X-Access-Token'] = accessToken as string
  }
  
  const response = await callFastAPIService(`/public/dashboard/${token}/metrics`, {
    method: 'GET',
    params: { startDate, endDate },
    headers
  })
  
  res.status(response.status).json(response.data)
})
