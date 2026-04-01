/**
 * Error handler utility for API services
 * Provides consistent error messages for HTTP status codes
 */

export function handleApiError(error: any, defaultMessage: string): never {
  // Extract message from backend response
  const backendMessage = error.response?.data?.message || error.response?.data?.error || error.message
  
  // Detectar errores específicos y dar mensajes más amigables
  const errorLower = (backendMessage || '').toLowerCase()
  
  // Error de cuenta MCC (Manager Account)
  if (errorLower.includes('manager account') || errorLower.includes('mcc') || errorLower.includes('requested_metrics_for_manager')) {
    throw new Error(
      'Esta cuenta es un MCC (Manager). Las cuentas MCC no tienen métricas propias. ' +
      'Por favor, selecciona una cuenta cliente específica o conecta las subcuentas en Configuración → Cuentas.'
    )
  }
  
  // Error de token expirado
  if (errorLower.includes('invalid_grant') || errorLower.includes('token') && errorLower.includes('expir')) {
    throw new Error(
      'El token de acceso ha expirado. Por favor, reconecta tu cuenta en Configuración → Cuentas.'
    )
  }
  
  // Provide descriptive messages based on HTTP status code
  if (error.response?.status === 400) {
    throw new Error(backendMessage || `Invalid request. Please check your configuration and parameters.`)
  }
  if (error.response?.status === 404) {
    throw new Error(backendMessage || `Resource not found. The requested data may not exist.`)
  }
  if (error.response?.status === 401) {
    throw new Error(`Authentication required. Please log in again.`)
  }
  if (error.response?.status === 403) {
    throw new Error(backendMessage || `Access denied. You don't have permission to access this resource.`)
  }
  if (error.response?.status === 500) {
    throw new Error(backendMessage || `Server error. Please try again later or contact support.`)
  }
  if (error.response?.status === 503) {
    throw new Error(`Service temporarily unavailable. Please try again in a few moments.`)
  }
  
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    throw new Error(`Network error. Please check your internet connection and try again.`)
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    throw new Error(`Request timeout. The server took too long to respond. Please try again.`)
  }
  
  // Default: use backend message or fallback to default
  throw new Error(backendMessage || defaultMessage)
}
