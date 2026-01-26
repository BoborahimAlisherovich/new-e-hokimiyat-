// User Management Routes

import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  users,
  roles,
  organizations,
  userAssignments,
  auditLogs,
  UserStatus,
  UserRole,
  AuditAction
} from '../data'
import { authenticate, requirePermission, canCreateUser } from '../auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Get users with filtering
router.get('/', authenticate, requirePermission(['view_users']), async (req, res) => {
  try {
    const { role, organizationId, status } = req.query

    let filteredUsers = users.map(user => {
      const userRole = roles.find(r => r.id === user.roleId)
      const organization = organizations.find(o => o.id === user.organizationId)

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        // Mask PNFL for security
        pnfl: `****${user.pnfl.slice(-4)}`,
        role: userRole?.displayName,
        roleId: user.roleId,
        organization: organization?.name,
        organizationId: user.organizationId,
        status: user.status,
        oneidConnected: user.oneidConnected,
        createdAt: user.createdAt,
        activatedAt: user.activatedAt
      }
    })

    // Apply filters
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.roleId === role)
    }
    if (organizationId) {
      filteredUsers = filteredUsers.filter(u => u.organizationId === organizationId)
    }
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status)
    }

    res.json(filteredUsers)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get user by ID
router.get('/:id', authenticate, requirePermission(['view_users']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Фойдаланувчи топилмади' })
    }

    const userRole = roles.find(r => r.id === user.roleId)
    const organization = organizations.find(o => o.id === user.organizationId)

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      pnfl: `****${user.pnfl.slice(-4)}`,
      phone: user.phone,
      role: userRole?.displayName,
      roleId: user.roleId,
      organization: organization?.name,
      organizationId: user.organizationId,
      status: user.status,
      oneidConnected: user.oneidConnected,
      createdAt: user.createdAt,
      activatedAt: user.activatedAt
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Create new user (PNFL-based pre-registration)
router.post('/', authenticate, requirePermission(['create_users']), [
  body('pnfl').isLength({ min: 14, max: 14 }).withMessage('PNFL 14 та белгидан иборат бўлиши керак'),
  body('roleId').isIn(Object.values(UserRole)).withMessage('Нотўғри роль'),
  body('organizationId').optional().isString(),
  body('firstName').isString().notEmpty(),
  body('lastName').isString().notEmpty(),
  body('middleName').optional().isString(),
  body('phone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { pnfl, roleId, organizationId, firstName, lastName, middleName, phone } = req.body

    // Check if PNFL already exists
    const existingUser = users.find(u => u.pnfl === pnfl)
    if (existingUser) {
      return res.status(400).json({ error: 'Бу PNFL билан фойдаланувчи аллақачон мавжуд' })
    }

    // Check hierarchy permissions
    const creatorRole = roles.find(r => r.id === req.user!.roleId)?.name
    const targetRole = roleId

    if (!canCreateUser(creatorRole!, targetRole)) {
      return res.status(403).json({ error: 'Сиз бу рольдаги фойдаланувчини ярата олмайсиз' })
    }

    // If organization specified, check if creator can assign to it
    if (organizationId) {
      const org = organizations.find(o => o.id === organizationId)
      if (!org) {
        return res.status(400).json({ error: 'Ташкилот топилмади' })
      }

      // Organization heads can only create users in their own organization
      if (creatorRole === UserRole.TASHKILOT_RAHBARI && req.user!.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Бошқа ташкилотга фойдаланувчи қўша олмайсиз' })
      }
    }

    // Create user
    const newUser = {
      id: uuidv4(),
      pnfl,
      firstName,
      lastName,
      middleName,
      phone,
      roleId,
      organizationId,
      status: UserStatus.KUTILMOQDA,
      oneidConnected: false,
      createdBy: req.user!.id,
      createdAt: new Date().toISOString()
    }

    users.push(newUser)

    // Create assignment record
    const assignment = {
      id: uuidv4(),
      assignedUserId: newUser.id,
      assignedBy: req.user!.id,
      assignedRoleId: roleId,
      assignedOrganizationId: organizationId,
      assignedAt: new Date().toISOString()
    }
    userAssignments.push(assignment)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.USER_CREATED,
      details: `${firstName} ${lastName} ${roles.find(r => r.id === roleId)?.displayName} сифатида қўшилди`,
      targetType: 'user',
      targetId: newUser.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.status(201).json({
      id: newUser.id,
      message: 'Фойдаланувчи муваффақиятли қўшилди. OneID орқали кириши кутилмоқда.'
    })

  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Update user
router.put('/:id', authenticate, requirePermission(['manage_users']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Фойдаланувчи топилмади' })
    }

    // Only allow certain fields to be updated
    const allowedFields = ['phone', 'organizationId']
    const updates: any = {}

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key]
      }
    })

    Object.assign(user, updates)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.USER_UPDATED,
      details: `Фойдаланувчи маълумотлари янгиланди`,
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Фойдаланувчи муваффақиятли янгиланди' })

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Block user
router.patch('/:id/block', authenticate, requirePermission(['manage_users']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Фойдаланувчи топилмади' })
    }

    // Cannot block mayor
    if (user.roleId === '1') { // TUMAN_HOKIMI
      return res.status(403).json({ error: 'Ҳокимни блоклаш мумкин эмас' })
    }

    user.status = UserStatus.BLOKLANGAN
    user.blockedAt = new Date().toISOString()

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.USER_BLOCKED,
      details: `Фойдаланувчи блокланди`,
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Фойдаланувчи блокланди' })

  } catch (error) {
    console.error('Block user error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Archive user
router.patch('/:id/archive', authenticate, requirePermission(['manage_users']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Фойдаланувчи топилмади' })
    }

    // Cannot archive mayor
    if (user.roleId === '1') { // TUMAN_HOKIMI
      return res.status(403).json({ error: 'Ҳокимни арxivлаш мумкин эмас' })
    }

    user.status = UserStatus.ARXIV
    user.archivedAt = new Date().toISOString()

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.USER_ARCHIVED,
      details: `Фойдаланувчи арxivланди`,
      targetType: 'user',
      targetId: user.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Фойдаланувчи арxivланди' })

  } catch (error) {
    console.error('Archive user error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

export default router
