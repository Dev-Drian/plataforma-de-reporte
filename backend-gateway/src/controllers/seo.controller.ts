import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getSEOMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/metrics', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEOQueries = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri, limit } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/queries', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri, limit },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEOPages = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri, limit } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/pages', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri, limit },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEOTrends = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/trends', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEODevices = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/devices', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEOCountries = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, propertyUri } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/countries', {
    method: 'GET',
    params: { startDate, endDate, accountId, propertyUri },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getSEOProperties = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/properties', {
    method: 'GET',
    params: { accountId },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getRankings = asyncHandler(async (req: Request, res: Response) => {
  const { keywords, city } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/seo/rankings', {
    method: 'GET',
    params: { keywords, city },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

