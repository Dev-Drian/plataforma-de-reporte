import { subDays } from "date-fns"
import { ReactNode } from "react"

interface DateRange {
  start: Date
  end: Date
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  domainName?: string | null
  quickDays: number | null
  onQuickDaysChange: (days: number) => void
  onDateRangeChange: (range: DateRange) => void
  children?: ReactNode // Para selectores adicionales
}

export default function PageHeader({
  title,
  subtitle,
  domainName,
  quickDays,
  onQuickDaysChange,
  onDateRangeChange,
  children,
}: PageHeaderProps) {
  const setQuickDateRange = (days: number) => {
    onQuickDaysChange(days)
    onDateRangeChange({
      start: subDays(new Date(), days),
      end: new Date(),
    })
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Primera fila: Título, Selectores y Período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
        </div>

        {/* Selector de Días Rápido - Arriba */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary whitespace-nowrap">Período:</span>
          <div className="flex gap-1">
            {[7, 15, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setQuickDateRange(days)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  quickDays === days
                    ? "bg-primary text-white"
                    : "bg-background border border-border text-text hover:bg-background-secondary"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Additional selectors (accounts, properties, etc.) */}
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>

      {/* Segunda fila: Nombre del dominio/propiedad */}
      {domainName && (
        <div>
          <h2 className="text-xl font-bold text-text">{domainName}</h2>
        </div>
      )}
    </div>
  )
}

