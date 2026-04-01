/**
 * Global Dashboard Service
 * Aggregates metrics from all platforms (Google Ads, Meta, LinkedIn, TikTok, SEO)
 */

import api from "../config/api"
import { ApiResponse } from "../config/types"
import { handleApiError } from "../utils/errorHandler"

export interface DashboardMetrics {
  // Aggregated metrics from all platforms
  totalClicks: number
  totalImpressions: number
  totalCost: number
  totalConversions: number
  totalRevenue: number
  
  // Calculated KPIs
  totalCTR: number
  totalCPC: number
  totalCPM: number
  totalROAS: number
  totalCPA: number
  
  // Metrics by platform
  platforms: {
    google?: PlatformMetrics
    meta?: PlatformMetrics
    linkedin?: PlatformMetrics
    tiktok?: PlatformMetrics
    seo?: DashboardSEOMetrics
  }
  
  // Aggregated trends
  trends: TrendDataPoint[]
  
  // Period
  startDate: string
  endDate: string
  previousPeriod?: DashboardMetrics
}

export interface PlatformMetrics {
  platform: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
  revenue?: number
  ctr: number
  cpc: number
  cpm: number
  roas?: number
  cpa: number
}

export interface DashboardSEOMetrics {
  clicks: number
  impressions: number
  ctr: number
  averagePosition: number
}

export interface TrendDataPoint {
  date: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
}

class DashboardService {
  /**
   * Gets aggregated metrics from all platforms
   */
  async getGlobalMetrics(
    startDate: string,
    endDate: string,
    accountIds?: number[]
  ): Promise<DashboardMetrics> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })
      
      if (accountIds && accountIds.length > 0) {
        params.append("accountIds", accountIds.join(","))
      }
      
      const response = await api.get<ApiResponse<DashboardMetrics>>("/dashboard/metrics", { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || "Error getting global metrics")
    } catch (error: any) {
      console.error("Error getting global metrics:", error)
      handleApiError(error, "Error loading dashboard metrics. Please check your connected accounts and date range.")
    }
  }

  /**
   * Gets aggregated trends from all platforms
   */
  async getGlobalTrends(
    startDate: string,
    endDate: string,
    accountIds?: number[]
  ): Promise<TrendDataPoint[]> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })
      
      if (accountIds && accountIds.length > 0) {
        params.append("accountIds", accountIds.join(","))
      }
      
      const response = await api.get<ApiResponse<TrendDataPoint[]>>("/dashboard/trends", { params })
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      throw new Error(response.data.message || "Error getting global trends")
    } catch (error: any) {
      console.error("Error getting global trends:", error)
      handleApiError(error, "Error loading dashboard trends. Please check your connected accounts and date range.")
    }
  }

  /**
   * Gets the cache update status
   */
  async getCacheStatus(): Promise<{
    lastUpdated: string | null
    nextUpdate: string | null
    isUpdating: boolean
  }> {
    try {
      const response = await api.get<ApiResponse<{
        lastUpdated: string | null
        nextUpdate: string | null
        isUpdating: boolean
      }>>("/dashboard/cache-status")
      
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      
      return {
        lastUpdated: null,
        nextUpdate: null,
        isUpdating: false,
      }
    } catch (error: any) {
      console.error("Error getting cache status:", error)
      return {
        lastUpdated: null,
        nextUpdate: null,
        isUpdating: false,
      }
    }
  }

  /**
   * Forces a data update (invalidates cache)
   */
  async forceRefresh(accountIds?: number[]): Promise<void> {
    try {
      const params = new URLSearchParams()
      if (accountIds && accountIds.length > 0) {
        params.append("accountIds", accountIds.join(","))
      }
      
      await api.post("/dashboard/refresh", null, { params })
    } catch (error: any) {
      console.error("Error forcing update:", error)
      handleApiError(error, "Error refreshing dashboard data. Please try again later.")
    }
  }
}

export const dashboardService = new DashboardService()

