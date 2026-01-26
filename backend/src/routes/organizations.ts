// Organization Management Routes

import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  organizations,
  auditLogs,
  users,
  AuditAction
} from '../data'
import { authenticate, requirePermission } from '../auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Get organizations
router.get('/', authenticate, async (req, res) => {
  try {
    const { active } = req.query

    let filteredOrgs = organizations.map(org => ({
      id: org.id,
      name: org.name,
      parentOrgId: org.parentOrgId,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    }))

    if (active === 'true') {
      filteredOrgs = filteredOrgs.filter(org => org.isActive)
    }

    res.json(filteredOrgs)
  } catch (error) {
    console.error('Get organizations error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Create organization
router.post('/', authenticate, requirePermission(['create_organizations']), [
  body('name').isString().notEmpty().withMessage('Ташкилот номи керак'),
  body('parentOrgId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, parentOrgId } = req.body

    // Check if parent organization exists
    if (parentOrgId) {
      const parentOrg = organizations.find(o => o.id === parentOrgId)
      if (!parentOrg) {
        return res.status(400).json({ error: 'Отделина ташкилот топилмади' })
      }
    }

    const newOrg = {
      id: uuidv4(),
      name,
      parentOrgId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    organizations.push(newOrg)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.ORGANIZATION_CREATED,
      details: `Ташкилот "${name}" яратилди`,
      targetType: 'organization',
      targetId: newOrg.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.status(201).json(newOrg)
  } catch (error) {
    console.error('Create organization error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Update organization
router.put('/:id', authenticate, requirePermission(['manage_organizations']), async (req, res) => {
  try {
    const org = organizations.find(o => o.id === req.params.id)
    if (!org) {
      return res.status(404).json({ error: 'Ташкилот топилмади' })
    }

    const { name, parentOrgId, isActive } = req.body

    // Check if parent organization exists
    if (parentOrgId) {
      const parentOrg = organizations.find(o => o.id === parentOrgId)
      if (!parentOrg) {
        return res.status(400).json({ error: 'Отделина ташкилот топилмади' })
      }
    }

    const updates = {
      ...(name && { name }),
      ...(parentOrgId !== undefined && { parentOrgId }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date().toISOString()
    }

    Object.assign(org, updates)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.ORGANIZATION_UPDATED,
      details: `Ташкилот "${org.name}" янгиланди`,
      targetType: 'organization',
      targetId: org.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json(org)
  } catch (error) {
    console.error('Update organization error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Delete organization (soft delete by setting inactive)
router.delete('/:id', authenticate, requirePermission(['manage_organizations']), async (req, res) => {
  try {
    const org = organizations.find(o => o.id === req.params.id)
    if (!org) {
      return res.status(404).json({ error: 'Ташкилот топилмади' })
    }

    // Check if organization has active users
    const hasUsers = users.some(u => u.organizationId === org.id && u.status === 'FAOL')
    if (hasUsers) {
      return res.status(400).json({ error: 'Ташкилотда фаол фойдаланувчилар мавжуд. Аввал уларни бошқа ташкилотга ўтказинг.' })
    }

    org.isActive = false
    org.updatedAt = new Date().toISOString()

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.ORGANIZATION_UPDATED,
      details: `Ташкилот "${org.name}" ўчирилди`,
      targetType: 'organization',
      targetId: org.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Ташкилот ўчирилди' })
  } catch (error) {
    console.error('Delete organization error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

export default router
