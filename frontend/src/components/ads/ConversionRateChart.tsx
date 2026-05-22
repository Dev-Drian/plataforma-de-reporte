import { useState } from "react"
import { motion } from "framer-motion"
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
import { MoreVertical, ChevronDown } from "lucide-react"
import Card from "../common/Card"
import { useTheme } from "../../contexts/ThemeContext"

interface ConversionChartData {
  date: string
  [key: string]: string | number
}

interface ConversionRateChartProps {
  title: string
  data: ConversionChartData[]
  lines: Array<{
    dataKey: string
    name: string
    stroke: string
    color?: string
  }>
  filters?: {
    metric?: string
    breakdown?: string
    groupBy?: string
  }
}

export function ConversionRateChart({
  title,
  data,
  lines,
  filters = {
    metric: "Result Rate",
    breakdown: "Auto Time Breakdown",
    groupBy: "Campaign",
  },
}: ConversionRateChartProps) {
  const { colors } = useTheme()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const dropdowns = [
    { label: "Result Rate", key: "metric" },
    { label: "Auto Time Breakdown", key: "breakdown" },
    { label: "Campaign", key: "groupBy" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {dropdowns.map((dropdown) => (
            <div key={dropdown.key} className="relative">
              <button
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === dropdown.key ? null : dropdown.key
                  )
                }
                className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-text hover:bg-background-secondary transition-colors"
              >
                {filters[dropdown.key as keyof typeof filters] ||
                  dropdown.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {openDropdown === dropdown.key && (
                <div className="absolute top-full left-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 hover:bg-background-secondary rounded transition-colors text-sm text-text">
                      {filters[dropdown.key as keyof typeof filters] ||
                        dropdown.label}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.border}
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                stroke={colors.textSecondary}
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke={colors.textSecondary} style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                }}
              />
              <Legend />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.stroke}
                  strokeWidth={2}
                  dot={false}
                  name={line.name}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  )
}
