import api from '../config/api'
import { ApiResponse } from '../config/types'

export interface OAuthConfig {
  id: number
  organization_id: number
  platform: string
  client_id: string
  client_secret: string
  redirect_uri: string | null
  scopes: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OAuthConfigCreate {
  platform: string
  client_id: string
  client_secret: string
  redirect_uri?: string
  scopes?: string[]
}

export interface OAuthInitRequest {
  platform: string
  account_type: string
}

export interface OAuthInitResponse {
  auth_url: string
  state: string
}

export interface OAuthCallbackRequest {
  platform: string
  code?: string  // Opcional si hay tokens guardados en cache
  state: string
  account_type: string
  account_id?: string
  account_name?: string
  selected_customer_id?: string
  selected_customer_ids?: string[]
}

export interface OAuthCallbackResponse {
  account_id?: number
  account_name?: string
  platform: string
  account_type: string
  message: string
  requires_selection?: boolean
  available_accounts?: Array<{
    customer_id: string
    customer_id_raw: string
    descriptive_name: string
    is_mcc: boolean
  }>
  accounts?: Array<{
    account_id: number
    account_name: string
    platform: string
    account_type: string
    is_mcc: boolean
    parent_account_id: number | null
  }>
}

export interface OAuthProviderField {
  type: 'text' | 'password' | 'url' | 'textarea' | 'hidden'
  label: string
  required: boolean
  placeholder?: string
  helper_text?: string
  default_value?: string
}

export interface OAuthProvider {
  id: number
  name: string
  display_name: string
  icon?: string
  color?: string
  required_fields: Record<string, OAuthProviderField>
  is_active: boolean
  created_at: string
  updated_at: string
}

class OAuthService {
  async getConfigs(): Promise<OAuthConfig[]> {
    const response = await api.get<ApiResponse<OAuthConfig[]>>('/oauth/configs')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting OAuth configurations')
  }

  async getConfig(platform: string): Promise<OAuthConfig> {
    const response = await api.get<ApiResponse<OAuthConfig>>(`/oauth/configs/${platform}`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting OAuth configuration')
  }

  async createConfig(data: OAuthConfigCreate): Promise<OAuthConfig> {
    try {
      const response = await api.post<ApiResponse<OAuthConfig>>('/oauth/configs', data)
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error al crear configuración OAuth')
    } catch (error: any) {
      // Si es un error 409 (Conflict), lanzar un error especial con el código
      const status = error.response?.status || error.response?.statusCode || error.statusCode || error.status
      
      if (status === 409) {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message ||
                            'A configuration already exists for this platform'
        
        // Crear un error que mantenga todas las propiedades de axios
        const customError: any = new Error(errorMessage)
        customError.statusCode = 409
        customError.status = 409
        customError.platform = data.platform
        // Mantener la respuesta completa de axios
        customError.response = error.response
        customError.isAxiosError = error.isAxiosError
        // Mantener el error original
        customError.originalError = error
        
        throw customError
      }
      throw error
    }
  }

  async updateConfig(platform: string, data: Partial<OAuthConfigCreate>): Promise<OAuthConfig> {
    const response = await api.put<ApiResponse<OAuthConfig>>(`/oauth/configs/${platform}`, data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error updating OAuth configuration')
  }

  async initOAuthFlow(data: OAuthInitRequest): Promise<OAuthInitResponse> {
    const response = await api.post<ApiResponse<OAuthInitResponse>>('/oauth/init', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error initiating OAuth flow')
  }

  async handleCallback(data: OAuthCallbackRequest): Promise<OAuthCallbackResponse> {
    const response = await api.post<ApiResponse<OAuthCallbackResponse>>('/oauth/callback', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error al procesar callback OAuth')
  }

  async getProviders(): Promise<OAuthProvider[]> {
    const response = await api.get<ApiResponse<OAuthProvider[]>>('/oauth/providers')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting OAuth providers')
  }

  async getProvider(providerName: string): Promise<OAuthProvider> {
    const response = await api.get<ApiResponse<OAuthProvider>>(`/oauth/providers/${providerName}`)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting OAuth provider')
  }
}

export const oauthService = new OAuthService()



