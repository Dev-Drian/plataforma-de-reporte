import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { authService, LoginRequest, RegisterRequest } from '../services/auth'

export const useAuth = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setUser, setToken, logout: storeLogout } = useStore()
  const navigate = useNavigate()

  const login = useCallback(async (credentials: LoginRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await authService.login(credentials)
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      navigate('/', { replace: true })
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Error al iniciar sesión'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setUser, setToken, navigate])

  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await authService.register(data)
      localStorage.setItem('token', response.token)
      setToken(response.token)
      setUser(response.user)
      navigate('/', { replace: true })
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Error al registrar usuario'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setUser, setToken, navigate])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (err) {
      console.error('Error en logout:', err)
    } finally {
      localStorage.removeItem('token')
      storeLogout()
      navigate('/login', { replace: true })
    }
  }, [storeLogout, navigate])

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      return false
    }

    try {
      const user = await authService.getProfile()
      setUser(user)
      setToken(token)
      return true
    } catch (err) {
      localStorage.removeItem('token')
      storeLogout()
      return false
    }
  }, [setUser, setToken, storeLogout])

  return {
    login,
    register,
    logout,
    checkAuth,
    loading,
    error,
    clearError: () => setError(null)
  }
}

