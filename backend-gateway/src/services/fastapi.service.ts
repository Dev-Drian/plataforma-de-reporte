import axios from 'axios'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000'

export const callFastAPIService = async (
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    params?: any
    data?: any
    headers?: Record<string, string>
  } = {}
) => {
  const { method = 'GET', params, data, headers = {} } = options

  try {
    const response = await axios({
      method,
      url: `${FASTAPI_BASE_URL}${endpoint}`,
      params,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000, // 30 seconds timeout
    })

    return response
  } catch (error: any) {
    console.error(`Error calling FastAPI service: ${endpoint}`, {
      message: error.message,
      code: error.code,
      address: error.address,
      port: error.port,
    })
    
    // Error de conexión (servicio no disponible)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const connectionError = new Error(
        `Backend service unavailable. Please try again later.`
      )
      ;(connectionError as any).statusCode = 503
      ;(connectionError as any).isConnectionError = true
      throw connectionError
    }
    
    // Error de respuesta de la API
    if (error.response) {
      const apiError = new Error(
        error.response.data?.message || 
        error.response.data?.detail || 
        error.message
      )
      ;(apiError as any).statusCode = error.response.status
      ;(apiError as any).responseData = error.response.data
      throw apiError
    }
    
    // Error desconocido
    const unknownError = new Error('Internal server error')
    ;(unknownError as any).statusCode = 500
    throw unknownError
  }
}

