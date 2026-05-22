import { useState } from "react"

interface PeriodOption {
  label: string
  value: string
  days?: number
}

interface PeriodSelectorProps {
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}

export default function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const periodOptions: PeriodOption[] = [
    { label: "7 days", value: "7d", days: 7 },
    { label: "14 days", value: "14d", days: 14 },
    { label: "28 days", value: "28d", days: 28 },
    { label: "Last Week", value: "last_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Quarter", value: "this_quarter" },
    { label: "Last Quarter", value: "last_quarter" },
    { label: "Year to Date", value: "ytd" },
    { label: "3 months", value: "3m", days: 90 },
    { label: "6 months", value: "6m", days: 180 },
    { label: "8 months", value: "8m", days: 240 },
    { label: "12 months", value: "12m", days: 365 },
    { label: "16 months", value: "16m", days: 480 },
    { label: "2 years", value: "2y", days: 730 },
    { label: "3 years", value: "3y", days: 1095 },
    { label: "Custom", value: "custom" },
  ]

  const selectedLabel = periodOptions.find((opt) => opt.value === selectedPeriod)?.label || selectedPeriod

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-background border border-border rounded-lg text-text hover:bg-background-secondary transition-colors"
      >
        <span>{selectedLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="flex gap-1 mb-2 border-b border-border pb-2">
                <button className="px-3 py-1 text-xs font-medium text-primary border-b-2 border-primary">
                  Day
                </button>
                <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text">
                  Week
                </button>
                <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-text">
                  Month
                </button>
              </div>
              <div className="space-y-1">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onPeriodChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-background-secondary transition-colors ${
                      selectedPeriod === option.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
