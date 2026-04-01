import { Request, Response, NextFunction } from 'express'
import { Roles } from '../types/roles'

export const rolesMiddleware = (...allowedRoles: Roles[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Convertir enum Roles a strings para comparar con req.user.role (que es string)
    const allowedRolesStrings = allowedRoles.map(role => role.toString())
    const userRole = req.user.role
    
    if (!allowedRolesStrings.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  }
}

