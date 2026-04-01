import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getGBPLocations = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/gbp/locations', {
    method: 'GET',
    params: { accountId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getGBPMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, accountId, locationId } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/gbp/metrics', {
    method: 'GET',
    params: { startDate, endDate, accountId, locationId },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})
