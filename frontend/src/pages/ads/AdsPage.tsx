"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format, subDays } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import Alert from "../../components/common/Alert"
import PageHeader from "../../components/common/PageHeader"
import {
  adsService,
  type AdsMetrics,
  type AdsTrend,
  type AdsAccountInfo,
  type AdsCustomerAccount,
} from "../../services/analytics"
import { accountsService, type Account } from "../../services/accounts"
import { useTheme } from "../../contexts/ThemeContext"

interface DateRange {
  start: Date
  end: Date
}

export default function AdsPage() {
  const { colors } = useTheme()
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]) // Multiple selected accounts
  const [selectedPlatform, setSelectedPlatform] = useState<string>("google")

  const [accounts, setAccounts] = useState<Account[]>([])
  const [allAdsAccounts, setAllAdsAccounts] = useState<Account[]>([]) // All ads accounts from all platforms
  const [accountInfo, setAccountInfo] = useState<AdsAccountInfo | null>(null)
  const [customerAccounts, setCustomerAccounts] = useState<AdsCustomerAccount[]>([])
  const [metrics, setMetrics] = useState<AdsMetrics | null>(null)
  const [trends, setTrends] = useState<AdsTrend[]>([])
  const [previousMetrics, setPreviousMetrics] = useState<AdsMetrics | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingAccountInfo, setLoadingAccountInfo] = useState(false)
  const [quickDays, setQuickDays] = useState<number | null>(30)

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")
  
  // Formatear números para mostrar
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return "0"
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }
  
  const formatCurrency = (num: number | undefined | null): string => {
    const value = num ?? 0
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: accountInfo?.currency_code || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  
  const formatPercent = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return "0.00%"
    return `${num.toFixed(2)}%`
  }

  // Load Ads accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true)
        setError(null) // Clear previous errors
        const allAccounts = await accountsService.getAccounts()
        // Save all ads accounts (from all platforms)
        const allAdsAccountsFiltered = allAccounts.filter(
          (acc) => acc.account_type === "ads" && acc.is_active,
        )
        setAllAdsAccounts(allAdsAccountsFiltered)
        
        // Filter accounts from selected platform
        const adsAccounts = allAdsAccountsFiltered.filter(
          (acc) => acc.platform === selectedPlatform,
        )
        setAccounts(adsAccounts)

        if (adsAccounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(adsAccounts[0].id)
        } else if (adsAccounts.length === 0) {
          // No accounts for this platform
          setSelectedAccountId(null)
          setSelectedCustomerId(null)
          setMetrics(null)
          setTrends([])
          setAccountInfo(null)
        }
      } catch (err: any) {
        toast.error("Error loading accounts: " + (err.message || "Unknown error"))
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [selectedPlatform])

  // Load account information and detect if it's MCC (Google only)
  useEffect(() => {
    const loadAccountInfo = async () => {
      if (!selectedAccountId || !selectedPlatform) return

      const account = accounts.find((acc) => acc.id === selectedAccountId)
      if (!account) return

      // For non-Google platforms, use account_id directly
      if (selectedPlatform !== "google") {
        setSelectedCustomerId(account.account_id)
        setAccountInfo(null)
        setCustomerAccounts([])
        setSelectedCustomerIds([])
        return
      }

      // For Google, check if it's MCC
      setLoadingAccountInfo(true)
      try {
        const info = await adsService.getAccountInfo(selectedAccountId, account.account_id, selectedPlatform)
        setAccountInfo(info)

        // If it's MCC, load customer accounts list
        if (info.is_manager) {
          const customers = await adsService.getCustomerAccounts(
            selectedAccountId,
            account.account_id,
            selectedPlatform,
          )
          setCustomerAccounts(customers)
          setSelectedCustomerIds([])
          setSelectedCustomerId(null)
        } else {
          // Not MCC, use account's customer_id directly
          setSelectedCustomerId(account.account_id)
          setSelectedCustomerIds([])
          setCustomerAccounts([])
        }
      } catch (err: any) {
        console.error("Error loading account information:", err)
        // If it fails, use account_id directly
        setSelectedCustomerId(account.account_id)
        setAccountInfo(null)
      } finally {
        setLoadingAccountInfo(false)
      }
    }

    if (selectedAccountId && accounts.length > 0) {
      loadAccountInfo()
    } else if (!selectedAccountId) {
      // Clear state if no account is selected
      setAccountInfo(null)
      setCustomerAccounts([])
      setSelectedCustomerId(null)
      setSelectedCustomerIds([])
    }
  }, [selectedAccountId, accounts, selectedPlatform])

  // Load all data
  const loadData = useCallback(async () => {
    // If it's MCC and there are multiple accounts selected, use customerIds
    // Otherwise, use selectedCustomerId (original behavior)
    const customerIdToUse =
      accountInfo?.is_manager && selectedCustomerIds.length > 0
        ? null // Use customerIds instead of customerId
        : selectedCustomerId

    if (!selectedAccountId || (!customerIdToUse && (!accountInfo?.is_manager || selectedCustomerIds.length === 0))) {
      setError("Please select an account and at least one customer ID")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)
      
      // Calculate previous period for comparison
      const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      const previousStartDate = formatDate(subDays(dateRange.start, daysDiff))
      const previousEndDate = formatDate(subDays(dateRange.end, daysDiff))

      // If there are multiple accounts selected, use customerIds
      const customerIdsParam =
        accountInfo?.is_manager && selectedCustomerIds.length > 0 ? selectedCustomerIds.join(",") : undefined

      const [metricsData, previousMetricsData, trendsData] = await Promise.allSettled([
        adsService.getMetrics(
          startDate,
          endDate,
          selectedAccountId,
          customerIdToUse || undefined,
          selectedPlatform,
          customerIdsParam,
        ),
        adsService.getMetrics(
          previousStartDate,
          previousEndDate,
          selectedAccountId,
          customerIdToUse || undefined,
          selectedPlatform,
          customerIdsParam,
        ),
        adsService.getTrends(
          startDate,
          endDate,
          selectedAccountId,
          customerIdToUse || undefined,
          selectedPlatform,
          customerIdsParam,
        ),
      ])

      // Recolectar errores para mostrar UN solo toast
      const errors: string[] = []

      if (metricsData.status === "fulfilled") {
        setMetrics(metricsData.value)
      } else {
        const errorMsg = metricsData.reason?.message || "Error loading metrics"
        console.error("Error loading Ads metrics:", metricsData.reason)
        errors.push(errorMsg)
      }

      if (previousMetricsData.status === "fulfilled") {
        setPreviousMetrics(previousMetricsData.value)
      } else if (previousMetricsData.status === "rejected") {
        // No es crítico si falla el período anterior, solo no mostraremos comparación
        console.warn("Could not load previous period metrics:", previousMetricsData.reason)
      }

      if (trendsData.status === "fulfilled") {
        setTrends(trendsData.value)
      } else {
        // If it fails (e.g., platform doesn't support trends), set as empty array
        // Not a critical error, just won't show the chart
        setTrends([])
        const errorMsg = trendsData.reason?.message || ""
        // Only log if it's not the "not supported" error
        if (errorMsg && !errorMsg.includes("not supported") && !errorMsg.includes("no soportada")) {
          console.warn("Error loading trends:", errorMsg)
        }
      }

      // Solo mostrar UN error si hay errores críticos (metrics es el más importante)
      if (errors.length > 0) {
        const mainError = errors[0]
        setError(mainError)
        toast.error(mainError)
      } else {
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedAccountId, selectedCustomerId, selectedPlatform, accountInfo, selectedCustomerIds])

  useEffect(() => {
    // Only load data if:
    // 1. There's a selected account
    // 2. For Google MCC: at least one customerId selected
    // 3. For other platforms or Google non-MCC: selectedCustomerId is defined
    const shouldLoad = selectedAccountId && (
      selectedCustomerId || 
      (selectedPlatform === "google" && accountInfo?.is_manager && selectedCustomerIds.length > 0)
    )
    
    if (shouldLoad) {
      loadData()
    }
  }, [loadData, selectedAccountId, selectedCustomerId, accountInfo, selectedCustomerIds, selectedPlatform, dateRange])
  
  // Update when quickDays changes
  useEffect(() => {
    if (quickDays !== null) {
      const newRange = {
        start: subDays(new Date(), quickDays),
        end: new Date(),
      }
      setDateRange(newRange)
    }
  }, [quickDays])
  
  // Calculate derived metrics and data for charts
  const calculatedMetrics = useMemo(() => {
    if (!metrics) return null
    
    // Validate that metrics have valid values
    const safeValue = (val: number | undefined | null): number => {
      if (val === undefined || val === null || isNaN(val)) return 0
      return val
    }
    
    const clicks = safeValue(metrics.clicks)
    const impressions = safeValue(metrics.impressions)
    const cost = safeValue(metrics.cost)
    const conversions = safeValue(metrics.conversions)
    const ctr = safeValue(metrics.ctr)
    const cpc = safeValue(metrics.cpc)
    const roas = safeValue(metrics.roas)
    
    const cpa = conversions > 0 ? cost / conversions : 0
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0
    
    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }
    
    const prevClicks = safeValue(previousMetrics?.clicks)
    const prevImpressions = safeValue(previousMetrics?.impressions)
    const prevCost = safeValue(previousMetrics?.cost)
    const prevConversions = safeValue(previousMetrics?.conversions)
    const prevCtr = safeValue(previousMetrics?.ctr)
    const prevCpc = safeValue(previousMetrics?.cpc)
    const prevRoas = safeValue(previousMetrics?.roas)
    
    const previousCpa = prevConversions > 0 ? prevCost / prevConversions : 0
    const previousCpm = prevImpressions > 0 ? (prevCost / prevImpressions) * 1000 : 0
    
    return {
      cpa,
      cpm,
      cpaChange: calculateChange(cpa, previousCpa),
      cpmChange: calculateChange(cpm, previousCpm),
      clicksChange: calculateChange(clicks, prevClicks),
      impressionsChange: calculateChange(impressions, prevImpressions),
      ctrChange: calculateChange(ctr, prevCtr),
      cpcChange: calculateChange(cpc, prevCpc),
      costChange: calculateChange(cost, prevCost),
      conversionsChange: calculateChange(conversions, prevConversions),
      roasChange: calculateChange(roas, prevRoas),
    }
  }, [metrics, previousMetrics])
  
  // Prepare trends data for charts
  const trendsData = useMemo(() => {
    if (!trends || trends.length === 0) return []
    return trends.map(t => ({
      date: format(new Date(t.date), "MMM dd"),
      fullDate: t.date,
      clicks: t.clicks,
      impressions: t.impressions,
      cost: t.cost,
      conversions: t.conversions,
      ctr: t.ctr,
      cpc: t.cpc,
      cpa: t.conversions > 0 ? t.cost / t.conversions : 0,
      cpm: t.impressions > 0 ? (t.cost / t.impressions) * 1000 : 0,
      roas: t.cost > 0 ? (t.conversions * 100) / t.cost : 0, // Simple approximation
    }))
  }, [trends])


  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  const platformNames: Record<string, string> = {
    google: "Google Ads",
    meta: "Meta Ads (Facebook)",
    linkedin: "LinkedIn Ads",
    tiktok: "TikTok Ads"
  }
  
  // Check if there are accounts from other platforms
  const availablePlatforms = Array.from(new Set(allAdsAccounts.map(acc => acc.platform)))
  const hasOtherPlatforms = availablePlatforms.length > 0 && !availablePlatforms.includes(selectedPlatform)
  // const _hasNoAccountsAtAll = allAdsAccounts.length === 0 // No usado actualmente

  return (
    <div className="p-4 space-y-4">
      {/* Reusable Header */}
      <PageHeader
        title="Advertising"
        subtitle="Essential performance KPIs"
        domainName={accountInfo?.descriptive_name || null}
        quickDays={quickDays}
        onQuickDaysChange={setQuickDays}
        onDateRangeChange={setDateRange}
      >
        <select
          value={selectedPlatform}
          onChange={(e) => {
            const newPlatform = e.target.value
            setSelectedPlatform(newPlatform)
            setSelectedAccountId(null)
            setSelectedCustomerId(null)
            setSelectedCustomerIds([])
            setAccountInfo(null)
            setCustomerAccounts([])
            setMetrics(null)
            setTrends([])
            setPreviousMetrics(null)
            setError(null)
          }}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="google">Google Ads</option>
          <option value="meta">Meta Ads</option>
          <option value="linkedin">LinkedIn Ads</option>
          <option value="tiktok">TikTok Ads</option>
        </select>

        <select
          value={selectedAccountId || ""}
          onChange={(e) => {
            setSelectedAccountId(Number(e.target.value))
            setSelectedCustomerId(null)
          }}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.account_name || acc.account_id}
            </option>
          ))}
        </select>

        {accountInfo?.is_manager && customerAccounts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary">Customer Accounts:</label>
            <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-1.5 bg-background text-xs">
              {customerAccounts.map((customer) => (
                <label
                  key={customer.customer_id}
                  className="flex items-center gap-1.5 p-1.5 hover:bg-background-secondary rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(customer.customer_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomerIds([...selectedCustomerIds, customer.customer_id])
                      } else {
                        setSelectedCustomerIds(selectedCustomerIds.filter((id) => id !== customer.customer_id))
                      }
                    }}
                    className="w-3.5 h-3.5 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-text text-xs">{customer.descriptive_name || customer.customer_id}</span>
                </label>
              ))}
            </div>
            {selectedCustomerIds.length > 0 && (
              <p className="text-[10px] text-text-secondary">{selectedCustomerIds.length} selected</p>
            )}
          </div>
        )}

        {!accountInfo?.is_manager && selectedAccountId && (
          <div className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-text-secondary flex items-center">
            ID: {selectedCustomerId || "..."}
          </div>
        )}
      </PageHeader>

      {/* Custom date range selector */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">From:</label>
            <input
              type="date"
              value={formatDate(dateRange.start)}
              max={formatDate(dateRange.end)}
              onChange={(e) => {
                const newStart = new Date(e.target.value)
                const newEnd = dateRange.end
                
                // Validar que la fecha de inicio no sea mayor a la de fin
                if (newStart > newEnd) {
                  toast.error("La fecha de inicio no puede ser mayor a la fecha de fin")
                  return
                }
                
                setQuickDays(null) // Disable quick selector when using custom
                setDateRange({ start: newStart, end: newEnd })
              }}
              className="px-2 py-1 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">To:</label>
            <input
              type="date"
              value={formatDate(dateRange.end)}
              min={formatDate(dateRange.start)}
              max={formatDate(new Date())}
              onChange={(e) => {
                const newEnd = new Date(e.target.value)
                const newStart = dateRange.start
                
                // Validar que la fecha de fin no sea menor a la de inicio
                if (newEnd < newStart) {
                  toast.error("La fecha de fin no puede ser menor a la fecha de inicio")
                  return
                }
                
                // Validar que no sea mayor a hoy
                if (newEnd > new Date()) {
                  toast.error("La fecha de fin no puede ser mayor a hoy")
                  return
                }
                
                setQuickDays(null) // Disable quick selector when using custom
                setDateRange({ start: newStart, end: newEnd })
              }}
              className="px-2 py-1 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </Card>

      {/* Show alert if there are no accounts */}
      {accounts.length === 0 && (
        <div className="p-6">
          {hasOtherPlatforms ? (
            <Alert
              type="info"
              title={`No ${platformNames[selectedPlatform] || selectedPlatform} accounts configured`}
              message={`You have ${availablePlatforms.map(p => platformNames[p] || p).join(", ")} accounts configured. Change the selected platform above to view your data.`}
            />
          ) : (
            <Alert
              type="info"
              title={`No ${platformNames[selectedPlatform] || selectedPlatform} accounts configured`}
              message={`Connect your ${platformNames[selectedPlatform] || selectedPlatform} account in Settings > OAuth to get started. ${selectedPlatform === 'meta' ? 'Make sure to grant all permissions, including read_insights.' : ''}`}
              action={{
                label: "Go to Settings",
                onClick: () => (window.location.href = "/settings"),
              }}
            />
          )}
        </div>
      )}

      {loadingAccountInfo && (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner />
          <span className="ml-2 text-text-secondary">Loading account information...</span>
        </div>
      )}

      {error && <Alert type="error" title="Error" message={error} />}

      {loading && !metrics ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : metrics && calculatedMetrics ? (
        <>
          {/* Compact Dashboard - Essential KPIs Only */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* ROAS - Most important metric */}
            <Card className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">ROAS</p>
              <p className="text-xl font-bold text-text mb-0.5">{(metrics.roas ?? 0).toFixed(2)}x</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {(previousMetrics?.roas ?? 0).toFixed(2)}x
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.roasChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {(calculatedMetrics?.roasChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.roasChange ?? 0).toFixed(1)}%
              </span>
            </Card>

            {/* Total Cost */}
            <Card className="p-3">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">Investment</p>
              <p className="text-xl font-bold text-text mb-0.5">{formatCurrency(metrics.cost)}</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {formatCurrency(previousMetrics?.cost || 0)}
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.costChange ?? 0) >= 0 ? "text-red-500" : "text-green-500"}`}>
                {(calculatedMetrics?.costChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.costChange ?? 0).toFixed(1)}%
              </span>
            </Card>

            {/* Conversions */}
            <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">Conversions</p>
              <p className="text-xl font-bold text-text mb-0.5">{formatNumber(metrics.conversions)}</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {formatNumber(previousMetrics?.conversions ?? 0)}
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.conversionsChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {(calculatedMetrics?.conversionsChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.conversionsChange ?? 0).toFixed(1)}%
              </span>
            </Card>

            {/* CPA */}
            <Card className="p-3">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">CPA</p>
              <p className="text-xl font-bold text-text mb-0.5">{formatCurrency(calculatedMetrics?.cpa ?? 0)}</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {formatCurrency(previousMetrics && previousMetrics.conversions > 0
                  ? previousMetrics.cost / previousMetrics.conversions
                  : 0)}
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.cpaChange ?? 0) >= 0 ? "text-red-500" : "text-green-500"}`}>
                {(calculatedMetrics?.cpaChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.cpaChange ?? 0).toFixed(1)}%
              </span>
            </Card>

            {/* CTR */}
            <Card className="p-3">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">CTR</p>
              <p className="text-xl font-bold text-text mb-0.5">{formatPercent(metrics.ctr)}</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {formatPercent(previousMetrics?.ctr ?? 0)}
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.ctrChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {(calculatedMetrics?.ctrChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.ctrChange ?? 0).toFixed(1)}%
              </span>
            </Card>

            {/* Clicks */}
            <Card className="p-3">
              <p className="text-[10px] text-text-secondary mb-1 font-medium">Clicks</p>
              <p className="text-xl font-bold text-text mb-0.5">{formatNumber(metrics.clicks)}</p>
              <p className="text-[9px] text-text-secondary mb-1">
                vs {formatNumber(previousMetrics?.clicks ?? 0)}
              </p>
              <span className={`text-[10px] font-semibold ${(calculatedMetrics?.clicksChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {(calculatedMetrics?.clicksChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.clicksChange ?? 0).toFixed(1)}%
              </span>
            </Card>
          </div>

          {/* Main Chart - ROAS and Conversions (most important) */}
          {trendsData.length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">Trend: ROAS and Conversions</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={trendsData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={colors.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke={colors.textSecondary} 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => (value ?? 0).toFixed(1)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke={colors.textSecondary} 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                      labelFormatter={(value) => {
                        const trend = trendsData.find(t => t.date === value)
                        return trend ? format(new Date(trend.fullDate), "dd MMM yyyy") : value
                      }}
                      labelStyle={{ color: colors.text }}
                      formatter={(value: any, name: string) => {
                        if (typeof value !== 'number') return [String(value || 0), name]
                        if (name === "ROAS (x)") {
                          return [value.toFixed(2) + "x", name]
                        }
                        if (name === "Conversions") {
                          return [formatNumber(value), name]
                        }
                        return [String(value), name]
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      iconType="line"
                      iconSize={12}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="roas"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="ROAS (x)"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="conversions"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Conversions"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Efficiency Summary - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3">
              <p className="text-xs text-text-secondary mb-1">CPC</p>
              <p className="text-lg font-bold text-text">{formatCurrency(metrics.cpc)}</p>
              <p className="text-[10px] text-text-secondary">
                {(calculatedMetrics?.cpcChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.cpcChange ?? 0).toFixed(1)}% vs previous
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-text-secondary mb-1">CPM</p>
              <p className="text-lg font-bold text-text">{formatCurrency(calculatedMetrics?.cpm ?? 0)}</p>
              <p className="text-[10px] text-text-secondary">
                {(calculatedMetrics?.cpmChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.cpmChange ?? 0).toFixed(1)}% vs previous
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-text-secondary mb-1">Impressions</p>
              <p className="text-lg font-bold text-text">{formatNumber(metrics.impressions)}</p>
              <p className="text-[10px] text-text-secondary">
                {(calculatedMetrics?.impressionsChange ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(calculatedMetrics?.impressionsChange ?? 0).toFixed(1)}% vs previous
              </p>
            </Card>
          </div>

          {trendsData.length === 0 && !loading && (
            <Card className="p-4">
              <p className="text-text-secondary text-center text-sm">
                No data available for the selected period
              </p>
            </Card>
          )}
        </>
      ) : selectedAccountId ? (
        <Card className="p-4">
          <p className="text-text-secondary text-center text-sm">
            No data available for the selected period
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-text-secondary text-center text-sm">
            Select an account and date range to view data
          </p>
        </Card>
      )}
    </div>
  )
}
