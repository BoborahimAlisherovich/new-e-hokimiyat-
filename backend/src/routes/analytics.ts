// Analytics Routes

import { Router } from 'express'
import {
  tasks,
  taskOrganizations,
  taskExecutions,
  organizations,
  users,
  roles,
  TaskStatus,
  TaskPriority
} from '../data'
import { authenticate, requirePermission } from '../auth'

const router = Router()

// Dashboard analytics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    const userOrgId = req.user!.organizationId

    // Filter tasks based on user role
    let userTasks = tasks
    if (userRole === '3' || userRole === '4') { // Organization users
      userTasks = tasks.filter(t => t.organizations.includes(userOrgId!))
    }

    // Task statistics
    const totalTasks = userTasks.length
    const completedTasks = userTasks.filter(t => t.status === TaskStatus.BAJARILDI || t.status === TaskStatus.NAZORATDAN_YECHILDI).length
    const inProgressTasks = userTasks.filter(t => t.status === TaskStatus.IJRODA).length
    const overdueTasks = userTasks.filter(t => {
      const deadline = new Date(t.deadline)
      const now = new Date()
      return deadline < now && t.status !== TaskStatus.BAJARILDI && t.status !== TaskStatus.NAZORATDAN_YECHILDI
    }).length

    // Priority distribution
    const priorityStats = {
      [TaskPriority.MUHIM_SHOSHILINCH]: userTasks.filter(t => t.priority === TaskPriority.MUHIM_SHOSHILINCH).length,
      [TaskPriority.MUHIM]: userTasks.filter(t => t.priority === TaskPriority.MUHIM).length,
      [TaskPriority.ORTACHA]: userTasks.filter(t => t.priority === TaskPriority.ORTACHA).length
    }

    // Average completion time
    const completedTaskOrgs = taskOrganizations.filter(to =>
      userTasks.some(t => t.id === to.taskId) &&
      to.completedAt &&
      to.acceptedAt
    )

    const avgCompletionTime = completedTaskOrgs.length > 0
      ? completedTaskOrgs.reduce((sum, to) => {
          const accepted = new Date(to.acceptedAt!)
          const completed = new Date(to.completedAt!)
          return sum + (completed.getTime() - accepted.getTime())
        }, 0) / completedTaskOrgs.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentTasks = userTasks.filter(t =>
      new Date(t.createdAt) > thirtyDaysAgo
    ).length

    const recentCompletions = userTasks.filter(t =>
      t.closedAt && new Date(t.closedAt) > thirtyDaysAgo
    ).length

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      priority: priorityStats,
      performance: {
        avgCompletionDays: Math.round(avgCompletionTime * 10) / 10,
        recentActivity: {
          newTasks: recentTasks,
          completions: recentCompletions
        }
      }
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Organization analytics
router.get('/organizations', authenticate, requirePermission(['view_analytics']), async (req, res) => {
  try {
    const orgStats = organizations.map(org => {
      const orgTasks = taskOrganizations.filter(to => to.organizationId === org.id)
      const totalTasks = orgTasks.length
      const completedTasks = orgTasks.filter(to => to.status === TaskStatus.BAJARILDI || to.status === TaskStatus.NAZORATDAN_YECHILDI).length
      const overdueTasks = orgTasks.filter(to => {
        const deadline = new Date(to.deadline)
        const now = new Date()
        return deadline < now && to.status !== TaskStatus.BAJARILDI && to.status !== TaskStatus.NAZORATDAN_YECHILDI
      }).length

      // Average completion time for this organization
      const completedOrgTasks = orgTasks.filter(to => to.completedAt && to.acceptedAt)
      const avgCompletionTime = completedOrgTasks.length > 0
        ? completedOrgTasks.reduce((sum, to) => {
            const accepted = new Date(to.acceptedAt!)
            const completed = new Date(to.completedAt!)
            return sum + (completed.getTime() - accepted.getTime())
          }, 0) / completedOrgTasks.length / (1000 * 60 * 60 * 24)
        : 0

      return {
        id: org.id,
        name: org.name,
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        avgCompletionDays: Math.round(avgCompletionTime * 10) / 10,
        performance: totalTasks > 0 ? (completedTasks / totalTasks - overdueTasks / totalTasks) * 100 : 0
      }
    }).sort((a, b) => b.performance - a.performance) // Sort by performance

    res.json(orgStats)
  } catch (error) {
    console.error('Organization analytics error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// User analytics
router.get('/users', authenticate, requirePermission(['view_analytics']), async (req, res) => {
  try {
    // Get users who can execute tasks (organization users)
    const orgUsers = users.filter(u => u.roleId === '3' || u.roleId === '4') // TASHKILOT_RAHBARI, TASHKILOT_MASUL

    const userStats = orgUsers.map(user => {
      const userExecutions = taskExecutions.filter(te => te.executedBy === user.id)
      const completedTasks = userExecutions.filter(te =>
        te.actionType === 'HISOBOT_TOPSHIRILDI' || te.actionType === 'IJROGA_OLINDI'
      ).length

      // Get organization name
      const org = organizations.find(o => o.id === user.organizationId)

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: roles.find(r => r.id === user.roleId)?.displayName,
        organization: org?.name,
        totalExecutions: userExecutions.length,
        completedTasks,
        lastActivity: userExecutions.length > 0
          ? userExecutions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null
      }
    }).sort((a, b) => b.completedTasks - a.completedTasks)

    res.json(userStats)
  } catch (error) {
    console.error('User analytics error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Task trends over time
router.get('/trends', authenticate, requirePermission(['view_analytics']), async (req, res) => {
  try {
    const { period = 'month' } = req.query

    // Group tasks by month for the last 6 months
    const now = new Date()
    const trends = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt)
        return taskDate >= monthStart && taskDate <= monthEnd
      })

      const completedInMonth = monthTasks.filter(t =>
        t.closedAt && new Date(t.closedAt) >= monthStart && new Date(t.closedAt) <= monthEnd
      ).length

      trends.push({
        period: date.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short' }),
        created: monthTasks.length,
        completed: completedInMonth
      })
    }

    res.json(trends)
  } catch (error) {
    console.error('Trends analytics error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

export default router
