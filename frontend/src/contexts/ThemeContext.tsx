import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { themeService, ThemeColors } from '../services/settings'

interface ThemeContextType {
  colors: ThemeColors
  loading: boolean
  updateColors: (colors: ThemeColors) => Promise<void>
  refreshTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [colors, setColors] = useState<ThemeColors>(themeService.getDefaultTheme())
  const [loading, setLoading] = useState(true)

  const refreshTheme = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        // Si no hay token, usar tema por defecto
        const defaultTheme = themeService.getDefaultTheme()
        setColors(defaultTheme)
        themeService.applyTheme(defaultTheme)
        setLoading(false)
        return
      }
      
      const themeColors = await themeService.getTheme()
      setColors(themeColors)
      themeService.applyTheme(themeColors)
    } catch (error) {
      console.error('Error loading theme:', error)
      const defaultTheme = themeService.getDefaultTheme()
      setColors(defaultTheme)
      themeService.applyTheme(defaultTheme)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshTheme()
  }, [])

  const updateColors = async (newColors: ThemeColors) => {
    try {
      const updatedColors = await themeService.updateTheme(newColors)
      setColors(updatedColors)
      themeService.applyTheme(updatedColors)
    } catch (error) {
      console.error('Error updating theme:', error)
      throw error
    }
  }

  return (
    <ThemeContext.Provider value={{ colors, loading, updateColors, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

