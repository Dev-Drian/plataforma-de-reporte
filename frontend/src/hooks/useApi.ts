import { useState, useCallback } from 'react'

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export const useApi = <T, P = void>(
  apiFunction: (params: P) => Promise<T>,
  options?: UseApiOptions<T>
) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (params: P) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiFunction(params)
      setData(result)
      options?.onSuccess?.(result)
      return result
    } catch (err: any) {
      // Mantener el error original con todas sus propiedades
      // Si ya es un Error, usarlo directamente, si no, crear uno nuevo
      let error: any
      if (err instanceof Error) {
        error = err
        // Asegurar que todas las propiedades del error original se mantengan
        if (err && typeof err === 'object') {
          Object.keys(err).forEach(key => {
            if (!(key in error)) {
              (error as any)[key] = (err as any)[key]
            }
          })
        }
      } else {
        error = new Error(err?.message || 'Unknown error')
        // Copiar todas las propiedades del error original
        if (err && typeof err === 'object') {
          Object.assign(error, err)
        }
      }
      
      // Asegurar que response se mantenga si existe
      if (err?.response) {
        error.response = err.response
      }
      
      setError(error)
      options?.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [apiFunction, options])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    reset
  }
}

