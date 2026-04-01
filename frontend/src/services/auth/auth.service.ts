import api from '../config/api'
import { ApiResponse } from '../config/types'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
  organization_name?: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    email: string
    first_name: string | null
    last_name: string | null
    organization_id: number
    organization_name: string | null
    roles: string[]
    is_active: boolean
    is_verified: boolean
  }
}


class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error signing in')
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error registering user')
  }

  async getProfile(): Promise<AuthResponse['user']> {
    const response = await api.get<ApiResponse<AuthResponse['user']>>('/auth/profile')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting profile')
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore errors on logout
      console.error('Error on logout:', error)
    }
  }
}

export const authService = new AuthService()





