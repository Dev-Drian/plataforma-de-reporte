"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format, subDays } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { toast } from "sonner"
import { 
  RefreshCw, 
  MousePointerClick, 
  Eye, 
  DollarSign, 
  Target, 
  TrendingUp as ChartTrendingUp,
  BarChart3,
  Calendar,
  Share2,
  Layers
} from "lucide-react"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import Alert from "../../components/common/Alert"
import { dashboardService, type DashboardMetrics } from "../../services/analytics/dashboard.service"
import { seoService, type SEOQuery, type SEOPage as SEOPageData } from "../../services/analytics"
import { accountsService, type Account } from "../../services/accounts"
import { useTheme } from "../../contexts/ThemeContext"
import GroupedFilters from "../../components/dashboard/GroupedFilters"
import PeriodSelector from "../../components/dashboard/PeriodSelector"
import TabbedTable from "../../components/dashboard/TabbedTable"
import MainMetricCard from "../../components/dashboard/MainMetricCard"
import MultiAccountSelector from "../../components/dashboard/MultiAccountSelector"
import CreateShareLinkModal from "../../components/dashboard/CreateShareLinkModal"

interface TabbedTableItem {
  id: string
  name: string
  clicks: number
  changePercent: number
}

const COLORS = {
  google: "#4285F4",
  meta: "#0084FF",
  linkedin: "#0077B5",
  tiktok: "#000000",
  seo: "#34A853",
}

export default function Dashboard() {
  const { colors } = useTheme()
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 90),
    end: new Date(),
  })
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])
  const [autoRefresh] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  
  // Filtros agrupados
  const [comparisonPeriod, setComparisonPeriod] = useState("previous_period")
  const [searchType, setSearchType] = useState("web")
  const [showPreviousTrendLine, setShowPreviousTrendLine] = useState(true)
  const [matchWeekdays, setMatchWeekdays] = useState(true)
  const [showChangePercent, setShowChangePercent] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("3m")
  
  // SEO Data
  const [seoQueries, setSeoQueries] = useState<SEOQuery[]>([])
  const [seoPages, setSeoPages] = useState<SEOPageData[]>([])

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const allAccounts = await accountsService.getAccounts()
        setAccounts(allAccounts.filter((acc) => acc.is_active))
      } catch (err: any) {
        console.error("Error loading accounts:", err)
      }
    }
    loadAccounts()
  }, [])

  // Cargar métricas
  const loadMetrics = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) return

    setLoading(true)
    setError(null)

    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)

      const accountIds = selectedAccountIds.length > 0 ? selectedAccountIds : undefined

      // Calcular rango anterior con la misma duración
      const daysDiff = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      )
      const previousStart = subDays(dateRange.start, daysDiff)
      const previousEnd = subDays(dateRange.end, daysDiff)

      const previousStartDate = formatDate(previousStart)
      const previousEndDate = formatDate(previousEnd)

      const [currentResult, previousResult] = await Promise.allSettled([
        dashboardService.getGlobalMetrics(startDate, endDate, accountIds),
        dashboardService.getGlobalMetrics(previousStartDate, previousEndDate, accountIds),
      ])

      // Recolectar errores para mostrar UN solo toast
      const errors: string[] = []

      if (currentResult.status === "fulfilled") {
        setMetrics(currentResult.value)
      } else {
        const errorMsg = currentResult.reason?.message || "Error loading global metrics"
        console.error("Error loading current metrics:", currentResult.reason)
        errors.push(errorMsg)
      }

      if (previousResult.status === "fulfilled") {
        setPreviousMetrics(previousResult.value)
      } else if (previousResult.status === "rejected") {
        // No es crítico si falla el período anterior, solo no mostraremos comparación
        console.warn("Could not load previous period metrics:", previousResult.reason)
        setPreviousMetrics(null)
      }

      // Solo mostrar UN error si hay errores críticos (current es el más importante)
      if (errors.length > 0) {
        const mainError = errors[0]
        setError(mainError)
        toast.error(mainError)
      } else {
        setError(null)
        toast.success("Dashboard data updated successfully")
      }
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedAccountIds])

  // Load SEO data
  const loadSEOData = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) return

    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)

      const seoAccount = accounts.find(
        (acc) => acc.platform === "google" && acc.account_type === "search_console"
      )
      if (!seoAccount) return

      // Calcular rango anterior con la misma duración
      const daysDiff = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      )
      const previousStart = subDays(dateRange.start, daysDiff)
      const previousEnd = subDays(dateRange.end, daysDiff)

      const previousStartDate = formatDate(previousStart)
      const previousEndDate = formatDate(previousEnd)

      const [queriesCurrent, queriesPrev, pagesCurrent, pagesPrev] = await Promise.all([
        seoService.getQueries(startDate, endDate, seoAccount.id),
        seoService.getQueries(previousStartDate, previousEndDate, seoAccount.id),
        seoService.getPages(startDate, endDate, seoAccount.id),
        seoService.getPages(previousStartDate, previousEndDate, seoAccount.id),
      ])

      // Mapas de clicks previos por query/page
      const prevQueryClicks = new Map(
        (queriesPrev || []).map((q) => [q.query, q.clicks || 0])
      )
      const prevPageClicks = new Map(
        (pagesPrev || []).map((p) => [p.page, p.clicks || 0])
      )

      const withQueryChange = (queriesCurrent || []).map((q) => {
        const prev = prevQueryClicks.get(q.query) ?? 0
        const curr = q.clicks || 0
        const change =
          prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100
        return { ...q, changePercent: change }
      })

      const withPageChange = (pagesCurrent || []).map((p) => {
        const prev = prevPageClicks.get(p.page) ?? 0
        const curr = p.clicks || 0
        const change =
          prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100
        return { ...p, changePercent: change }
      })

      setSeoQueries(withQueryChange)
      setSeoPages(withPageChange)
    } catch (err: any) {
      console.error("Error loading SEO data:", err)
    }
  }, [dateRange, accounts])

  // Load metrics on mount and when dependencies change
  useEffect(() => {
    loadMetrics()
    if (accounts.length > 0) {
      loadSEOData()
    }
  }, [loadMetrics, loadSEOData, accounts.length])

  // Auto-refresh cada 5 minutos si está habilitado
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadMetrics()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [autoRefresh, loadMetrics])


  // Preparar datos para tablas de SEO
  const seoQueriesTableData: TabbedTableItem[] = useMemo(() => {
    return seoQueries.map((query, index) => ({
      id: `query-${index}`,
      name: query.query,
      clicks: query.clicks || 0,
      changePercent: (query as any).changePercent ?? 0,
    }))
  }, [seoQueries])

  const seoPagesTableData: TabbedTableItem[] = useMemo(() => {
    return seoPages.map((page, index) => ({
      id: `page-${index}`,
      name: page.page,
      clicks: page.clicks || 0,
      changePercent: (page as any).changePercent ?? 0,
    }))
  }, [seoPages])

  // Calcular cambio porcentual para métrica principal
  const mainMetricChange = useMemo(() => {
    if (!metrics || !previousMetrics) return 0

    const current = metrics.totalClicks
    const prev = previousMetrics.totalClicks

    if (prev === 0) {
      return current > 0 ? 100 : 0
    }

    return ((current - prev) / prev) * 100
  }, [metrics, previousMetrics])

  // Forzar actualización (invalidar cache)
  const handleForceRefresh = useCallback(async () => {
    try {
      const accountIds = selectedAccountIds.length > 0 ? selectedAccountIds : undefined
      await dashboardService.forceRefresh(accountIds)
      await loadMetrics()
      toast.success("Dashboard cache cleared and data reloaded")
    } catch (err: any) {
      toast.error("Error updating: " + (err.message || "Unknown error"))
    }
  }, [selectedAccountIds, loadMetrics])

  // Prepare data for platforms chart
  const platformChartData = useMemo(() => {
    if (!metrics?.platforms) return []

    return Object.entries(metrics.platforms).map(([key, platform]) => {
      const isSEO = key === "seo"
      return {
        name: key === "google" ? "Google Ads" : key === "meta" ? "Meta Ads" : key === "linkedin" ? "LinkedIn" : key === "tiktok" ? "TikTok" : "SEO",
        clicks: platform.clicks,
        impressions: platform.impressions,
        cost: isSEO ? 0 : (platform as any).cost || 0,
        conversions: isSEO ? 0 : (platform as any).conversions || 0,
        color: COLORS[key as keyof typeof COLORS] || colors.primary,
      }
    })
  }, [metrics, colors.primary])

  // Cuentas de ads activas para el selector
  const adsAccounts = useMemo(() => {
    return accounts.filter(acc => acc.account_type === "ads" && acc.is_active)
  }, [accounts])


  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with grouped filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Global Dashboard</h1>
          <p className="text-sm text-text-secondary">Consolidated view of all your platforms</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GroupedFilters
            comparisonPeriod={comparisonPeriod}
            onComparisonPeriodChange={setComparisonPeriod}
            searchType={searchType}
            onSearchTypeChange={setSearchType}
            showPreviousTrendLine={showPreviousTrendLine}
            onShowPreviousTrendLineChange={setShowPreviousTrendLine}
            matchWeekdays={matchWeekdays}
            onMatchWeekdaysChange={setMatchWeekdays}
            showChangePercent={showChangePercent}
            onShowChangePercentChange={setShowChangePercent}
          />
          <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-2 text-sm bg-primary text-white border border-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            title="Create a shareable link for clients"
          >
            <Share2 className="w-4 h-4" />
            Share with Client
          </button>
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text hover:bg-background-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
            title="Force refresh (invalidate cache)"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Account Selector and Date Range */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Selector de múltiples cuentas */}
          {adsAccounts.length > 0 && (
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-secondary" />
              <label className="text-xs text-text-secondary whitespace-nowrap">Accounts:</label>
              <div className="min-w-[250px]">
                <MultiAccountSelector
                  accounts={adsAccounts}
                  selectedAccountIds={selectedAccountIds}
                  onSelectionChange={setSelectedAccountIds}
                  placeholder="All accounts"
                  maxDisplay={2}
                />
              </div>
              {selectedAccountIds.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {selectedAccountIds.length} selected
                </span>
              )}
            </div>
          )}
          
          {/* Separador */}
          {adsAccounts.length > 0 && (
            <div className="h-6 w-px bg-border hidden md:block" />
          )}
          
          {/* Selector de fechas */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            <label className="text-xs text-text-secondary whitespace-nowrap">From:</label>
            <input
              type="date"
              value={formatDate(dateRange.start)}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, start: new Date(e.target.value) }))
              }}
              className="px-2 py-1 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary whitespace-nowrap">To:</label>
            <input
              type="date"
              value={formatDate(dateRange.end)}
              onChange={(e) => {
                setDateRange((prev) => ({ ...prev, end: new Date(e.target.value) }))
              }}
              className="px-2 py-1 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </Card>

      {error && <Alert type="error" title="Error" message={error} />}

      {metrics ? (
        <>
          {/* Main Metric */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MainMetricCard
              value={metrics.totalClicks}
              changePercent={mainMetricChange}
              label="Total Clicks"
            />
            <Card className="p-6">
              <p className="text-sm text-text-secondary mb-2">This site does not have any topic clusters</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-text-secondary mb-2">This site does not have any content groups</p>
            </Card>
          </div>

          {/* Gráfico de tendencia principal */}
          {platformChartData.length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={platformChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} />
                    <XAxis dataKey="name" stroke={colors.textSecondary} fontSize={11} />
                    <YAxis stroke={colors.textSecondary} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="clicks" stroke={colors.primary} strokeWidth={2} />
                    <Line type="monotone" dataKey="impressions" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Tablas de SEO: Queries y Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {seoQueriesTableData.length > 0 && (
              <TabbedTable
                title="Queries"
                items={seoQueriesTableData}
                maxItems={10}
              />
            )}
            {seoPagesTableData.length > 0 && (
              <TabbedTable
                title="Pages"
                items={seoPagesTableData}
                maxItems={10}
              />
            )}
          </div>

          {/* Main KPIs - Global Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}10)`,
                  }}
                >
                  <MousePointerClick className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">Total Clicks</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.totalClicks)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))`,
                  }}
                >
                  <Eye className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">Impressions</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.totalImpressions)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))`,
                  }}
                >
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">Total Investment</p>
                  <p className="text-xl font-bold text-text">{formatCurrency(metrics.totalCost)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.1))`,
                  }}
                >
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">Conversions</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.totalConversions)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))`,
                  }}
                >
                  <ChartTrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">ROAS</p>
                  <p className="text-xl font-bold text-text">{metrics.totalROAS.toFixed(2)}x</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 relative overflow-hidden group">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))`,
                  }}
                >
                  <BarChart3 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary mb-1 font-medium">CTR</p>
                  <p className="text-xl font-bold text-text">{metrics.totalCTR.toFixed(2)}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Platforms Chart - Click Distribution */}
          {platformChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-base font-semibold text-text mb-4">Platform Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                      >
                        {platformChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-base font-semibold text-text mb-4">Platform Performance</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} />
                      <XAxis dataKey="name" stroke={colors.textSecondary} fontSize={11} />
                      <YAxis stroke={colors.textSecondary} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="clicks" fill={colors.primary} name="Clicks" />
                      <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* Platform Details */}
          {Object.keys(metrics.platforms).length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">Platform Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(metrics.platforms).map(([key, platform]) => (
                  <div
                    key={key}
                    className="p-3 rounded-lg border border-border bg-background/50"
                    style={{ borderLeftColor: COLORS[key as keyof typeof COLORS] || colors.primary, borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-text capitalize">
                        {key === "google" ? "Google Ads" : key === "meta" ? "Meta Ads" : key === "linkedin" ? "LinkedIn" : key === "tiktok" ? "TikTok" : "SEO"}
                      </h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Clicks:</span>
                        <span className="font-medium text-text">{formatNumber(platform.clicks)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Impressions:</span>
                        <span className="font-medium text-text">{formatNumber(platform.impressions)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Cost:</span>
                        <span className="font-medium text-text">
                          {key === "seo" ? "N/A" : formatCurrency((platform as any).cost || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">ROAS:</span>
                        <span className="font-medium text-text">
                          {key === "seo" ? "N/A" : ((platform as any).roas?.toFixed(2) || "N/A") + "x"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Object.keys(metrics.platforms).length === 0 && (
            <Card className="p-6">
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">No data available for the selected period</p>
                <p className="text-sm text-text-secondary">Connect your accounts in Settings → Accounts</p>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">No metrics available</p>
            <p className="text-sm text-text-secondary">Connect your accounts to start viewing data</p>
          </div>
        </Card>
      )}

      {/* Modal para crear link de compartir */}
      <CreateShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        accounts={adsAccounts}
        onSuccess={() => {
          toast.success("Share link created! You can manage your links in Settings.")
        }}
      />
    </div>
  )
}