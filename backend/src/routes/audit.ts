// Audit Log Routes

import { Router } from 'express'
import { auditLogs, users, roles, organizations, tasks } from '../data'
import { authenticate, requirePermission } from '../auth'

const router = Router()

// Get audit logs with filtering
router.get('/', authenticate, requirePermission(['view_audit']), async (req, res) => {
  try {
    const {
      userId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query

    let filteredLogs = auditLogs.map(log => {
      const user = users.find(u => u.id === log.userId)
      const role = user ? roles.find(r => r.id === user.roleId) : null

      let targetName = ''
      switch (log.targetType) {
        case 'user':
          const targetUser = users.find(u => u.id === log.targetId)
          targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'Unknown User'
          break
        case 'task':
          const targetTask = tasks.find(t => t.id === log.targetId)
          targetName = targetTask ? targetTask.title : 'Unknown Task'
          break
        case 'organization':
          const targetOrg = organizations.find(o => o.id === log.targetId)
          targetName = targetOrg ? targetOrg.name : 'Unknown Organization'
          break
        default:
          targetName = log.targetId || 'System'
      }

      return {
        id: log.id,
        userId: log.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'System',
        userRole: role?.displayName || 'System',
        action: log.action,
        details: log.details,
        targetType: log.targetType,
        targetId: log.targetId,
        targetName,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt
      }
    })

    // Apply filters
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId)
    }
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action)
    }
    if (targetType) {
      filteredLogs = filteredLogs.filter(log => log.targetType === targetType)
    }
    if (targetId) {
      filteredLogs = filteredLogs.filter(log => log.targetId === targetId)
    }
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.createdAt >= startDate)
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => log.createdAt <= endDate)
    }

    // Sort by date (newest first)
    filteredLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(Number(offset), Number(offset) + Number(limit))

    res.json({
      logs: paginatedLogs,
      total: filteredLogs.length,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get audit log statistics
router.get('/stats', authenticate, requirePermission(['view_audit']), async (req, res) => {
  try {
    const totalLogs = auditLogs.length
    const today = new Date().toISOString().split('T')[0]

    const todayLogs = auditLogs.filter(log =>
      log.createdAt.startsWith(today)
    ).length

    // Action distribution
    const actionStats = auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // User activity
    const userActivity = auditLogs.reduce((acc, log) => {
      if (log.userId !== 'system') {
        acc[log.userId] = (acc[log.userId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Top active users
    const topUsers = Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const user = users.find(u => u.id === userId)
        return {
          userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          count
        }
      })

    res.json({
      overview: {
        totalLogs,
        todayLogs,
        avgDailyLogs: Math.round(totalLogs / 30) // Rough estimate
      },
      actionStats,
      topUsers
    })
  } catch (error) {
    console.error('Get audit stats error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

export default router
