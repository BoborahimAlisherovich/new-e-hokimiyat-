// Authentication and Authorization Middleware

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User, UserRole, roles, users } from './data'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User
      userId?: string
    }
  }
}

// Mock OneID integration (in production, this would be real OneID)
export const mockOneIDAuth = {
  // Simulate OneID callback with PNFL
  authenticate: (pnfl: string) => {
    // In real implementation, OneID would return user data
    return {
      pnfl,
      firstName: 'Mock',
      lastName: 'User',
      middleName: 'Test',
      authenticated: true
    }
  }
}

// Generate JWT token
export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      pnfl: user.pnfl,
      role: user.roleId
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = users.find(u => u.id === decoded.userId && u.status === 'FAOL')

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    req.user = user
    req.userId = user.id
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Permission checking middleware
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const userRole = roles.find(r => r.id === req.user!.roleId)
    if (!userRole) {
      return res.status(403).json({ error: 'Invalid role' })
    }

    const hasPermission = requiredPermissions.some(permission =>
      userRole.permissions.includes(permission) || userRole.permissions.includes('admin_all')
    )

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Hierarchy validation for user creation
export const canCreateUser = (creatorRole: string, targetRole: string): boolean => {
  const hierarchy: Record<string, string[]> = {
    [UserRole.TUMAN_HOKIMI]: [UserRole.HOKIMLIK_MASUL, UserRole.TASHKILOT_RAHBARI, UserRole.TASHKILOT_MASUL],
    [UserRole.HOKIMLIK_MASUL]: [UserRole.TASHKILOT_RAHBARI, UserRole.TASHKILOT_MASUL],
    [UserRole.TASHKILOT_RAHBARI]: [UserRole.TASHKILOT_MASUL],
    [UserRole.TASHKILOT_MASUL]: [], // Cannot create anyone
    [UserRole.ADMIN]: Object.values(UserRole) // Can create all
  }

  return hierarchy[creatorRole]?.includes(targetRole) || false
}

// Task permission validation
export const canManageTask = (userRole: string, action: string, taskCreatorId?: string): boolean => {
  const permissions: Record<string, Record<string, boolean>> = {
    [UserRole.TUMAN_HOKIMI]: {
      create: true,
      update: true,
      close: true,
      reassign: true,
      accept: false,
      submit_report: false
    },
    [UserRole.HOKIMLIK_MASUL]: {
      create: true,
      update: true,
      close: false,
      reassign: false,
      accept: false,
      submit_report: false
    },
    [UserRole.TASHKILOT_RAHBARI]: {
      create: false,
      update: false,
      close: false,
      reassign: false,
      accept: true,
      submit_report: true
    },
    [UserRole.TASHKILOT_MASUL]: {
      create: false,
      update: false,
      close: false,
      reassign: false,
      accept: true,
      submit_report: true
    },
    [UserRole.ADMIN]: {
      create: true,
      update: true,
      close: true,
      reassign: true,
      accept: true,
      submit_report: true
    }
  }

  return permissions[userRole]?.[action] || false
}

// OneID login endpoint handler
export const oneIDLogin = async (req: Request, res: Response) => {
  try {
    const { pnfl } = req.body

    if (!pnfl) {
      return res.status(400).json({ error: 'PNFL required' })
    }

    // Check if user exists in system
    const user = users.find(u => u.pnfl === pnfl)

    if (!user) {
      return res.status(404).json({
        error: 'Сиз тизимга аввалдан киритилмагансиз. Администратор билан боғланинг.'
      })
    }

    if (user.status !== 'KUTILMOQDA' && user.status !== 'FAOL') {
      return res.status(403).json({
        error: 'Фойдаланувчи холати нотўғри'
      })
    }

    // Simulate OneID authentication
    const oneIDData = mockOneIDAuth.authenticate(pnfl)

    if (!oneIDData.authenticated) {
      return res.status(401).json({ error: 'OneID аутентификация хатоси' })
    }

    // Activate user if waiting
    if (user.status === 'KUTILMOQDA') {
      user.status = 'FAOL'
      user.oneidConnected = true
      user.activatedAt = new Date().toISOString()
    }

    // Generate token
    const token = generateToken(user)

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roles.find(r => r.id === user.roleId)?.displayName,
        organizationId: user.organizationId
      }
    })

  } catch (error) {
    console.error('OneID login error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
}

// Get current user info
export const getCurrentUser = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const role = roles.find(r => r.id === req.user!.roleId)

  res.json({
    user: {
      id: req.user!.id,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      middleName: req.user!.middleName,
      // Mask PNFL for security (only show last 4 digits)
      pnfl: `****${req.user!.pnfl.slice(-4)}`,
      role: role?.displayName,
      roleId: role?.id,
      organizationId: req.user!.organizationId,
      permissions: role?.permissions || []
    }
  })
}
