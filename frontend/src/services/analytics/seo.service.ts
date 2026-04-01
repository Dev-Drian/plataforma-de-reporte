import api from '../config/api'
import { ApiResponse } from '../config/types'
import { handleApiError } from '../utils/errorHandler'

export interface SEOMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  start_date: string
  end_date: string
  property_uri?: string
}

export interface SEOQuery {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEOPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEOTrend {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEODevice {
  device: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEOCountry {
  country: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SEOProperty {
  property_uri: string
  permission_level: string
}

export interface SEORankings {
  keyword: string
  position: number
  city?: string
  date: string
}


class SEOService {

  async getMetrics(
    startDate: string, 
    endDate: string,
    accountId?: number,
    propertyUri?: string,
    platform: string = "google",
    forceRefresh: boolean = false
  ): Promise<SEOMetrics> {
    try {
      const params: Record<string, any> = { startDate, endDate, platform }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri
      if (forceRefresh) params.forceRefresh = true

      const response = await api.get<ApiResponse<SEOMetrics>>('/seo/metrics', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting SEO metrics')
    } catch (error: any) {
      handleApiError(error, `Error getting SEO metrics from ${platform}. Please check your account configuration in Settings > Accounts.`)
    }
  }

  async getQueries(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyUri?: string,
    limit: number = 100
  ): Promise<SEOQuery[]> {
    try {
      const params: Record<string, any> = { startDate, endDate, limit }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri

      const response = await api.get<ApiResponse<SEOQuery[]>>('/seo/queries', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting queries')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO queries. Please check your Search Console account and date range.')
    }
  }

  async getPages(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyUri?: string,
    limit: number = 100
  ): Promise<SEOPage[]> {
    try {
      const params: Record<string, any> = { startDate, endDate, limit }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri

      const response = await api.get<ApiResponse<SEOPage[]>>('/seo/pages', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting pages')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO pages. Please check your Search Console account and date range.')
    }
  }

  async getTrends(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyUri?: string
  ): Promise<SEOTrend[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri

      const response = await api.get<ApiResponse<SEOTrend[]>>('/seo/trends', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting trends')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO trends. Please check your Search Console account and date range.')
    }
  }

  async getDevices(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyUri?: string
  ): Promise<SEODevice[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri

      const response = await api.get<ApiResponse<SEODevice[]>>('/seo/devices', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting device breakdown')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO device breakdown. Please check your Search Console account and date range.')
    }
  }

  async getCountries(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyUri?: string
  ): Promise<SEOCountry[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyUri) params.propertyUri = propertyUri

      const response = await api.get<ApiResponse<SEOCountry[]>>('/seo/countries', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting country breakdown')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO country breakdown. Please check your Search Console account and date range.')
    }
  }

  async getProperties(accountId?: number): Promise<SEOProperty[]> {
    try {
      const params: Record<string, any> = {}
      if (accountId) params.accountId = accountId

      const response = await api.get<ApiResponse<SEOProperty[]>>('/seo/properties', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting properties')
    } catch (error: any) {
      handleApiError(error, 'Error getting Search Console properties. Please check your account configuration in Settings > Accounts.')
    }
  }

  async getRankings(keywords?: string[], city?: string): Promise<SEORankings[]> {
    try {
      const params: Record<string, string> = {}
      if (keywords && keywords.length > 0) {
        params.keywords = keywords.join(',')
      }
      if (city) {
        params.city = city
      }

      const response = await api.get<ApiResponse<SEORankings[]>>('/seo/rankings', { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || 'Error getting rankings')
    } catch (error: any) {
      handleApiError(error, 'Error getting SEO rankings. Please check your keywords and configuration.')
    }
  }
}

export const seoService = new SEOService()





