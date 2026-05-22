import { useStore } from "../store/useStore"

/**
 * Permissions by role according to the backend
 */
const ROLE_PERMISSIONS = {
  admin: {
    organizations: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    settings: ["create", "read", "update", "delete"],
    metrics: ["read", "export"],
    accounts: ["create", "read", "update", "delete", "sync"],
    oauth: ["create", "read", "update", "delete"],
  },
  user: {
    organizations: ["read"],
    users: ["read"],
    settings: ["read", "update"],
    metrics: ["read", "export"],
    accounts: ["read", "sync"],
    oauth: ["read"],
  },
  viewer: {
    organizations: ["read"],
    users: ["read"],
    settings: ["read"],
    metrics: ["read"],
    accounts: ["read"],
    oauth: [],
  },
}

export type Resource =
  | "organizations"
  | "users"
  | "settings"
  | "metrics"
  | "accounts"
  | "oauth"

export type Action = "create" | "read" | "update" | "delete" | "export" | "sync"

/**
 * Hook to verify permissions of the current user
 */
export function usePermissions() {
  const user = useStore((state) => state.user)

  /**
   * Checks if the user has a specific role
   */
  const hasRole = (role: string): boolean => {
    if (!user?.roles || user.roles.length === 0) return false
    return user.roles.includes(role)
  }

  /**
   * Checks if the user is admin
   */
  const isAdmin = (): boolean => {
    return hasRole("admin")
  }

  /**
   * Checks if the user is user (standard)
   */
  const isUser = (): boolean => {
    return hasRole("user")
  }

  /**
   * Checks if the user is viewer (read-only)
   */
  const isViewer = (): boolean => {
    return hasRole("viewer")
  }

  /**
   * Checks if the user can perform an action on a resource
   * 
   * @param resource - El recurso (organizations, users, settings, etc.)
   * @param action - La acción (create, read, update, delete, export, sync)
   * @returns true si el usuario tiene permiso
   */
  const can = (resource: Resource, action: Action): boolean => {
    if (!user?.roles || user.roles.length === 0) return false

    // If the user has multiple roles, check if any has the permission
    return user.roles.some((role) => {
      const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
      if (!rolePerms) return false
      
      const resourcePerms = rolePerms[resource]
      if (!resourcePerms) return false
      
      return (resourcePerms as Action[]).includes(action)
    })
  }

  /**
   * Checks if the user CANNOT perform an action on a resource
   */
  const cannot = (resource: Resource, action: Action): boolean => {
    return !can(resource, action)
  }

  /**
   * Checks if the user can manage OAuth (connect accounts)
   */
  const canManageOAuth = (): boolean => {
    return can("oauth", "create")
  }

  /**
   * Checks if the user can export reports
   */
  const canExport = (): boolean => {
    return can("metrics", "export")
  }

  /**
   * Checks if the user can sync data
   */
  const canSync = (): boolean => {
    return can("accounts", "sync")
  }

  /**
   * Checks if the user can manage users
   */
  const canManageUsers = (): boolean => {
    return can("users", "create")
  }

  /**
   * Checks if the user can modify settings
   */
  const canUpdateSettings = (): boolean => {
    return can("settings", "update")
  }

  return {
    // Role verification
    hasRole,
    isAdmin,
    isUser,
    isViewer,
    
    // Permission verification
    can,
    cannot,
    
    // Atajos útiles
    canManageOAuth,
    canExport,
    canSync,
    canManageUsers,
    canUpdateSettings,
  }
}
