/**
 * SharedDashboardPage - Página pública para ver dashboards compartidos
 * Accesible sin autenticación mediante token en la URL
 */
import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format, subDays } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Lock,
  Eye,
  EyeOff,
  MousePointerClick,
  DollarSign,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  RefreshCw,
  AlertCircle,
  Filter,
  HelpCircle,
  ChevronDown,
  Check,
  Percent,
  Activity,
} from "lucide-react"
import { toast } from "sonner"
import {
  shareLinksService,
  type SharedDashboardInfo,
  type SharedMetrics,
} from "../../services/analytics/shareLinks.service"

// Colores por plataforma
const COLORS = {
  google: "#4285F4",
  meta: "#0084FF",
  linkedin: "#0077B5",
  tiktok: "#000000",
  seo: "#34A853",
}

const PLATFORM_NAMES: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads",
}

// Opciones de período rápido
const PERIOD_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "Custom", days: 0 },
]

// Definición de métricas disponibles con tooltips
const METRIC_DEFINITIONS = {
  clicks: {
    key: "clicks",
    label: "Clicks",
    tooltip: "Total number of clicks on your ads. Each click represents a user interaction with your advertisement.",
    icon: MousePointerClick,
    color: "blue",
    format: "number",
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    tooltip: "Number of times your ads were displayed. An impression is counted each time your ad is shown on a search result page or website.",
    icon: Eye,
    color: "green",
    format: "number",
  },
  conversions: {
    key: "conversions",
    label: "Conversions",
    tooltip: "Number of desired actions completed by users after clicking your ad (purchases, sign-ups, form submissions, etc.).",
    icon: Target,
    color: "orange",
    format: "number",
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    tooltip: "Click-Through Rate. Percentage of people who clicked your ad after seeing it. Calculated as: (Clicks ÷ Impressions) × 100",
    icon: TrendingUp,
    color: "purple",
    format: "percent",
  },
  cost: {
    key: "cost",
    label: "Investment",
    tooltip: "Total amount spent on advertising campaigns. This represents your advertising investment for the selected period.",
    icon: DollarSign,
    color: "red",
    format: "currency",
  },
  cpc: {
    key: "cpc",
    label: "CPC",
    tooltip: "Cost Per Click. The average amount you pay for each click on your ad. Calculated as: Total Cost ÷ Total Clicks",
    icon: Activity,
    color: "indigo",
    format: "currency",
  },
  cpm: {
    key: "cpm",
    label: "CPM",
    tooltip: "Cost Per Mille (Thousand). The cost for 1,000 ad impressions. Calculated as: (Total Cost ÷ Impressions) × 1000",
    icon: Percent,
    color: "pink",
    format: "currency",
  },
}

type MetricKey = keyof typeof METRIC_DEFINITIONS

// Componente Tooltip personalizado
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
        type="button"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          <div className="relative">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente Dropdown de selección múltiple
