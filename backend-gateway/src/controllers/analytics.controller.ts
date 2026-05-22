import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getAnalyticsProperties = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/properties', {
    method: 'GET',
    params: { accountId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/metrics', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsTrend = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/trend', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsTrafficSources = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/traffic-sources', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsDevices = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/devices', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsTopPages = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId, limit } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/top-pages', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId, limit },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAnalyticsTopCountries = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyId, limit } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/analytics/top-countries', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyId, limit },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})
