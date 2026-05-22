import { useState, useEffect, useCallback } from 'react'
import { format, subDays } from 'date-fns'
import { seoService, SEOMetrics } from '../services/analytics'
import { analyticsService, AnalyticsMetrics } from '../services/analytics'
import { adsService, AdsMetrics } from '../services/analytics'

interface DateRange {
  start: Date
  end: Date
}

export const useMetrics = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date()
  })
  const [seoMetrics, setSeoMetrics] = useState<SEOMetrics | null>(null)
  const [analyticsMetrics, setAnalyticsMetrics] = useState<AnalyticsMetrics | null>(null)
  const [adsMetrics, setAdsMetrics] = useState<AdsMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

  const fetchAllMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)

      const [seo, analytics, ads] = await Promise.allSettled([
        seoService.getMetrics(startDate, endDate),
        analyticsService.getMetrics(startDate, endDate),
        adsService.getMetrics(startDate, endDate)
      ])

      if (seo.status === 'fulfilled') {
        setSeoMetrics(seo.value)
      }

      if (analytics.status === 'fulfilled') {
        setAnalyticsMetrics(analytics.value)
      }

      if (ads.status === 'fulfilled') {
        setAdsMetrics(ads.value)
      }

      // If all failed, show error
      if (seo.status === 'rejected' && analytics.status === 'rejected' && ads.status === 'rejected') {
        setError('Error loading metrics')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading metrics')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchAllMetrics()
  }, [fetchAllMetrics])

  return {
    dateRange,
    setDateRange,
    seoMetrics,
    analyticsMetrics,
    adsMetrics,
    loading,
    error,
    refetch: fetchAllMetrics
  }
}

