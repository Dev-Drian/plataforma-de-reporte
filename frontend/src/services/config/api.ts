import axios from 'axios'
import { useStore } from '../../store/useStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove invalid token only if we're not on the login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token')
        const store = useStore.getState()
        store.logout()
        // ProtectedRoute will handle the redirect
      }
    }
    return Promise.reject(error)
  }
)

export default api





