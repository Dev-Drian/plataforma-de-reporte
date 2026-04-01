import { Navigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../../components/common'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { checkAuth } = useAuth()
  const { user } = useStore()

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setLoading(false)
        setIsAuthenticated(false)
        return
      }

      // If user already exists in store, don't verify again
      if (user) {
        setLoading(false)
        setIsAuthenticated(true)
        return
      }

      // Verify authentication
      const authenticated = await checkAuth()
      setIsAuthenticated(authenticated)
      setLoading(false)
    }

    verifyAuth()
  }, [checkAuth, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Verificando autenticación..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

