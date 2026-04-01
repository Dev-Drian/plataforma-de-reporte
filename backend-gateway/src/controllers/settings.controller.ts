import { Request, Response } from 'express'
import { asyncHandler } from '../middlewares/error.middleware'
import { callFastAPIService } from '../services/fastapi.service'

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/settings/theme', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/settings/theme', {
    method: 'PUT',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

