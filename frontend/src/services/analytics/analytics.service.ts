import api from "../config/api"
import { ApiResponse } from "../config/types"
import { handleApiError } from "../utils/errorHandler"

export interface AnalyticsMetrics {
  users: number
  sessions: number
  pageviews: number
  bounce_rate: number
  avg_session_duration: number
  new_users?: number
  engaged_sessions?: number
  start_date: string
  end_date: string
}

export interface AnalyticsProperty {
  property_id: string
  property_name: string
  property_path: string
  account_name: string
  account_path: string
}

export interface UsersTrendItem {
  date: string
  users: number
  sessions: number
  newUsers?: number
}

export interface TrafficSource {
  name: string
  value: number
  sessions?: number
}

export interface DeviceBreakdown {
  device: string
  sessions: number
}

export interface TopPage {
  page: string
  pageviews: number
  uniqueUsers: number
  avgTime: number
}

export interface TopCountry {
  country: string
  sessions: number
}

class AnalyticsService {
  async getProperties(accountId: number): Promise<AnalyticsProperty[]> {
    try {
      const response = await api.get<ApiResponse<AnalyticsProperty[]>>("/analytics/properties", {
        params: { accountId },
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting properties:", error)
      return []
    }
  }

  async getMetrics(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string
  ): Promise<AnalyticsMetrics> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<AnalyticsMetrics>>("/analytics/metrics", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      throw new Error(response.data.message || "Error getting Analytics metrics")
    } catch (error: any) {
      handleApiError(error, "Error getting Analytics metrics. Please check your Google Analytics account configuration in Settings > Accounts.")
    }
  }

  async getUsersTrend(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string
  ): Promise<UsersTrendItem[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<UsersTrendItem[]>>("/analytics/trend", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting users trend:", error)
      return []
    }
  }

  async getTrafficSources(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string
  ): Promise<TrafficSource[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<TrafficSource[]>>("/analytics/traffic-sources", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting traffic sources:", error)
      return []
    }
  }

  async getDeviceBreakdown(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string
  ): Promise<DeviceBreakdown[]> {
    try {
      const params: Record<string, any> = { startDate, endDate }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<DeviceBreakdown[]>>("/analytics/devices", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting device breakdown:", error)
      return []
    }
  }

  async getTopPages(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string,
    limit: number = 10
  ): Promise<TopPage[]> {
    try {
      const params: Record<string, any> = { startDate, endDate, limit }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<TopPage[]>>("/analytics/top-pages", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting top pages:", error)
      return []
    }
  }

  async getTopCountries(
    startDate: string,
    endDate: string,
    accountId?: number,
    propertyId?: string,
    limit: number = 10
  ): Promise<TopCountry[]> {
    try {
      const params: Record<string, any> = { startDate, endDate, limit }
      if (accountId) params.accountId = accountId
      if (propertyId) params.propertyId = propertyId

      const response = await api.get<ApiResponse<TopCountry[]>>("/analytics/top-countries", {
        params,
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      return []
    } catch (error: any) {
      console.error("Error getting top countries:", error)
      return []
    }
  }
}

export const analyticsService = new AnalyticsService()
