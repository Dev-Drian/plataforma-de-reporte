import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getGlobalMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountIds } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/dashboard/metrics', {
    method: 'GET',
    params: { startDate, endDate, accountIds },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getGlobalTrends = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountIds } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/dashboard/trends', {
    method: 'GET',
    params: { startDate, endDate, accountIds },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getCacheStatus = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/dashboard/cache-status', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const forceRefresh = asyncHandler(async (req: Request, res: Response) => {
  const { accountIds } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/dashboard/refresh', {
    method: 'POST',
    params: { accountIds },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})



