import api from '../config/api'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
}

export interface ThemeResponse {
  colors: ThemeColors
}

const DEFAULT_THEME: ThemeColors = {
  primary: '#0ea5e9',      // sky-500 (azul)
  secondary: '#3b82f6',    // blue-500
  accent: '#06b6d4',       // cyan-500
  background: '#f9fafb',   // gray-50
  surface: '#ffffff',      // white
  text: '#111827',         // gray-900
  textSecondary: '#6b7280', // gray-500
  border: '#e5e7eb',       // gray-200
  success: '#10b981',      // green-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
}

export const themeService = {
  async getTheme(): Promise<ThemeColors> {
    try {
      const response = await api.get<ThemeResponse>('/settings/theme')
      return response.data.colors || DEFAULT_THEME
    } catch (error) {
      console.error('Error fetching theme:', error)
      return DEFAULT_THEME
    }
  },

  async updateTheme(colors: ThemeColors): Promise<ThemeColors> {
    try {
      const response = await api.put<ThemeResponse>('/settings/theme', { colors })
      return response.data.colors || colors
    } catch (error) {
      console.error('Error updating theme:', error)
      throw error
    }
  },

  applyTheme(colors: ThemeColors) {
    const root = document.documentElement
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-secondary', colors.secondary)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-background', colors.background)
    root.style.setProperty('--color-surface', colors.surface)
    root.style.setProperty('--color-text', colors.text)
    root.style.setProperty('--color-text-secondary', colors.textSecondary)
    root.style.setProperty('--color-border', colors.border)
    root.style.setProperty('--color-success', colors.success)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-error', colors.error)
  },

  getDefaultTheme(): ThemeColors {
    return DEFAULT_THEME
  }
}





