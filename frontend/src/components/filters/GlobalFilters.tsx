/**
 * Componente de filtros globales reutilizable
 * Se usa en Dashboard, Ads, Analytics y SEO
 */
import { useGlobalFilters } from '../../hooks/useGlobalFilters';
import { Calendar, RefreshCw } from 'lucide-react';
import Card from '../common/Card';

interface GlobalFiltersProps {
  showPlatform?: boolean;
  showDevice?: boolean;
  showCountry?: boolean;
  showAccount?: boolean;
  accounts?: Array<{ id: number; name: string }>;
}

export default function GlobalFilters({
  showPlatform = false,
  showDevice = false,
  showCountry = false,
  showAccount = false,
  accounts = [],
}: GlobalFiltersProps) {
  const {
    filters,
    setDatePreset,
    setPlatform,
    setAccountId,
    setDevice,
    setCountry,
    resetFilters,
    datePresets,
  } = useGlobalFilters();

  const platformOptions = [
    { value: 'all', label: 'All platforms', icon: '📊' },
    { value: 'google', label: 'Google Ads', icon: '🔍' },
    { value: 'meta', label: 'Meta Ads', icon: '📘' },
    { value: 'linkedin', label: 'LinkedIn Ads', icon: '💼' },
    { value: 'tiktok', label: 'TikTok Ads', icon: '🎵' },
  ];

  const deviceOptions = [
    { value: 'all', label: 'All', icon: '📱' },
    { value: 'desktop', label: 'Desktop', icon: '💻' },
    { value: 'mobile', label: 'Mobile', icon: '📱' },
    { value: 'tablet', label: 'Tablet', icon: '📲' },
  ];

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date range selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-secondary" />
          <select
            value={filters.dateRange.preset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {datePresets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Platform selector */}
        {showPlatform && (
          <select
            value={filters.platform || 'all'}
            onChange={(e) => setPlatform(e.target.value as any)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Account selector */}
        {showAccount && accounts.length > 0 && (
          <select
            value={filters.accountId || ''}
            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}

        {/* Device selector */}
        {showDevice && (
          <select
            value={filters.device || 'all'}
            onChange={(e) => setDevice(e.target.value as any)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {deviceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Country selector */}
        {showCountry && (
          <select
            value={filters.country || ''}
            onChange={(e) => setCountry(e.target.value || undefined)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All countries</option>
            <option value="US">🇺🇸 United States</option>
            <option value="MX">🇲🇽 México</option>
            <option value="ES">🇪🇸 España</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="AR">🇦🇷 Argentina</option>
          </select>
        )}

        {/* Botón de reset */}
        <button
          onClick={resetFilters}
          className="ml-auto px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-background-secondary rounded-lg transition-colors flex items-center gap-2"
          title="Resetear filtros"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Resetear</span>
        </button>
      </div>

      {/* Mostrar rango de fechas actual */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-text-secondary">
          📅 Mostrando datos desde{' '}
          <span className="font-medium text-text">
            {new Date(filters.dateRange.startDate).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>{' '}
          hasta{' '}
          <span className="font-medium text-text">
            {new Date(filters.dateRange.endDate).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </p>
      </div>
    </Card>
  );
}
