"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { format, subDays } from "date-fns"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Eye, Target, Star, BarChart3, Search, MapPin, Globe, Phone, Navigation, TrendingUp, TrendingDown } from "lucide-react"
import Card from "../../components/common/Card"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import Alert from "../../components/common/Alert"
import { useGlobalFilters } from "../../hooks/useGlobalFilters"
import { toast } from "sonner"
import { gbpService, type GBPMetrics, type GBPLocation } from "../../services/analytics"
import { accountsService, type Account } from "../../services/accounts"
import { useTheme } from "../../contexts/ThemeContext"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export default function GBPPage() {
  const { colors } = useTheme()
  const { filters, setAccountId } = useGlobalFilters()
  const selectedAccountId = filters.accountId
  
  // Memoizar dateRange para evitar recrearlo en cada render
  const dateRange = useMemo(() => ({
    start: new Date(filters.dateRange.startDate),
    end: new Date(filters.dateRange.endDate),
  }), [filters.dateRange.startDate, filters.dateRange.endDate])
  
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [locations, setLocations] = useState<GBPLocation[]>([])
  const [metrics, setMetrics] = useState<GBPMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<GBPMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const loadingRef = useRef(false)
  const errorShownRef = useRef(false)

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd")
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }
  
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true)
        const allAccounts = await accountsService.getAccounts()
        const gbpAccounts = allAccounts.filter(
          (acc) => acc.platform === "google" && acc.account_type === "gbp" && acc.is_active,
        )
        setAccounts(gbpAccounts)
        if (gbpAccounts.length > 0) {
          toast.success(`${gbpAccounts.length} Business Profile account(s) loaded`)
        }
      } catch (err: any) {
        toast.error("Error loading accounts: " + (err.message || "Unknown error"))
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [])

  useEffect(() => {
    const loadLocations = async () => {
      if (!selectedAccountId) return

      try {
        const locs = await gbpService.getLocations(selectedAccountId)
        setLocations(locs)
        if (locs.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locs[0].location_id)
        }
      } catch (err: any) {
        toast.error("Error loading locations")
      }
    }

    loadLocations()
  }, [selectedAccountId])

  const loadData = useCallback(async () => {
    if (!selectedAccountId) {
      return
    }

    // Evitar ejecuciones duplicadas
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    errorShownRef.current = false

    try {
      const startDate = formatDate(dateRange.start)
      const endDate = formatDate(dateRange.end)
      
      const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      const previousStartDate = formatDate(subDays(dateRange.start, daysDiff))
      const previousEndDate = formatDate(subDays(dateRange.end, daysDiff))

      const [metricsData, previousMetricsData] = await Promise.allSettled([
        gbpService.getMetrics(startDate, endDate, selectedAccountId, selectedLocationId || undefined),
        gbpService.getMetrics(previousStartDate, previousEndDate, selectedAccountId, selectedLocationId || undefined),
      ])

      // Recolectar errores para mostrar UN solo toast
      const errors: string[] = []

      if (metricsData.status === "fulfilled") {
        setMetrics(metricsData.value)
      } else {
        const errorMsg = metricsData.reason?.message || "Error loading metrics"
        console.error("Error loading GBP metrics:", metricsData.reason)
        errors.push(errorMsg)
      }

      if (previousMetricsData.status === "fulfilled") {
        setPreviousMetrics(previousMetricsData.value)
      } else if (previousMetricsData.status === "rejected") {
        // No es crítico si falla el período anterior, solo no mostraremos comparación
        console.warn("Could not load previous period metrics:", previousMetricsData.reason)
      }

      // Solo mostrar UN error si hay errores críticos (metrics es el más importante)
      if (errors.length > 0) {
        if (!errorShownRef.current) {
          const mainError = errors[0]
          toast.error("Error loading data: " + mainError)
          errorShownRef.current = true
        }
      } else {
        errorShownRef.current = false
        toast.success("Business Profile data loaded successfully")
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [selectedAccountId, selectedLocationId, dateRange.start, dateRange.end])

  useEffect(() => {
    if (selectedAccountId) {
      loadData()
    }
  }, [selectedAccountId, loadData])

  // Prepare data for charts
  const viewsData = metrics ? [
    { name: "Search", value: metrics.views_search, color: COLORS[0] },
    { name: "Maps", value: metrics.views_maps, color: COLORS[1] },
  ] : []

  const actionsData = metrics ? [
    { name: "Website", value: metrics.actions_website, color: COLORS[0] },
    { name: "Directions", value: metrics.actions_directions, color: COLORS[1] },
    { name: "Phone", value: metrics.actions_phone, color: COLORS[2] },
  ] : []

  const viewsChange = metrics && previousMetrics 
    ? calculateChange(metrics.total_views, previousMetrics.total_views)
    : 0

  const actionsChange = metrics && previousMetrics 
    ? calculateChange(metrics.total_actions, previousMetrics.total_actions)
    : 0

  const reviewsChange = metrics && previousMetrics 
    ? calculateChange(metrics.total_reviews, previousMetrics.total_reviews)
    : 0

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl font-bold text-text">Business Profile</h1>
          <p className="text-sm text-text-secondary">Google Business Profile metrics</p>
        </motion.div>
        <Alert
          type="warning"
          title="No Connected Accounts"
          message="Connect a Google Business Profile account in Settings > Accounts to view metrics."
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-bold text-text">Business Profile</h1>
        <p className="text-sm text-text-secondary">Business location metrics and insights</p>
      </motion.div>

      {/* Account and Location Selector */}
      {accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 border-2 border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary mb-2">
                  <Globe className="w-4 h-4" />
                  Account
                </label>
                <select
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-text focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:border-primary/50"
                  value={selectedAccountId || ""}
                  onChange={(e) => {
                    const accountId = e.target.value ? parseInt(e.target.value) : undefined
                    setAccountId(accountId)
                    setSelectedLocationId(null)
                  }}
                >
                  <option value="">Select an account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name || acc.account_id}
                    </option>
                  ))}
                </select>
              </div>
              {locations.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary mb-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-text focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:border-primary/50"
                    value={selectedLocationId || ""}
                    onChange={(e) => setSelectedLocationId(e.target.value || null)}
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {loading && !metrics ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      ) : metrics ? (
        <>
          {/* Main KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-4 border-2 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">Total Views</p>
                    <p className="text-xl font-bold text-text">{formatNumber(metrics.total_views)}</p>
                    {previousMetrics && (
                      <div className="flex items-center gap-1 mt-1">
                        {viewsChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                        <p className={`text-xs font-semibold ${viewsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(viewsChange).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-4 border-2 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">Total Actions</p>
                    <p className="text-xl font-bold text-text">{formatNumber(metrics.total_actions)}</p>
                    {previousMetrics && (
                      <div className="flex items-center gap-1 mt-1">
                        {actionsChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                        <p className={`text-xs font-semibold ${actionsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(actionsChange).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-4 border-2 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">Reviews</p>
                    <p className="text-xl font-bold text-text">{formatNumber(metrics.total_reviews)}</p>
                    {previousMetrics && (
                      <div className="flex items-center gap-1 mt-1">
                        {reviewsChange >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                        <p className={`text-xs font-semibold ${reviewsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(reviewsChange).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-4 border-2 border-border hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">Rating</p>
                    <p className="text-xl font-bold text-text">
                      {metrics.average_rating > 0 ? metrics.average_rating.toFixed(1) : 'N/A'}
                    </p>
                    {metrics.average_rating > 0 && (
                      <p className="text-xs mt-1 text-text-secondary">
                        {metrics.new_reviews} new
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Views Chart */}
            <Card className="p-5 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text">Views by Source</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={viewsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatNumber(entry.value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {viewsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Actions Chart */}
            <Card className="p-5 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text">Customer Actions</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="name"
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]}>
                      {actionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Metrics Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <Card className="p-5 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text">Views Breakdown</h3>
              </div>
              <div className="space-y-3">
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-surface/30 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text">Search</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.views_search)}</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-surface/30 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text">Maps</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.views_maps)}</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-primary/10 rounded-xl border border-primary/20"
                >
                  <span className="text-sm font-bold text-text">Total</span>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.total_views)}</span>
                </motion.div>
              </div>
            </Card>

            <Card className="p-5 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text">Actions Breakdown</h3>
              </div>
              <div className="space-y-3">
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-surface/30 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text">Website</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.actions_website)}</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-surface/30 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text">Directions</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.actions_directions)}</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-surface/30 rounded-xl border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text">Phone</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.actions_phone)}</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex justify-between items-center py-3 px-4 bg-primary/10 rounded-xl border border-primary/20"
                >
                  <span className="text-sm font-bold text-text">Total</span>
                  <span className="text-sm font-bold text-primary">{formatNumber(metrics.total_actions)}</span>
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Locations Table */}
          {locations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-5 border-2 border-border">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-semibold text-text">Locations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Name</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Account</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc, index) => (
                        <motion.tr
                          key={loc.location_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                          className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
                        >
                          <td className="py-3 px-3 font-medium text-text">{loc.location_name}</td>
                          <td className="py-3 px-3 text-text-secondary">{loc.account_name}</td>
                          <td className="py-3 px-3 text-text-secondary">
                            {loc.address && loc.address.length > 0 ? loc.address.join(", ") : "N/A"}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      ) : (
        <Alert
          type="info"
          title="No Data"
          message="Select an account and location to view metrics."
        />
      )}
    </div>
  )
}