function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  renderOption,
}: {
  options: { value: string; label: string; extra?: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  renderOption?: (option: { value: string; label: string; extra?: string }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectAll = () => {
    if (selected.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((o) => o.value))
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-gray-700">
          {selected.length === 0
            ? placeholder
            : selected.length === options.length
            ? "All selected"
            : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <button
              onClick={selectAll}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selected.length === options.length
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-300"
                }`}
              >
                {selected.length === options.length && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="font-medium">Select All</span>
            </button>
            <div className="max-h-48 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selected.includes(option.value)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selected.includes(option.value) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {renderOption ? renderOption(option) : <span>{option.label}</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function SharedDashboardPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  // Estados
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardInfo, setDashboardInfo] = useState<SharedDashboardInfo | null>(null)
  const [metrics, setMetrics] = useState<SharedMetrics | null>(null)
  const [trendsData, setTrendsData] = useState<Array<{
    date: string
    impressions: number
    clicks: number
    cost: number | null
    conversions: number
    ctr: number
    cpc: number | null
    roas: number | null
  }>>([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  const [customDateMode, setCustomDateMode] = useState(false)
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "clicks",
    "impressions",
    "conversions",
    "ctr",
    "cost",
  ])
  const [showFilters, setShowFilters] = useState(false)

  // Fechas
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")

  // Actualizar fechas cuando cambia el período
  useEffect(() => {
    if (selectedPeriod > 0) {
      setDateRange({
        start: subDays(new Date(), selectedPeriod),
        end: new Date(),
      })
      setCustomDateMode(false)
    }
  }, [selectedPeriod])

  // Cargar información del dashboard
  useEffect(() => {
    const loadDashboardInfo = async () => {
      if (!token) {
        setError("Invalid link")
        setLoading(false)
        return
      }

      try {
        const info = await shareLinksService.getSharedDashboardInfo(token)
        setDashboardInfo(info)

        // Si tiene configuración de rango de fechas, aplicarla
        if (info.config?.date_range_days) {
          setSelectedPeriod(info.config.date_range_days)
          setDateRange({
            start: subDays(new Date(), info.config.date_range_days),
            end: new Date(),
          })
        }

        // Seleccionar todas las cuentas por defecto
        if (info.accounts) {
          setSelectedAccounts(info.accounts.map((_, i) => i.toString()))
        }

        // Si no requiere contraseña, cargar métricas directamente
        if (!info.requires_password) {
          setPasswordVerified(true)
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Dashboard not found or expired")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardInfo()
  }, [token])

  // Cargar métricas
  const loadMetrics = useCallback(async () => {
    if (!token || !dashboardInfo || (dashboardInfo.requires_password && !passwordVerified)) {
      return
    }

    setLoading(true)
    try {
      const result = await shareLinksService.getSharedMetrics(
        token,
        formatDate(dateRange.start),
        formatDate(dateRange.end),
        password || undefined
      )
      setMetrics(result)
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setPasswordVerified(false)
        setError("Incorrect password")
      } else {
        setError(err.response?.data?.message || "Error loading metrics")
      }
    } finally {
      setLoading(false)
    }
  }, [token, dashboardInfo, passwordVerified, dateRange, password])

  // Cargar métricas cuando cambian las fechas o se verifica la contraseña
  useEffect(() => {
    if (passwordVerified) {
      loadMetrics()
    }
  }, [loadMetrics, passwordVerified])

  // Cargar tendencias
  const loadTrends = useCallback(async () => {
    if (!token || !dashboardInfo || (dashboardInfo.requires_password && !passwordVerified)) {
      return
    }

    setLoadingTrends(true)
    try {
      const result = await shareLinksService.getSharedTrends(
        token,
        formatDate(dateRange.start),
        formatDate(dateRange.end)
      )
      setTrendsData(result.trends || [])
    } catch (err: any) {
      console.error("Error loading trends:", err)
      // No establecer error general, las tendencias son opcionales
      setTrendsData([])
    } finally {
      setLoadingTrends(false)
    }
  }, [token, dashboardInfo, passwordVerified, dateRange])

  // Cargar tendencias cuando cambian las fechas o se verifica la contraseña
  useEffect(() => {
    if (passwordVerified) {
      loadTrends()
    }
  }, [loadTrends, passwordVerified])

  // Verificar contraseña
  const handleVerifyPassword = async () => {
    if (!token || !password) return

    setVerifyingPassword(true)
    try {
      const verified = await shareLinksService.verifyPassword(token, password)
      if (verified) {
        setPasswordVerified(true)
        toast.success("Password verified!")
      } else {
        toast.error("Incorrect password")
      }
    } catch {
      toast.error("Error verifying password")
    } finally {
      setVerifyingPassword(false)
    }
  }

  // Formatters
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatMetricValue = (key: MetricKey, value: number | undefined | null): string => {
    if (value === undefined || value === null) return "N/A"
    const def = METRIC_DEFINITIONS[key]
    if (def.format === "currency") return formatCurrency(value)
    if (def.format === "percent") return `${value.toFixed(2)}%`
    return formatNumber(value)
  }

  // Obtener valor de métrica
  const getMetricValue = (key: MetricKey): number => {
    if (!metrics) return 0
    switch (key) {
      case "clicks":
        return metrics.totalClicks
      case "impressions":
        return metrics.totalImpressions
      case "conversions":
        return metrics.totalConversions
      case "ctr":
        return metrics.totalCTR
      case "cost":
        return metrics.totalCost || 0
      case "cpc":
        return metrics.totalCPC || 0
      case "cpm":
        return metrics.totalCPM || 0
      default:
        return 0
    }
  }

  // Datos para gráficos filtrados por cuentas seleccionadas
  const filteredPlatformData = useMemo(() => {
    if (!metrics?.platforms || !dashboardInfo?.accounts) return []

    // Filtrar plataformas basado en cuentas seleccionadas
    const selectedPlatforms = new Set(
      dashboardInfo.accounts
        .filter((_, i) => selectedAccounts.includes(i.toString()))
        .map((acc) => acc.platform)
    )

    return Object.entries(metrics.platforms)
      .filter(([key]) => selectedPlatforms.has(key))
      .map(([key, platform]) => ({
        name: PLATFORM_NAMES[key] || key,
        clicks: platform.clicks,
        impressions: platform.impressions,
        cost: platform.cost || 0,
        conversions: platform.conversions,
        ctr: platform.ctr,
        color: COLORS[key as keyof typeof COLORS] || "#666",
      }))
  }, [metrics, dashboardInfo, selectedAccounts])

  // Opciones de cuentas para el filtro
  const accountOptions = useMemo(() => {
    if (!dashboardInfo?.accounts) return []
    return dashboardInfo.accounts.map((acc, i) => ({
      value: i.toString(),
      label: acc.account_name,
      extra: PLATFORM_NAMES[acc.platform] || acc.platform,
    }))
  }, [dashboardInfo])

  // Opciones de métricas para el filtro
  const metricOptions = useMemo(() => {
    return Object.entries(METRIC_DEFINITIONS).map(([key, def]) => ({
      value: key,
      label: def.label,
      extra: "",
    }))
  }, [])

  // Página de error
  if (error && !dashboardInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Dashboard Not Available</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // Página de contraseña
  if (dashboardInfo?.requires_password && !passwordVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{dashboardInfo.name}</h1>
            <p className="text-gray-600">This dashboard is password protected</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handleVerifyPassword}
              disabled={verifyingPassword || !password}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifyingPassword ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                "View Dashboard"
              )}
            </button>

            {error && <p className="text-center text-red-500 text-sm">{error}</p>}
          </div>

          {/* Info de las cuentas */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {dashboardInfo.account_count} account(s) • {dashboardInfo.platforms.join(", ")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {dashboardInfo?.config?.brand_logo_url ? (
                <img src={dashboardInfo.config.brand_logo_url} alt="" className="h-8 w-auto" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {dashboardInfo?.config?.brand_name || metrics?.dashboardName || "Dashboard"}
                </h1>
                {dashboardInfo?.account_count && (
                  <p className="text-xs text-gray-500">
                    Aggregated data from {selectedAccounts.length} of{" "}
                    {dashboardInfo.account_count} accounts
                  </p>
                )}
              </div>
            </div>

            {/* Botón de filtros en móvil */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Barra de filtros */}
      <div
        className={`bg-white border-b border-gray-200 ${
          showFilters ? "block" : "hidden lg:block"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filtros de período rápido */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {PERIOD_OPTIONS.map((period) => (
                <button
                  key={period.days}
                  onClick={() => {
                    if (period.days === 0) {
                      setCustomDateMode(true)
                    } else {
                      setSelectedPeriod(period.days)
                    }
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    (customDateMode && period.days === 0) ||
                    (!customDateMode && selectedPeriod === period.days)
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Selector de fecha personalizada */}
            {customDateMode && dashboardInfo?.config?.allow_date_selection && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formatDate(dateRange.start)}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: new Date(e.target.value) }))
                  }
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={formatDate(dateRange.end)}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: new Date(e.target.value) }))
                  }
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Filtro de cuentas */}
            {accountOptions.length > 1 && (
              <MultiSelect
                options={accountOptions}
                selected={selectedAccounts}
                onChange={setSelectedAccounts}
                placeholder="Filter Accounts"
                renderOption={(option) => (
                  <div className="flex flex-col">
                    <span className="text-gray-900">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.extra}</span>
                  </div>
                )}
              />
            )}

            {/* Filtro de métricas */}
            <MultiSelect
              options={metricOptions}
              selected={selectedMetrics}
              onChange={(selected) => setSelectedMetrics(selected as MetricKey[])}
              placeholder="Select Metrics"
            />

            {/* Botón de refrescar */}
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 rounded-lg hover:bg-gray-100"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading metrics...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* KPIs principales - Solo mostrar los seleccionados */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {selectedMetrics.map((key) => {
                const def = METRIC_DEFINITIONS[key]
                if (!def) return null
                
                // No mostrar costo si está en null
                if (key === "cost" && (metrics.totalCost === null || metrics.totalCost === undefined)) {
                  return null
                }

                const Icon = def.icon
                const value = getMetricValue(key)
                const colorClasses: Record<string, string> = {
                  blue: "bg-blue-100 text-blue-600",
                  green: "bg-green-100 text-green-600",
                  orange: "bg-orange-100 text-orange-600",
                  purple: "bg-purple-100 text-purple-600",
                  red: "bg-red-100 text-red-600",
                  indigo: "bg-indigo-100 text-indigo-600",
                  pink: "bg-pink-100 text-pink-600",
                }

                return (
                  <div
                    key={key}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[def.color]}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <InfoTooltip text={def.tooltip} />
                    </div>
                    <p className="text-sm text-gray-500">{def.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMetricValue(key, value)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Gráfico de Tendencias - MEJORADO */}
            {trendsData.length > 0 && (
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      📈 Daily Performance Trend
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Track your clicks and conversions day by day</p>
                  </div>
                  <InfoTooltip text="This chart shows how your ads perform each day. Blue line = user clicks on your ads. Green line = conversions (sales, signups, etc.). Look for patterns to optimize your campaigns!" />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#3b82f6" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#10b981" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                          padding: '16px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value)
                          return `📅 ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Clicks') return [`👆 ${value.toLocaleString()} clicks`, '']
                          if (name === 'Conversions') return [`🎯 ${value.toLocaleString()} conversions`, '']
                          return [value, name]
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={trendsData.length <= 14 ? { fill: '#3b82f6', strokeWidth: 2, r: 4 } : false}
                        name="Clicks"
                        activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="conversions" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={trendsData.length <= 14 ? { fill: '#10b981', strokeWidth: 2, r: 4 } : false}
                        name="Conversions"
                        activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Clicks (left axis)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">Conversions (right axis)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico de Tendencias de CTR y Costo - MEJORADO */}
            {trendsData.length > 0 && metrics?.totalCost !== null && (
              <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-purple-100 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      💰 Efficiency & Spending Trend
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Monitor your CTR performance and daily ad spend</p>
                  </div>
                  <InfoTooltip text="CTR (Click-Through Rate) shows how often people click your ads after seeing them. Higher is better! The cost line shows your daily spending. Look for days with high CTR and low cost." />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#8b5cf6" 
                        fontSize={11} 
                        unit="%" 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#ef4444" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                          padding: '16px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value)
                          return `📅 ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'CTR (%)') return [`📊 ${value.toFixed(2)}% click rate`, '']
                          if (name === 'Daily Spend') return [`💵 $${value.toFixed(2)} spent`, '']
                          return [value, name]
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="ctr" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={trendsData.length <= 14 ? { fill: '#8b5cf6', strokeWidth: 2, r: 4 } : false}
                        name="CTR (%)"
                        activeDot={{ r: 8, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 3 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={trendsData.length <= 14 ? { fill: '#ef4444', strokeWidth: 2, r: 4 } : false}
                        name="Daily Spend"
                        activeDot={{ r: 8, fill: '#ef4444', stroke: '#fff', strokeWidth: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-600">CTR % (left axis)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Daily Spend (right axis)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading trends indicator */}
            {loadingTrends && trendsData.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-center h-80">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500">Loading trend data...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Gráficos de Plataforma - MEJORADOS */}
            {filteredPlatformData.length > 0 && (
              <div className="space-y-6">
                {/* Sección de Distribución */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 border border-gray-100">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">📊 Platform Overview</h2>
                    <p className="text-gray-500 mt-1">How your advertising performs across different platforms</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Clicks Distribution - Donut Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">👆 Click Distribution</h3>
                          <p className="text-xs text-gray-500 mt-1">Where users are clicking your ads</p>
                        </div>
                        <InfoTooltip text="This chart shows which platforms generate the most clicks. Larger slices mean more user engagement on that platform." />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={filteredPlatformData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="clicks"
                            >
                              {filteredPlatformData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                              }}
                              formatter={(value: number, _name: string, props: any) => [
                                `👆 ${value.toLocaleString()} clicks`,
                                props.payload.name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Leyenda personalizada */}
                      <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {filteredPlatformData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-600">{entry.name}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {((entry.clicks / filteredPlatformData.reduce((a, b) => a + b.clicks, 0)) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conversions Distribution - Donut Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">🎯 Conversion Distribution</h3>
                          <p className="text-xs text-gray-500 mt-1">Where conversions are happening</p>
                        </div>
                        <InfoTooltip text="Shows which platforms generate the most conversions (sales, signups, etc.). Focus your budget on platforms with more conversions!" />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={filteredPlatformData.filter(p => p.conversions > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="conversions"
                            >
                              {filteredPlatformData.map((entry, index) => (
                                <Cell 
                                  key={`cell-conv-${index}`} 
                                  fill={entry.color}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                              }}
                              formatter={(value: number, _name: string, props: any) => [
                                `🎯 ${value.toLocaleString()} conversions`,
                                props.payload.name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {filteredPlatformData.filter(p => p.conversions > 0).map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-gray-600">{entry.name}</span>
                            <span className="text-sm font-bold text-gray-900">
                              {entry.conversions.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección de Comparación de Rendimiento */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">⚡ Performance Comparison</h2>
                    <p className="text-gray-500 mt-1">Compare metrics across all your advertising platforms</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Clicks vs Conversions Bar Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">📈 Clicks vs Conversions</h3>
                          <p className="text-xs text-gray-500 mt-1">Platform engagement comparison</p>
                        </div>
                        <InfoTooltip text="Compare how many clicks each platform gets vs how many convert to actions. High clicks with low conversions may need optimization." />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredPlatformData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="#9ca3af" 
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#9ca3af" 
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                              }}
                              formatter={(value: number, name: string) => [
                                `${value.toLocaleString()} ${name.toLowerCase()}`,
                                ''
                              ]}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '10px' }}
                              formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                            />
                            <Bar 
                              dataKey="clicks" 
                              fill="#3b82f6" 
                              name="👆 Clicks" 
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar 
                              dataKey="conversions" 
                              fill="#10b981" 
                              name="🎯 Conversions" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CTR Comparison */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">📊 Click-Through Rate (CTR)</h3>
                          <p className="text-xs text-gray-500 mt-1">Ad effectiveness by platform</p>
                        </div>
                        <InfoTooltip text="CTR shows the percentage of people who clicked your ad after seeing it. Higher CTR = more effective ads. Industry average is 2-5%." />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={filteredPlatformData} 
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis 
                              type="number" 
                              stroke="#9ca3af" 
                              fontSize={11} 
                              unit="%"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              stroke="#9ca3af" 
                              fontSize={12} 
                              width={100}
                              tickLine={false}
                              axisLine={false}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                              }}
                              formatter={(value: number) => [`📊 ${value.toFixed(2)}% CTR`, '']}
                            />
                            <Bar 
                              dataKey="ctr" 
                              fill="url(#ctrGradient)" 
                              name="CTR %" 
                              radius={[0, 8, 8, 0]}
                            />
                            <defs>
                              <linearGradient id="ctrGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#a78bfa" />
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-center text-xs text-gray-500">
                        ✨ Higher CTR means your ads are more compelling to users
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección de Inversión */}
                {metrics.totalCost !== null && metrics.totalCost !== undefined && metrics.totalCost > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">💰 Investment Analysis</h2>
                      <p className="text-gray-500 mt-1">Understand where your advertising budget goes and its efficiency</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Investment vs Conversions */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">💵 Cost vs Results</h3>
                            <p className="text-xs text-gray-500 mt-1">Return on your ad investment</p>
                          </div>
                          <InfoTooltip text="Compare how much you spent on each platform vs the results you got. Platforms with high conversions relative to cost are more efficient." />
                        </div>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredPlatformData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                stroke="#9ca3af" 
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                yAxisId="left"
                                stroke="#ef4444" 
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `$${v}`}
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#10b981" 
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                              />
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                  padding: '12px 16px'
                                }}
                                formatter={(value: number, name: string) => {
                                  if (name.includes('Spent')) return [`💵 $${value.toFixed(2)}`, '']
                                  return [`🎯 ${value.toLocaleString()}`, '']
                                }}
                              />
                              <Legend 
                                wrapperStyle={{ paddingTop: '10px' }}
                                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                              />
                              <Bar 
                                yAxisId="left"
                                dataKey="cost" 
                                fill="#fee2e2" 
                                stroke="#ef4444"
                                strokeWidth={2}
                                name="💵 Amount Spent" 
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar 
                                yAxisId="right"
                                dataKey="conversions" 
                                fill="#d1fae5" 
                                stroke="#10b981"
                                strokeWidth={2}
                                name="🎯 Conversions" 
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Cost Per Click Comparison */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">💲 Cost Per Click (CPC)</h3>
                            <p className="text-xs text-gray-500 mt-1">How much each click costs you</p>
                          </div>
                          <InfoTooltip text="CPC shows the average cost for each ad click. Lower CPC means you're getting more traffic for less money. Compare platforms to find the most efficient ones." />
                        </div>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={filteredPlatformData.map(p => ({
                                ...p,
                                cpc: p.clicks > 0 ? p.cost / p.clicks : 0
                              }))} 
                              layout="vertical"
                              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                              <XAxis 
                                type="number" 
                                stroke="#9ca3af" 
                                fontSize={11} 
                                tickFormatter={(v) => `$${v.toFixed(2)}`}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                stroke="#9ca3af" 
                                fontSize={12} 
                                width={100}
                                tickLine={false}
                                axisLine={false}
                              />
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                  padding: '12px 16px'
                                }}
                                formatter={(value: number) => [`💲 $${value.toFixed(2)} per click`, '']}
                              />
                              <Bar 
                                dataKey="cpc" 
                                fill="url(#cpcGradient)" 
                                name="CPC" 
                                radius={[0, 8, 8, 0]}
                              />
                              <defs>
                                <linearGradient id="cpcGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-center text-xs text-gray-500">
                          💡 Lower CPC = more efficient traffic acquisition
                        </div>
                      </div>
                    </div>
                  </div>
)}

                {/* Impressions & Reach Section */}
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-6 border border-cyan-100">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">👁️ Visibility & Reach</h2>
                    <p className="text-gray-500 mt-1">How many people are seeing your ads</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Impressions by Platform */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">👀 Impressions by Platform</h3>
                          <p className="text-xs text-gray-500 mt-1">Total ad views per platform</p>
                        </div>
                        <InfoTooltip text="Impressions show how many times your ads were displayed. Higher impressions mean greater brand visibility." />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredPlatformData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="100%" stopColor="#0891b2" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="#9ca3af" 
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#9ca3af" 
                              fontSize={11} 
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} 
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                              }}
                              formatter={(value: number) => [`👀 ${value.toLocaleString()} impressions`, '']}
                            />
                            <Bar 
                              dataKey="impressions" 
                              fill="url(#impressionGradient)" 
                              name="Impressions" 
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Investment Distribution Pie */}
                    {metrics.totalCost !== null && metrics.totalCost !== undefined && metrics.totalCost > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">💸 Budget Distribution</h3>
                            <p className="text-xs text-gray-500 mt-1">How your budget is allocated</p>
                          </div>
                          <InfoTooltip text="Shows how your advertising budget is distributed across platforms. Consider reallocating to high-performing platforms." />
                        </div>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={filteredPlatformData.filter(p => p.cost > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="cost"
                              >
                                {filteredPlatformData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-cost-${index}`} 
                                    fill={entry.color}
                                    stroke="#fff"
                                    strokeWidth={2}
                                  />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                                  padding: '12px 16px'
                                }}
                                formatter={(value: number, _name: string, props: any) => [
                                  `💸 $${value.toFixed(2)}`,
                                  props.payload.name
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                          {filteredPlatformData.filter(p => p.cost > 0).map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-600">{entry.name}</span>
                              <span className="text-sm font-bold text-gray-900">
                                ${entry.cost.toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico de Tendencia de Impressions - MEJORADO */}
            {trendsData.length > 0 && (
              <div className="bg-gradient-to-br from-white to-cyan-50 rounded-2xl border border-cyan-200 p-6 shadow-md">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">👁️ Impressions Trend</h3>
                  <p className="text-sm text-gray-500">Track your ad visibility over time</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <defs>
                        <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getDate()}/${date.getMonth() + 1}`
                        }}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        fontSize={11} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                          padding: '12px 16px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value)
                          return `📅 ${date.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}`
                        }}
                        formatter={(value: number) => [`👀 ${value.toLocaleString()}`, 'Impressions']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#06b6d4" 
                        strokeWidth={3}
                        fill="url(#impressionsGrad)"
                        dot={trendsData.length <= 31 ? { fill: '#06b6d4', strokeWidth: 2, r: 4 } : false}
                        name="👀 Impressions"
                        activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 text-center text-xs text-gray-500">
                  ✨ Consistent impressions indicate stable ad delivery
                </div>
              </div>
            )}

            {/* Efficiency Metrics Summary - MEJORADO */}
            {metrics.totalCost !== null && metrics.totalCost !== undefined && (
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">📐 Efficiency Metrics</h2>
                  <p className="text-gray-500 mt-1">Key performance indicators for your advertising</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💵</span>
                      <InfoTooltip text="Cost Per Click - How much you pay on average for each ad click" />
                    </div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Avg. CPC</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${metrics.totalClicks > 0 ? (metrics.totalCost / metrics.totalClicks).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">💡 Lower is better</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">📺</span>
                      <InfoTooltip text="Cost Per Mille - Cost per 1,000 ad impressions. Good for comparing reach efficiency." />
                    </div>
                    <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">Avg. CPM</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${metrics.totalImpressions > 0 ? (metrics.totalCost / metrics.totalImpressions * 1000).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">💡 Cost per 1K views</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🎯</span>
                      <InfoTooltip text="Cost Per Acquisition - How much you pay for each conversion (sale, signup, etc.)" />
                    </div>
                    <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Avg. CPA</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${metrics.totalConversions > 0 ? (metrics.totalCost / metrics.totalConversions).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">💡 Cost per conversion</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🔄</span>
                      <InfoTooltip text="Conversion Rate - Percentage of clicks that result in conversions. Higher is better!" />
                    </div>
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Conv. Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {metrics.totalClicks > 0 ? ((metrics.totalConversions / metrics.totalClicks) * 100).toFixed(2) : '0.00'}%
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">💡 Higher is better</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detalle por plataforma - MEJORADO */}
            {Object.keys(metrics.platforms).length > 0 && (
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">📋 Platform Details</h2>
                  <p className="text-gray-500 mt-1">Complete breakdown by advertising platform</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {Object.entries(metrics.platforms)
                    .filter(([key]) => {
                      if (!dashboardInfo?.accounts) return true
                      const selectedPlatforms = new Set(
                        dashboardInfo.accounts
                          .filter((_, i) => selectedAccounts.includes(i.toString()))
                          .map((acc) => acc.platform)
                      )
                      return selectedPlatforms.has(key)
                    })
                    .map(([key, platform]) => (
                      <div
                        key={key}
                        className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden"
                        style={{ 
                          borderColor: `${COLORS[key as keyof typeof COLORS] || "#666"}30`,
                        }}
                      >
                        {/* Color accent bar */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: COLORS[key as keyof typeof COLORS] || "#666" }}
                        />
                        
                        <div className="flex items-center gap-2 mb-4">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: COLORS[key as keyof typeof COLORS] || "#666" }}
                          >
                            {(PLATFORM_NAMES[key] || key).charAt(0)}
                          </div>
                          <h4 className="font-bold text-gray-900">
                            {PLATFORM_NAMES[key] || key}
                          </h4>
                        </div>
                        
                        <div className="space-y-3">
                          {selectedMetrics.includes("clicks") && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">👆 Clicks</span>
                              <span className="font-bold text-gray-900">
                                {formatNumber(platform.clicks)}
                              </span>
                            </div>
                          )}
                          {selectedMetrics.includes("impressions") && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">👀 Impressions</span>
                              <span className="font-bold text-gray-900">
                                {formatNumber(platform.impressions)}
                              </span>
                            </div>
                          )}
                          {selectedMetrics.includes("ctr") && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">📊 CTR</span>
                              <span className="font-bold text-gray-900">
                                {platform.ctr.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {selectedMetrics.includes("cost") &&
                            platform.cost !== undefined &&
                            metrics.totalCost !== null && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">💵 Cost</span>
                                <span className="font-bold text-gray-900">
                                  {formatCurrency(platform.cost)}
                                </span>
                              </div>
                            )}
                          {selectedMetrics.includes("conversions") && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">🎯 Conversions</span>
                              <span className="font-bold text-gray-900">
                                {formatNumber(platform.conversions)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Leyenda de cuentas seleccionadas - MEJORADO */}
            {dashboardInfo?.accounts && dashboardInfo.accounts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏢</span>
                    <h4 className="font-semibold text-gray-900">Accounts Included</h4>
                  </div>
                  <InfoTooltip text="List of advertising accounts included in this report. You can filter specific accounts using the filter bar above." />
                </div>
                <div className="flex flex-wrap gap-3">
                  {dashboardInfo.accounts
                    .filter((_, i) => selectedAccounts.includes(i.toString()))
                    .map((acc, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border shadow-sm hover:shadow-md transition-shadow"
                        style={{
                          backgroundColor: `${COLORS[acc.platform as keyof typeof COLORS] || "#666"}08`,
                          borderColor: `${COLORS[acc.platform as keyof typeof COLORS] || "#666"}30`,
                          color: COLORS[acc.platform as keyof typeof COLORS] || "#666",
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[acc.platform as keyof typeof COLORS] || "#666" }}
                        />
                        {acc.account_name}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Footer - MEJORADO */}
            <div className="text-center py-6 border-t border-gray-100 mt-6">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="text-lg">📅</span>
                <p className="text-sm">
                  Data from <span className="font-medium">{formatDate(dateRange.start)}</span> to <span className="font-medium">{formatDate(dateRange.end)}</span>
                </p>
              </div>
              {dashboardInfo?.config?.brand_name && (
                <p className="mt-2 text-xs text-gray-400">
                  Powered by <span className="font-medium">{dashboardInfo.config.brand_name}</span>
                </p>
              )}
              <p className="mt-3 text-xs text-gray-300">
                ✨ Generated with love • Analytics Dashboard
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
