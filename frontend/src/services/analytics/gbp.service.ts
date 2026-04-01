import api from '../config/api'
import { ApiResponse } from '../config/types'

export interface GBPLocation {
  location_id: string
  location_name: string
  location_path: string
  account_name: string
  account_path: string
  address?: string[]
}

export interface GBPMetrics {
  views_search: number
  views_maps: number
  total_views: number
  actions_website: number
  actions_directions: number
  actions_phone: number
  total_actions: number
  total_reviews: number
  average_rating: number
  new_reviews: number
  start_date: string
  end_date: string
  location_id?: string
}

class GBPService {
  async getLocations(accountId?: number): Promise<GBPLocation[]> {
    const params: any = {}
    if (accountId) {
      params.accountId = accountId
    }
    
    const response = await api.get<ApiResponse<GBPLocation[]>>('/gbp/locations', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting GBP locations')
  }

  async getMetrics(
    startDate: string, 
    endDate: string, 
    accountId?: number,
    locationId?: string
  ): Promise<GBPMetrics> {
    const params: any = { startDate, endDate }
    if (accountId) {
      params.accountId = accountId
    }
    if (locationId) {
      params.locationId = locationId
    }
    
    const response = await api.get<ApiResponse<GBPMetrics>>('/gbp/metrics', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting GBP metrics')
  }
}

export const gbpService = new GBPService()
