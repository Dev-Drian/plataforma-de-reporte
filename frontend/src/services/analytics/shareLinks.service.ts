/**
 * Share Links Service
 * Gestiona los links públicos para compartir dashboards con clientes externos
 */
import api from "../config/api"
import { ApiResponse } from "../config/types"
import { handleApiError } from "../utils/errorHandler"

export interface ShareLinkConfig {
  show_cost?: boolean
  show_chart_types?: string[]
  date_range_days?: number
  allow_date_selection?: boolean
  brand_name?: string
  brand_logo_url?: string
  custom_colors?: Record<string, string>
}

export interface ShareLinkAccount {
  id: number
  platform: string
  account_type: string
  account_name: string
  is_active?: boolean
}

export interface ShareLink {
  id: number
  name: string
  token: string
  account_ids: number[]
  platforms?: string[]
  metrics?: string[]
  config?: ShareLinkConfig
  is_active: boolean
  has_password: boolean
  expires_at?: string
  last_accessed?: string
  access_count: number
  created_at: string
  share_url: string
  accounts: ShareLinkAccount[]
}

export interface CreateShareLinkRequest {
  name: string
  account_ids: number[]
  platforms?: string[]
  metrics?: string[]
  config?: ShareLinkConfig
  password?: string
  expires_in_days?: number
}

export interface UpdateShareLinkRequest {
  name?: string
  account_ids?: number[]
  platforms?: string[]
  metrics?: string[]
  config?: ShareLinkConfig
  password?: string
  expires_in_days?: number
  is_active?: boolean
}

export interface SharedDashboardInfo {
  name: string
  requires_password: boolean
  config: ShareLinkConfig
  platforms: string[]
  account_count: number
  accounts: Array<{
    platform: string
    account_type: string
    account_name: string
  }>
}

export interface SharedMetrics {
  totalClicks: number
  totalImpressions: number
  totalCost?: number
  totalConversions: number
  totalCTR: number
  totalCPC?: number
  totalCPM?: number
  totalCPA?: number
  platforms: Record<string, {
    platform: string
    clicks: number
    impressions: number
    cost?: number
    conversions: number
    ctr: number
    cpc: number
  }>
  startDate: string
  endDate: string
  dashboardName: string
  config: ShareLinkConfig
}

class ShareLinksService {
  /**
   * Lista todos los links de compartir del usuario
   */
  async getShareLinks(): Promise<ShareLink[]> {
    try {
      const response = await api.get<ApiResponse<ShareLink[]>>("/share-links")
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error getting share links")
    } catch (error: any) {
      console.error("Error getting share links:", error)
      handleApiError(error, "Error loading share links")
    }
  }

  /**
   * Obtiene un link de compartir por ID
   */
  async getShareLink(id: number): Promise<ShareLink> {
    try {
      const response = await api.get<ApiResponse<ShareLink>>(`/share-links/${id}`)
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error getting share link")
    } catch (error: any) {
      console.error("Error getting share link:", error)
      handleApiError(error, "Error loading share link")
    }
  }

  /**
   * Crea un nuevo link de compartir
   */
  async createShareLink(data: CreateShareLinkRequest): Promise<ShareLink> {
    try {
      const response = await api.post<ApiResponse<ShareLink>>("/share-links", data)
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error creating share link")
    } catch (error: any) {
      console.error("Error creating share link:", error)
      handleApiError(error, "Error creating share link")
    }
  }

  /**
   * Actualiza un link de compartir
   */
  async updateShareLink(id: number, data: UpdateShareLinkRequest): Promise<ShareLink> {
    try {
      const response = await api.put<ApiResponse<ShareLink>>(`/share-links/${id}`, data)
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error updating share link")
    } catch (error: any) {
      console.error("Error updating share link:", error)
      handleApiError(error, "Error updating share link")
    }
  }

  /**
   * Elimina un link de compartir
   */
  async deleteShareLink(id: number): Promise<void> {
    try {
      const response = await api.delete<ApiResponse<any>>(`/share-links/${id}`)
      if (!response.data.success) {
        throw new Error(response.data.message || "Error deleting share link")
      }
    } catch (error: any) {
      console.error("Error deleting share link:", error)
      handleApiError(error, "Error deleting share link")
    }
  }

  /**
   * Regenera el token de un link (invalida el anterior)
   */
  async regenerateToken(id: number): Promise<{ token: string; share_url: string }> {
    try {
      const response = await api.post<ApiResponse<{ id: number; token: string; share_url: string }>>(
        `/share-links/${id}/regenerate-token`
      )
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error regenerating token")
    } catch (error: any) {
      console.error("Error regenerating token:", error)
      handleApiError(error, "Error regenerating token")
    }
  }

  // === Métodos públicos (sin autenticación) ===

  /**
   * Obtiene información de un dashboard compartido
   */
  async getSharedDashboardInfo(token: string): Promise<SharedDashboardInfo> {
    try {
      const response = await api.get<ApiResponse<SharedDashboardInfo>>(
        `/public/dashboard/${token}`
      )
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Dashboard not found")
    } catch (error: any) {
      console.error("Error getting shared dashboard info:", error)
      throw error
    }
  }

  /**
   * Verifica la contraseña de un dashboard protegido
   */
  async verifyPassword(token: string, password: string): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<{ verified: boolean }>>(
        `/public/dashboard/${token}/verify`,
        { password }
      )
      return response.data.success && response.data.data?.verified === true
    } catch (error: any) {
      console.error("Error verifying password:", error)
      return false
    }
  }

  /**
   * Obtiene las métricas de un dashboard compartido
   */
  async getSharedMetrics(
    token: string,
    startDate: string,
    endDate: string,
    password?: string
  ): Promise<SharedMetrics> {
    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (password) {
        params.append("password", password)
      }

      const response = await api.get<ApiResponse<SharedMetrics>>(
        `/public/dashboard/${token}/metrics`,
        { params }
      )
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error loading metrics")
    } catch (error: any) {
      console.error("Error getting shared metrics:", error)
      throw error
    }
  }

  /**
   * Obtiene las tendencias diarias de un dashboard compartido
   */
  async getSharedTrends(
    token: string,
    startDate: string,
    endDate: string
  ): Promise<{ trends: Array<{
    date: string
    impressions: number
    clicks: number
    cost: number | null
    conversions: number
    ctr: number
    cpc: number | null
    roas: number | null
  }> }> {
    try {
      const params = new URLSearchParams({ startDate, endDate })
      
      const response = await api.get<ApiResponse<{ trends: Array<{
        date: string
        impressions: number
        clicks: number
        cost: number | null
        conversions: number
        ctr: number
        cpc: number | null
        roas: number | null
      }> }>>(
        `/public/dashboard/${token}/trends`,
        { params }
      )
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      throw new Error(response.data.message || "Error loading trends")
    } catch (error: any) {
      console.error("Error getting shared trends:", error)
      throw error
    }
  }
}

export const shareLinksService = new ShareLinksService()
export default shareLinksService
