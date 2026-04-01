import { useState } from "react"
import Card from "../common/Card"

interface ComparisonOption {
  label: string
  value: string
  dateRange?: string
}

interface SearchTypeOption {
  label: string
  value: string
  icon?: string
}

interface GroupedFiltersProps {
  comparisonPeriod: string
  onComparisonPeriodChange: (value: string) => void
  searchType: string
  onSearchTypeChange: (value: string) => void
  showPreviousTrendLine?: boolean
  onShowPreviousTrendLineChange?: (value: boolean) => void
  matchWeekdays?: boolean
  onMatchWeekdaysChange?: (value: boolean) => void
  showChangePercent?: boolean
  onShowChangePercentChange?: (value: boolean) => void
}

export default function GroupedFilters({
  comparisonPeriod,
  onComparisonPeriodChange,
  searchType,
  onSearchTypeChange,
  showPreviousTrendLine = true,
  onShowPreviousTrendLineChange,
  matchWeekdays = true,
  onMatchWeekdaysChange,
  showChangePercent = true,
  onShowChangePercentChange,
}: GroupedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const comparisonOptions: ComparisonOption[] = [
    { label: "Disabled", value: "disabled" },
    { label: "Previous Period", value: "previous_period", dateRange: "Jul 27, 2024 - Oct 25, 2024" },
    { label: "Year Over Year", value: "year_over_year" },
    { label: "Previous Month", value: "previous_month" },
    { label: "Custom", value: "custom" },
  ]

  const searchTypeOptions: SearchTypeOption[] = [
    { label: "Web", value: "web" },
    { label: "Discover", value: "discover", icon: "⭐" },
    { label: "News", value: "news", icon: "📰" },
    { label: "Image", value: "image", icon: "📷" },
    { label: "Video", value: "video", icon: "🎥" },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-background border border-border rounded-lg text-text hover:bg-background-secondary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filter
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute left-0 top-full mt-2 w-80 z-50 p-4 shadow-lg">
            <div className="space-y-4">
              {/* Comparison Period */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-2">Comparison Period</h3>
                <div className="space-y-1">
                  {comparisonOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background-secondary cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="comparisonPeriod"
                        value={option.value}
                        checked={comparisonPeriod === option.value}
                        onChange={(e) => onComparisonPeriodChange(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm text-text">{option.label}</span>
                      {option.dateRange && (
                        <span className="text-xs text-text-secondary ml-auto">{option.dateRange}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Comparison Settings */}
              {comparisonPeriod !== "disabled" && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-2">Comparison Settings</h3>
                  <div className="space-y-2">
                    {onShowPreviousTrendLineChange && (
                      <label className="flex items-center gap-2 p-2 rounded hover:bg-background-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPreviousTrendLine}
                          onChange={(e) => onShowPreviousTrendLineChange(e.target.checked)}
                          className="w-4 h-4 rounded text-primary"
                        />
                        <span className="text-sm text-text">Previous Trend Line</span>
                      </label>
                    )}
                    {onMatchWeekdaysChange && (
                      <label className="flex items-center gap-2 p-2 rounded hover:bg-background-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchWeekdays}
                          onChange={(e) => onMatchWeekdaysChange(e.target.checked)}
                          className="w-4 h-4 rounded text-primary"
                        />
                        <span className="text-sm text-text">Match Weekdays</span>
                      </label>
                    )}
                    {onShowChangePercentChange && (
                      <label className="flex items-center gap-2 p-2 rounded hover:bg-background-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showChangePercent}
                          onChange={(e) => onShowChangePercentChange(e.target.checked)}
                          className="w-4 h-4 rounded text-primary"
                        />
                        <span className="text-sm text-text">Show change %</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Search Type */}
              <div>
                <h3 className="text-sm font-semibold text-text mb-2">Search Type</h3>
                <div className="space-y-1">
                  {searchTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background-secondary cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="searchType"
                        value={option.value}
                        checked={searchType === option.value}
                        onChange={(e) => onSearchTypeChange(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      {option.icon && <span>{option.icon}</span>}
                      <span className="text-sm text-text">{option.label}</span>
                      {option.value === "web" && (
                        <svg className="w-4 h-4 text-primary ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
