import api from '../config/api'
import { ApiResponse } from '../config/types'

export interface AdsMetrics {
  clicks: number
  impressions: number
  cost: number
  conversions: number
  cpc: number
  ctr: number
  roas: number
  start_date: string
  end_date: string
  customer_id?: string
}

export interface AdsCampaign {
  campaign_id: number
  campaign_name: string
  status: string
  advertising_channel_type: string
  start_date: string
  end_date: string | null
  clicks: number
  impressions: number
  cost: number
  conversions: number
}

export interface AdsTrend {
  date: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
  ctr: number
  cpc: number
}

export interface AdsAccountInfo {
  customer_id: string
  descriptive_name: string
  currency_code: string
  time_zone: string
  is_manager: boolean
}

export interface AdsCustomerAccount {
  customer_id: string
  descriptive_name: string
  currency_code: string
  time_zone: string
  is_manager: boolean
}


class AdsService {
  async getAccountInfo(
    accountId?: number,
    customerId?: string,
    platform: string = 'google'
  ): Promise<AdsAccountInfo> {
    const params: Record<string, any> = { platform }
    if (accountId) params.accountId = accountId
    if (customerId) params.customerId = customerId

    const response = await api.get<ApiResponse<AdsAccountInfo>>('/ads/account-info', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting account information')
  }

  async getCustomerAccounts(
    accountId?: number,
    managerCustomerId?: string,
    platform: string = 'google'
  ): Promise<AdsCustomerAccount[]> {
    const params: Record<string, any> = { platform }
    if (accountId) params.accountId = accountId
    if (managerCustomerId) params.managerCustomerId = managerCustomerId

    const response = await api.get<ApiResponse<AdsCustomerAccount[]>>('/ads/customers', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting customer accounts')
  }

  async getMetrics(
    startDate: string, 
    endDate: string,
    accountId?: number,
    customerId?: string,
    platform: string = 'google',
    customerIds?: string  // Multiple IDs separated by comma
  ): Promise<AdsMetrics> {
    const params: Record<string, any> = { startDate, endDate, platform }
    if (accountId) params.accountId = accountId
    if (customerIds) {
      params.customerIds = customerIds  // Priority: if customerIds exist, use those
    } else if (customerId) {
      params.customerId = customerId
    }

    const response = await api.get<ApiResponse<AdsMetrics>>('/ads/metrics', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting Ads metrics')
  }

  async getCampaigns(
    accountId?: number,
    customerId?: string,
    platform: string = 'google',
    customerIds?: string
  ): Promise<AdsCampaign[]> {
    const params: Record<string, any> = { platform }
    if (accountId) params.accountId = accountId
    if (customerIds) {
      params.customerIds = customerIds
    } else if (customerId) {
      params.customerId = customerId
    }

    const response = await api.get<ApiResponse<AdsCampaign[]>>('/ads/campaigns', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting campaigns')
  }

  async getTrends(
    startDate: string,
    endDate: string,
    accountId?: number,
    customerId?: string,
    platform: string = 'google',
    customerIds?: string
  ): Promise<AdsTrend[]> {
    const params: Record<string, any> = { startDate, endDate, platform }
    if (accountId) params.accountId = accountId
    if (customerIds) {
      params.customerIds = customerIds
    } else if (customerId) {
      params.customerId = customerId
    }

    const response = await api.get<ApiResponse<AdsTrend[]>>('/ads/trends', { params })
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    
    throw new Error(response.data.message || 'Error getting trends')
  }
}

export const adsService = new AdsService()



