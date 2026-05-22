/**
 * Hook para gestionar filtros globales compartidos entre todas las páginas
 * Los filtros se persisten en localStorage
 */
import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

export interface DateRangePreset {
  label: string;
  value: string;
  days?: number;
}

export interface GlobalFilters {
  // Rango de fechas
  dateRange: {
    preset: 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';
    startDate: string;
    endDate: string;
  };
  
  // Platform (for Ads)
  platform?: 'all' | 'google' | 'meta' | 'linkedin' | 'tiktok';
  
  // Selected account
  accountId?: number;
  
  // Dispositivo (para Analytics)
  device?: 'all' | 'desktop' | 'mobile' | 'tablet';
  
  // País (para Analytics y SEO)
  country?: string;
}

const STORAGE_KEY = 'dashboard-global-filters';

const DATE_PRESETS: DateRangePreset[] = [
  { label: 'Hoy', value: 'today', days: 0 },
  { label: 'Ayer', value: 'yesterday', days: 1 },
  { label: 'Últimos 7 días', value: '7d', days: 7 },
  { label: 'Últimos 30 días', value: '30d', days: 30 },
  { label: 'Últimos 90 días', value: '90d', days: 90 },
  { label: 'Personalizado', value: 'custom' },
];

const getDefaultFilters = (): GlobalFilters => {
  const endDate = new Date();
  const startDate = subDays(endDate, 30);
  
  return {
    dateRange: {
      preset: '30d',
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    },
    platform: 'all',
    device: 'all',
  };
};

export const useGlobalFilters = () => {
  const [filters, setFilters] = useState<GlobalFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
    return getDefaultFilters();
  });

  // Persistir filtros en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters]);

  // Cambiar preset de fecha
  const setDatePreset = (preset: GlobalFilters['dateRange']['preset']) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case 'yesterday':
        startDate = subDays(endDate, 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate = subDays(endDate, 7);
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        break;
      case 'custom':
        // No hacer nada, el usuario elegirá manualmente
        return;
    }

    setFilters((prev) => ({
      ...prev,
      dateRange: {
        preset,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
    }));
  };

  // Cambiar rango personalizado
  const setCustomDateRange = (startDate: string, endDate: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        preset: 'custom',
        startDate,
        endDate,
      },
    }));
  };

  // Change platform
  const setPlatform = (platform: GlobalFilters['platform']) => {
    setFilters((prev) => ({ ...prev, platform }));
  };

  // Change account
  const setAccountId = (accountId: number | undefined) => {
    setFilters((prev) => ({ ...prev, accountId }));
  };

  // Cambiar dispositivo
  const setDevice = (device: GlobalFilters['device']) => {
    setFilters((prev) => ({ ...prev, device }));
  };

  // Cambiar país
  const setCountry = (country: string | undefined) => {
    setFilters((prev) => ({ ...prev, country }));
  };

  // Resetear filtros
  const resetFilters = () => {
    setFilters(getDefaultFilters());
  };

  return {
    filters,
    setDatePreset,
    setCustomDateRange,
    setPlatform,
    setAccountId,
    setDevice,
    setCountry,
    resetFilters,
    datePresets: DATE_PRESETS,
  };
};
