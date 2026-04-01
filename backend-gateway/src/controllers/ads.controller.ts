import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getAccountInfo = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, customerId, platform } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/ads/account-info', {
    method: 'GET',
    params: { accountId, customerId, platform },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getCustomerAccounts = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, managerCustomerId, platform } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/ads/customers', {
    method: 'GET',
    params: { accountId, managerCustomerId, platform },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getAdsMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, customerId, platform } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/ads/metrics', {
    method: 'GET',
    params: { startDate, endDate, accountId, customerId, platform },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getAdsCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, customerId, platform } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/ads/campaigns', {
    method: 'GET',
    params: { accountId, customerId, platform },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

export const getAdsTrends = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, customerId, platform } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/ads/trends', {
    method: 'GET',
    params: { startDate, endDate, accountId, customerId, platform },
    headers: {
      'Authorization': authHeader
    }
  })
  
  if (response.data && response.data.success !== undefined) {
    return res.status(response.status).json(response.data)
  }
  
  res.json(response.data)
})

