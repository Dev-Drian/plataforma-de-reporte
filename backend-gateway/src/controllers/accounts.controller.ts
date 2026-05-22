import { Request, Response } from 'express'
import { callFastAPIService } from '../services/fastapi.service'
import { asyncHandler } from '../middlewares/error.middleware'

export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const { include_deleted } = req.query
  
  const response = await callFastAPIService('/accounts', {
    method: 'GET',
    params: {
      include_deleted
    },
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/accounts/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService('/accounts', {
    method: 'POST',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  res.status(201).json(response.data)
})

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/accounts/${id}`, {
    method: 'PUT',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })
  res.json(response.data)
})

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { hard_delete } = req.query
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  
  const response = await callFastAPIService(`/accounts/${id}`, {
    method: 'DELETE',
    params: {
      hard_delete
    },
    headers: {
      'Authorization': authHeader
    }
  })
  // Si el backend retorna contenido (soft delete), reenviarlo; si es 204 (hard delete), respetar el 204
  if (response.status === 204) {
    return res.sendStatus(204)
  }
  return res.status(response.status).json(response.data)
})

export const toggleAccountStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const response = await callFastAPIService(`/accounts/${id}/toggle-status`, {
    method: 'PATCH',
    headers: {
      'Authorization': authHeader
    }
  })

  res.json(response.data)
})

export const restoreAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const response = await callFastAPIService(`/accounts/${id}/restore`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader
    }
  })

  res.json(response.data)
})

export const batchToggleAccountStatus = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const response = await callFastAPIService('/accounts/batch/toggle-status', {
    method: 'POST',
    data: req.body,
    headers: {
      'Authorization': authHeader
    }
  })

  res.json(response.data)
})




