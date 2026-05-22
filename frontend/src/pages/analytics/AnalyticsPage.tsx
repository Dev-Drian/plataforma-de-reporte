import { useState, useEffect, useCallback } from "react"
import { format, subDays } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { toast } from "sonner"
import { useTheme } from "../../contexts/ThemeContext"
import { 
  analyticsService, 
  type AnalyticsMetrics,
  type AnalyticsProperty,
  type UsersTrendItem,
  type TrafficSource,
  type DeviceBreakdown,
  type TopPage,
  type TopCountry
} from "../../services/analytics"
import { accountsService, type Account } from "../../services/accounts"
import { ChevronDown, Calendar, BarChart3, RefreshCw } from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

interface DateRange {
  start: Date
  end: Date
}

const AnalyticsPage = () => {
  const { colors } = useTheme()
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  const [quickDays, setQuickDays] = useState<number | null>(30)
  
  // Account & Property selection
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [properties, setProperties] = useState<AnalyticsProperty[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  
  // Loading states
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Data states
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [usersTrend, setUsersTrend] = useState<UsersTrendItem[]>([])
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([])
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceBreakdown[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [topCountries, setTopCountries] = useState<TopCountry[]>([])

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  // Load Analytics accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true)
        const allAccounts = await accountsService.getAccounts()
        const analyticsAccounts = allAccounts.filter(
          (acc) => acc.account_type === "analytics" && acc.is_active
        )
        setAccounts(analyticsAccounts)
        
        if (analyticsAccounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(analyticsAccounts[0].id)
        }
      } catch (err: any) {
        toast.error("Error loading accounts: " + (err.message || "Unknown error"))
      } finally {
        setLoadingAccounts(false)
      }
    }
    
    loadAccounts()
  }, [])

  // Load properties when account changes
  useEffect(() => {
    const loadProperties = async () => {
      if (!selectedAccountId) {
        setProperties([])
        setSelectedPropertyId(null)
        return
      }
      
      setLoadingProperties(true)
      try {
        const props = await analyticsService.getProperties(selectedAccountId)
        setProperties(props)
        
        if (props.length > 0) {
          setSelectedPropertyId(props[0].property_id)
        } else {
          setSelectedPropertyId(null)
        }
      } catch (err: any) {
        toast.error("Error loading properties: " + (err.message || "Unknown error"))
        setProperties([])
        setSelectedPropertyId(null)
      } finally {
        setLoadingProperties(false)
      }
    }
    
    loadProperties()
  }, [selectedAccountId])

  // Load data when property or date range changes
  const loadData = useCallback(async () => {
    if (!selectedAccountId || !selectedPropertyId) {
      return
    }

    setLoading(true)
    
    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)

      const [
        metricsData,
        trendData,
        sourcesData,
        devicesData,
        pagesData,
        countriesData
      ] = await Promise.all([
        analyticsService.getMetrics(startDate, endDate, selectedAccountId, selectedPropertyId),
        analyticsService.getUsersTrend(startDate, endDate, selectedAccountId, selectedPropertyId),
        analyticsService.getTrafficSources(startDate, endDate, selectedAccountId, selectedPropertyId),
        analyticsService.getDeviceBreakdown(startDate, endDate, selectedAccountId, selectedPropertyId),
        analyticsService.getTopPages(startDate, endDate, selectedAccountId, selectedPropertyId),
        analyticsService.getTopCountries(startDate, endDate, selectedAccountId, selectedPropertyId)
      ])

      setMetrics(metricsData)
      setUsersTrend(trendData)
      setTrafficSources(sourcesData)
      setDeviceBreakdown(devicesData)
      setTopPages(pagesData)
      setTopCountries(countriesData)
      
      toast.success("Analytics data loaded successfully")
    } catch (err: any) {
      toast.error(err.message || "Error loading Analytics data")
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId, selectedPropertyId, dateRange])

  useEffect(() => {
    if (selectedAccountId && selectedPropertyId) {
      loadData()
    }
  }, [selectedPropertyId, dateRange])

  const handleQuickDateSelect = (days: number) => {
    setQuickDays(days)
    setDateRange({
      start: subDays(new Date(), days),
      end: new Date(),
    })
  }

  // Loading state
  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  // No accounts state
  if (accounts.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <BarChart3 className="w-16 h-16 mx-auto text-text-secondary" />
          <h1 className="text-2xl font-bold text-text">No Analytics Accounts</h1>
          <p className="text-text-secondary">
            Connect a Google Analytics account in Settings {">"} Accounts to view your analytics data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <p className="text-sm text-text-secondary">User behavior and web traffic analysis</p>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Account Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-secondary mb-1">Account</label>
            <div className="relative">
              <select
                value={selectedAccountId || ""}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 pr-8 bg-background border border-border rounded-lg text-sm text-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name || acc.account_id}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Property Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-secondary mb-1">Property (GA4)</label>
            <div className="relative">
              {loadingProperties ? (
                <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-secondary">
                  Loading properties...
                </div>
              ) : properties.length === 0 ? (
                <div className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-secondary">
                  No properties found
                </div>
              ) : (
                <>
                  <select
                    value={selectedPropertyId || ""}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-background border border-border rounded-lg text-sm text-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {properties.map((prop) => (
                      <option key={prop.property_id} value={prop.property_id}>
                        {prop.property_name} ({prop.property_id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                </>
              )}
            </div>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handleQuickDateSelect(days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  quickDays === days
                    ? "bg-primary text-white"
                    : "bg-background border border-border text-text hover:bg-surface"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading || !selectedPropertyId}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </Card>

      {/* Loading or No Property Selected */}
      {loading && !metrics ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : !selectedPropertyId ? (
        <Card className="p-8 text-center">
          <p className="text-text-secondary">Select a property to view analytics data.</p>
        </Card>
      ) : metrics ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">👥</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Users</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.users)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📊</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Sessions</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.sessions)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📄</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Pageviews</p>
                  <p className="text-xl font-bold text-text">{formatNumber(metrics.pageviews)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">⏱️</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Bounce Rate</p>
                  <p className="text-xl font-bold text-text">{metrics.bounce_rate}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">⌚</span>
                <div className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1 font-medium">Avg Duration</p>
                  <p className="text-xl font-bold text-text">{formatDuration(metrics.avg_session_duration)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Users vs Sessions Trend */}
          <Card className="p-4">
            <h3 className="text-base font-semibold text-text mb-4">👥 Users vs Sessions</h3>
            <div className="h-80">
              {usersTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={usersTrend.map(t => ({
                      ...t,
                      dateFormatted: format(new Date(t.date), "MMM dd"),
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke={colors.textSecondary} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={colors.textSecondary} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: colors.text }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} iconType="line" iconSize={12} />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} name="Users" dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={3} name="Sessions" dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary">No trend data available</div>
              )}
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Traffic Sources Pie */}
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">🔗 Traffic Sources</h3>
              <div className="h-80">
                {trafficSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficSources}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trafficSources.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-secondary">No traffic source data</div>
                )}
              </div>
            </Card>

            {/* Device Breakdown Bar */}
            <Card className="p-4">
              <h3 className="text-base font-semibold text-text mb-4">📱 Device Breakdown</h3>
              <div className="h-80">
                {deviceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceBreakdown} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                      <XAxis dataKey="device" stroke={colors.textSecondary} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={colors.textSecondary} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-secondary">No device data</div>
                )}
              </div>
            </Card>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Pages Table */}
            <Card className="p-4">
              <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
                <span>📄</span>Top Pages
              </h2>
              {topPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-xs font-medium text-text-secondary">Page</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Views</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Users</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-text-secondary">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.map((page, index) => (
                        <tr key={index} className="border-b border-border last:border-0 hover:bg-surface/50">
                          <td className="py-2 px-2 font-medium text-text truncate max-w-[200px]">{page.page}</td>
                          <td className="py-2 px-2 text-right text-text">{formatNumber(page.pageviews)}</td>
                          <td className="py-2 px-2 text-right text-text-secondary">{formatNumber(page.uniqueUsers)}</td>
                          <td className="py-2 px-2 text-right text-text">{page.avgTime}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-text-secondary">No page data</div>
              )}
            </Card>

            {/* Top Countries Grid */}
            <Card className="p-4">
              <h2 className="text-base font-semibold text-text mb-3 flex items-center gap-2">
                <span>🌍</span>Top Countries
              </h2>
              {topCountries.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {topCountries.map((country, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-surface/30 rounded-lg">
                      <span className="text-sm font-medium text-text">{country.country}</span>
                      <span className="text-sm font-bold text-primary">{formatNumber(country.sessions)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-text-secondary">No country data</div>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AnalyticsPage
