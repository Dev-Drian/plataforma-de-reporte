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
} from "recharts"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import Alert from "../../components/common/Alert"
import PageHeader from "../../components/common/PageHeader"
import { useGlobalFilters } from "../../hooks/useGlobalFilters"
import { toast } from "sonner"
import {
  seoService,
  type SEOMetrics,
  type SEOQuery,
  type SEOPage as SEOPageData,
  type SEOTrend,
  type SEOProperty,
} from "../../services/analytics"
import { accountsService, type Account } from "../../services/accounts"
import { useTheme } from "../../contexts/ThemeContext"

interface DateRange {
  start: Date
  end: Date
}

export default function SEOPage() {
  const { colors } = useTheme()
  const { filters, setAccountId } = useGlobalFilters()
  const selectedAccountId = filters.accountId
  
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  const [selectedPlatform, setSelectedPlatform] = useState<string>("google")
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [properties, setProperties] = useState<SEOProperty[]>([])
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<SEOMetrics | null>(null)
  const [queries, setQueries] = useState<SEOQuery[]>([])
  const [pages, setPages] = useState<SEOPageData[]>([])
  const [trends, setTrends] = useState<SEOTrend[]>([])

  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [quickDays, setQuickDays] = useState<number | null>(30)

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")
  
  // Helper function to extract domain from property URI
  const extractDomain = (propertyUri: string): string => {
    try {
      // Remove protocol if present
      let cleaned = propertyUri.replace(/^https?:\/\//, '').trim()
      
      // If there are spaces (indicating duplicate), take only the first part
      const parts = cleaned.split(/\s+/)
      if (parts.length > 1) {
        cleaned = parts[0]
      }
      
      // Remove trailing slash and path
      cleaned = cleaned.split('/')[0]
      
      return cleaned || propertyUri
    } catch {
      return propertyUri
    }
  }
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }
  
  const calculatedChanges = useMemo(() => {
    if (!metrics || !previousMetrics) return null
    
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }
    
    return {
      clicksChange: calculateChange(metrics.clicks, previousMetrics.clicks),
      impressionsChange: calculateChange(metrics.impressions, previousMetrics.impressions),
      ctrChange: calculateChange(metrics.ctr, previousMetrics.ctr),
      positionChange: calculateChange(previousMetrics.position, metrics.position),
    }
  }, [metrics, previousMetrics])

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true)
        const allAccounts = await accountsService.getAccounts()
        
        // Filtrar cuentas según la plataforma seleccionada
        let filteredAccounts: Account[] = []
        
        if (selectedPlatform === "google") {
          filteredAccounts = allAccounts.filter(
            (acc) => acc.platform === "google" && acc.account_type === "search_console" && acc.is_active,
          )
        } else if (selectedPlatform === "meta") {
          // Para Meta SEO, usar cuentas de Meta (pueden ser de ads o page)
          filteredAccounts = allAccounts.filter(
            (acc) => acc.platform === "meta" && acc.is_active,
          )
        } else if (selectedPlatform === "linkedin") {
          // Para LinkedIn SEO, usar cuentas de LinkedIn
          filteredAccounts = allAccounts.filter(
            (acc) => acc.platform === "linkedin" && acc.is_active,
          )
        }
        
        setAccounts(filteredAccounts)

        // Si hay cuentas y aún no hay cuenta seleccionada, seleccionar automáticamente la primera
        if (filteredAccounts.length > 0 && !filters.accountId) {
          setAccountId(filteredAccounts[0].id)
        } else if (filteredAccounts.length === 0) {
          // Si no hay cuentas para esta plataforma, limpiar selección
          setAccountId(undefined)
        }
      } catch (err: any) {
        toast.error("Error loading accounts: " + (err.message || "Unknown error"))
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [selectedPlatform])

  useEffect(() => {
    const loadProperties = async () => {
      if (!selectedAccountId || selectedPlatform !== "google") {
        // Solo Google Search Console tiene propiedades
        setProperties([])
        setSelectedProperty(null)
        return
      }

      try {
        const props = await seoService.getProperties(selectedAccountId)
        setProperties(props)
        if (props.length > 0 && !selectedProperty) {
          setSelectedProperty(props[0].property_uri)
        }
      } catch (err: any) {
        console.error("Error loading SEO properties:", err)
      }
    }

    loadProperties()
  }, [selectedAccountId, selectedPlatform])

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    if (!selectedAccountId) {
      return
    }

    setLoading(true)

    try {
      const startDateObj = dateRange.start
      const endDateObj = dateRange.end
      const startDate = formatDate(startDateObj)
      const endDate = formatDate(endDateObj)
      
      const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
      const previousStartDate = formatDate(subDays(startDateObj, daysDiff))
      const previousEndDate = formatDate(subDays(endDateObj, daysDiff))

      const [metricsData, previousMetricsData, queriesData, pagesData, trendsData] = await Promise.allSettled([
        seoService.getMetrics(startDate, endDate, selectedAccountId, selectedProperty || undefined, selectedPlatform, forceRefresh),
        seoService.getMetrics(previousStartDate, previousEndDate, selectedAccountId, selectedProperty || undefined, selectedPlatform, forceRefresh),
        seoService.getQueries(startDate, endDate, selectedAccountId, selectedProperty || undefined, 20),
        seoService.getPages(startDate, endDate, selectedAccountId, selectedProperty || undefined, 20),
        seoService.getTrends(startDate, endDate, selectedAccountId, selectedProperty || undefined),
      ])

      // Recolectar errores para mostrar UN solo toast
      const errors: string[] = []

      if (metricsData.status === "fulfilled") {
        setMetrics(metricsData.value)
      } else {
        const errorMsg = metricsData.reason?.message || "Error loading metrics"
        console.error("Error loading SEO metrics:", metricsData.reason)
        errors.push(errorMsg)
      }

      if (previousMetricsData.status === "fulfilled") {
        setPreviousMetrics(previousMetricsData.value)
      } else if (previousMetricsData.status === "rejected") {
        // No es crítico si falla el período anterior, solo no mostraremos comparación
        console.warn("Could not load previous period metrics:", previousMetricsData.reason)
      }

      if (queriesData.status === "fulfilled") {
        setQueries(queriesData.value)
      } else if (queriesData.status === "rejected") {
        // No mostrar error individual, solo registrar
        console.error("Error loading SEO queries:", queriesData.reason)
      }

      if (pagesData.status === "fulfilled") {
        setPages(pagesData.value)
      } else if (pagesData.status === "rejected") {
        // No mostrar error individual, solo registrar
        console.error("Error loading SEO pages:", pagesData.reason)
      }

      if (trendsData.status === "fulfilled") {
        setTrends(trendsData.value)
      } else if (trendsData.status === "rejected") {
        // No es crítico si falla trends
        console.warn("Could not load SEO trends:", trendsData.reason)
      }

      // Solo mostrar UN error si hay errores críticos (metrics es el más importante)
      if (errors.length > 0) {
        const mainError = errors[0]
        toast.error(mainError)
      }
    } catch (err: any) {
      console.error("Error in SEO loadData:", err)
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedAccountId, selectedProperty, selectedPlatform])

  useEffect(() => {
    if (selectedAccountId) {
      // Forzar refresh cuando cambian las fechas, cuenta o propiedad
      loadData(true)
    }
  }, [selectedAccountId, selectedProperty, selectedPlatform, dateRange.start, dateRange.end])

  // Update when quickDays changes
  useEffect(() => {
    if (quickDays !== null) {
      const newRange = {
        start: subDays(new Date(), quickDays),
        end: new Date(),
      }
      setDateRange(newRange)
      // Forzar refresh cuando cambian las fechas rápidas
      if (selectedAccountId) {
        loadData(true)
      }
    }
  }, [quickDays, selectedAccountId])

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  // Get selected property domain name for display
  const selectedPropertyDomain = selectedProperty 
    ? extractDomain(selectedProperty)
    : null

  const platformNames: Record<string, string> = {
    google: "Google Search Console",
    meta: "Meta (Facebook/Instagram)",
    linkedin: "LinkedIn"
  }

  return (
    <div className="p-4 space-y-4">
      {/* Reusable Header */}
      <PageHeader
        title="SEO"
        subtitle="Rendimiento en motores de búsqueda"
        domainName={selectedPropertyDomain}
        quickDays={quickDays}
        onQuickDaysChange={setQuickDays}
        onDateRangeChange={setDateRange}
      >
        <select
          value={selectedPlatform}
          onChange={(e) => {
            const newPlatform = e.target.value
            setSelectedPlatform(newPlatform)
            setAccountId(undefined)
            setSelectedProperty(null)
            setProperties([])
            setMetrics(null)
            setTrends([])
            setPreviousMetrics(null)
            setQueries([])
            setPages([])
          }}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="google">Google Search Console</option>
          <option value="meta">Meta (Facebook/Instagram)</option>
          <option value="linkedin">LinkedIn</option>
        </select>

        {accounts.length > 0 && (
          <select
            value={selectedAccountId || ""}
            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.account_name || acc.account_id}
              </option>
            ))}
          </select>
        )}
        {properties.length > 0 && selectedPlatform === "google" && (
          <select
            value={selectedProperty || ""}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {properties.map((prop) => (
              <option key={prop.property_uri} value={prop.property_uri}>
                {extractDomain(prop.property_uri)}
              </option>
            ))}
          </select>
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
                // Forzar refresh cuando cambian las fechas
                if (selectedAccountId) {
                  setTimeout(() => loadData(true), 100)
                }
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
                // Forzar refresh cuando cambian las fechas
                if (selectedAccountId) {
                  setTimeout(() => loadData(true), 100)
                }
              }}
              className="px-2 py-1 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={loading || !selectedAccountId}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Show alert if there are no accounts */}
      {accounts.length === 0 && (
        <div className="p-6">
          <Alert
            type="info"
            title={`No ${platformNames[selectedPlatform] || selectedPlatform} accounts configured`}
            message={`Connect your ${platformNames[selectedPlatform] || selectedPlatform} account in Settings > Accounts to get started.`}
            action={{
              label: "Go to Settings",
              onClick: () => (window.location.href = "/accounts"),
            }}
          />
        </div>
      )}

      {/* Contenido de datos - cambia según el estado */}
      {/* Solo mostrar gráficas si hay cuentas */}
      {accounts.length > 0 && (
        <>
          {loading && !metrics ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : metrics && calculatedChanges ? (
        <>
          {/* Dashboard Compacto - KPIs Esenciales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">👆</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Clicks</p>
                  <p className="text-xl font-bold text-text mb-0.5">{formatNumber(metrics.clicks)}</p>
                  {previousMetrics && (
                    <p className="text-[9px] text-text-secondary mb-1">
                      vs {formatNumber(previousMetrics.clicks)}
                    </p>
                  )}
                  <span className={`text-[10px] font-semibold ${calculatedChanges.clicksChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {calculatedChanges.clicksChange >= 0 ? "↑" : "↓"} {Math.abs(calculatedChanges.clicksChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">👁️</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Impressions</p>
                  <p className="text-xl font-bold text-text mb-0.5">{formatNumber(metrics.impressions)}</p>
                  {previousMetrics && (
                    <p className="text-[9px] text-text-secondary mb-1">
                      vs {formatNumber(previousMetrics.impressions)}
                    </p>
                  )}
                  <span className={`text-[10px] font-semibold ${calculatedChanges.impressionsChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {calculatedChanges.impressionsChange >= 0 ? "↑" : "↓"} {Math.abs(calculatedChanges.impressionsChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">CTR</p>
                  <p className="text-xl font-bold text-text mb-0.5">{metrics.ctr.toFixed(2)}%</p>
                  {previousMetrics && (
                    <p className="text-[9px] text-text-secondary mb-1">
                      vs {previousMetrics.ctr.toFixed(2)}%
                    </p>
                  )}
                  <span className={`text-[10px] font-semibold ${calculatedChanges.ctrChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {calculatedChanges.ctrChange >= 0 ? "↑" : "↓"} {Math.abs(calculatedChanges.ctrChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📍</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Average Position</p>
                  <p className="text-xl font-bold text-text mb-0.5">{metrics.position.toFixed(1)}</p>
                  {previousMetrics && (
                    <p className="text-[9px] text-text-secondary mb-1">
                      vs {previousMetrics.position.toFixed(1)}
                    </p>
                  )}
                  <span className={`text-[10px] font-semibold ${calculatedChanges.positionChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {calculatedChanges.positionChange >= 0 ? "↑" : "↓"} {Math.abs(calculatedChanges.positionChange).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Unique SEO Chart: Inverted Average Position (lower is better) */}
          {trends.length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">📍 Evolución de Posición Promedio (menor = mejor)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={trends.map(t => ({
                      ...t,
                      dateFormatted: format(new Date(t.date), "MMM dd"),
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="dateFormatted"
                      stroke={colors.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke={colors.textSecondary} 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      reversed
                      domain={[1, 'auto']}
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
                        const trend = trends.find(t => format(new Date(t.date), "MMM dd") === value)
                        return trend ? format(new Date(trend.date), "dd MMM yyyy") : value
                      }}
                      labelStyle={{ color: colors.text }}
                      formatter={(value: number) => [value.toFixed(1), "Posición"]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      iconType="line"
                      iconSize={12}
                    />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Posición Promedio"
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Secondary Chart: Clicks and CTR Trend */}
          {trends.length > 0 && (
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">👆 Clicks y CTR</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={trends.map(t => ({
                      ...t,
                      dateFormatted: format(new Date(t.date), "MMM dd"),
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="dateFormatted"
                      stroke={colors.textSecondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
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
                      labelStyle={{ color: colors.text }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      iconSize={12}
                    />
                    <Bar
                      dataKey="clicks"
                      fill={colors.primary}
                      name="Clicks"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {queries.length > 0 && (
              <Card className="p-4">
                <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
                  <span>🔍</span>
                  Top Keywords
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs font-medium text-text-secondary">Keyword</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Clicks</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Impr.</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">CTR</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.slice(0, 15).map((query, index) => (
                        <tr key={index} className="border-b border-border last:border-0 hover:bg-surface/50">
                          <td className="py-2 px-2 font-medium text-text truncate max-w-[200px]" title={query.query}>
                            {query.query}
                          </td>
                          <td className="py-2 px-2 text-right text-text">{formatNumber(query.clicks)}</td>
                          <td className="py-2 px-2 text-right text-text-secondary">{formatNumber(query.impressions)}</td>
                          <td className="py-2 px-2 text-right text-text">{query.ctr.toFixed(1)}%</td>
                          <td className="py-2 px-2 text-right">
                            <span className={query.position <= 3 ? "text-green-500 font-semibold" : "text-text"}>
                              {query.position.toFixed(0)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {pages.length > 0 && (
              <Card className="p-4">
                <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
                  <span>📄</span>
                  Top Pages
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs font-medium text-text-secondary">Page</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Clicks</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Impr.</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.slice(0, 15).map((page, index) => (
                        <tr key={index} className="border-b border-border last:border-0 hover:bg-surface/50">
                          <td className="py-2 px-2 font-medium text-text truncate max-w-[250px]" title={page.page}>
                            {page.page.replace(/^https?:\/\//, '').replace(/\/$/, '') || page.page}
                          </td>
                          <td className="py-2 px-2 text-right text-text">{formatNumber(page.clicks)}</td>
                          <td className="py-2 px-2 text-right text-text-secondary">{formatNumber(page.impressions)}</td>
                          <td className="py-2 px-2 text-right text-text">{page.ctr.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
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
        </>
      )}
    </div>
  )
}

