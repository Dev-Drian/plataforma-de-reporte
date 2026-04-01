import { ReactNode } from "react"
import { usePermissions, Resource, Action } from "../../hooks/usePermissions"
import { Lock } from "lucide-react"

interface CanAccessProps {
  resource: Resource
  action: Action
  children: ReactNode
  fallback?: ReactNode
  showLock?: boolean
}

/**
 * Componente para renderizar contenido basado en permisos
 * 
 * @example
 * <CanAccess resource="oauth" action="create">
 *   <Button>Connect Account</Button>
 * </CanAccess>
 * 
 * @example Con fallback
 * <CanAccess 
 *   resource="oauth" 
 *   action="create"
 *   fallback={<Button disabled>Requires Admin</Button>}
 * >
 *   <Button>Connect Account</Button>
 * </CanAccess>
 */
export function CanAccess({ resource, action, children, fallback, showLock = false }: CanAccessProps) {
  const { can } = usePermissions()

  if (can(resource, action)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showLock) {
    return (
      <div className="inline-flex items-center gap-2 opacity-50 cursor-not-allowed">
        <Lock className="w-4 h-4" />
        {children}
      </div>
    )
  }

  return null
}

interface RequireRoleProps {
  roles: string[]
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente para renderizar contenido basado en roles específicos
 * 
 * @example
 * <RequireRole roles={["admin"]}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { hasRole } = usePermissions()

  const hasRequiredRole = roles.some((role) => hasRole(role))

  if (hasRequiredRole) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
