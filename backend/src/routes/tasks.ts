// Task Management Routes

import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  tasks,
  taskOrganizations,
  taskExecutions,
  taskTimeline,
  auditLogs,
  organizations,
  users,
  notifications,
  TaskStatus,
  TaskPriority,
  ActionType,
  AuditAction
} from '../data'
import { authenticate, requirePermission, canManageTask } from '../auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Get tasks with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      priority,
      organizationId,
      deadline,
      overdue,
      createdBy,
      assignedTo
    } = req.query

    let filteredTasks = tasks.map(task => {
      const creator = users.find(u => u.id === task.createdBy)
      const taskOrgs = taskOrganizations.filter(to => to.taskId === task.id)

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        deadline: task.deadline,
        location: task.location,
        createdBy: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        organizations: task.organizations.map(orgId => {
          const org = organizations.find(o => o.id === orgId)
          return org ? { id: org.id, name: org.name } : null
        }).filter(Boolean),
        taskOrganizations: taskOrgs
      }
    })

    // Apply filters
    if (status) {
      filteredTasks = filteredTasks.filter(t => t.status === status)
    }
    if (priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === priority)
    }
    if (organizationId) {
      filteredTasks = filteredTasks.filter(t =>
        t.organizations.some(org => org.id === organizationId)
      )
    }
    if (deadline) {
      filteredTasks = filteredTasks.filter(t => t.deadline <= deadline)
    }
    if (overdue === 'true') {
      const now = new Date().toISOString()
      filteredTasks = filteredTasks.filter(t =>
        t.deadline < now && t.status !== TaskStatus.BAJARILDI && t.status !== TaskStatus.NAZORATDAN_YECHILDI
      )
    }
    if (createdBy) {
      filteredTasks = filteredTasks.filter(t => t.createdBy.includes(createdBy))
    }

    // Role-based filtering
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (userRole === '3' || userRole === '4') { // Organization users
      const userOrgId = req.user!.organizationId
      filteredTasks = filteredTasks.filter(t =>
        t.organizations.some(org => org.id === userOrgId)
      )
    }

    res.json(filteredTasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    // Check if user can view this task
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (userRole === '3' || userRole === '4') { // Organization users
      const userOrgId = req.user!.organizationId
      if (!task.organizations.includes(userOrgId!)) {
        return res.status(403).json({ error: 'Ушбу топшириққа рухсатингиз йўқ' })
      }
    }

    const creator = users.find(u => u.id === task.createdBy)
    const taskOrgs = taskOrganizations.filter(to => to.taskId === task.id)

    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline,
      location: task.location,
      attachments: task.attachments,
      createdBy: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      closedAt: task.closedAt,
      organizations: task.organizations.map(orgId => {
        const org = organizations.find(o => o.id === orgId)
        return org ? { id: org.id, name: org.name } : null
      }).filter(Boolean),
      taskOrganizations: taskOrgs
    })
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Create new task
router.post('/', authenticate, requirePermission(['create_tasks']), [
  body('title').isString().notEmpty().withMessage('Сарлавҳа керак'),
  body('description').isString().notEmpty().withMessage('Тавсиф керак'),
  body('priority').isIn(Object.values(TaskPriority)).withMessage('Нотўғри устуворлик'),
  body('deadline').isISO8601().withMessage('Нотўғри муддат формати'),
  body('organizations').isArray({ min: 1 }).withMessage('Камида битта ташкилот танланиши керак'),
  body('location').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { title, description, priority, deadline, organizations: orgIds, location } = req.body

    // Validate organizations exist
    const invalidOrgs = orgIds.filter((orgId: string) =>
      !organizations.find(o => o.id === orgId && o.isActive)
    )
    if (invalidOrgs.length > 0) {
      return res.status(400).json({ error: 'Баъзи ташкилотлар топилмади ёки фаол эмас' })
    }

    // Create task
    const newTask = {
      id: uuidv4(),
      title,
      description,
      priority,
      status: TaskStatus.YANGI,
      deadline,
      location,
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizations: orgIds
    }

    tasks.push(newTask)

    // Create task-organization relationships
    orgIds.forEach((orgId: string) => {
      const taskOrg = {
        id: uuidv4(),
        taskId: newTask.id,
        organizationId: orgId,
        status: TaskStatus.YANGI,
        assignedAt: new Date().toISOString(),
        deadline
      }
      taskOrganizations.push(taskOrg)

      // Create notifications for organization users
      const orgUsers = users.filter(u =>
        u.organizationId === orgId &&
        (u.roleId === '3' || u.roleId === '4') && // Organization roles
        u.status === 'FAOL'
      )

      orgUsers.forEach(user => {
        const notification = {
          id: uuidv4(),
          userId: user.id,
          type: 'task_new',
          title: 'Янги топшириқ',
          description: `${title} - муддат: ${new Date(deadline).toLocaleDateString('uz-UZ')}`,
          read: false,
          createdAt: new Date().toISOString(),
          taskId: newTask.id
        }
        notifications.push(notification)
      })
    })

    // Add to timeline
    const timelineEntry = {
      id: uuidv4(),
      taskId: newTask.id,
      userId: req.user!.id,
      type: 'system_log',
      content: 'Топшириқ яратилди',
      systemAction: 'TASK_CREATED',
      createdAt: new Date().toISOString(),
      isSystem: true
    }
    taskTimeline.push(timelineEntry)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.TASK_CREATED,
      details: `Топшириқ "${title}" яратилди`,
      targetType: 'task',
      targetId: newTask.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.status(201).json(newTask)
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Accept task (for organization users)
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (!canManageTask(userRole!, 'accept')) {
      return res.status(403).json({ error: 'Ушбу амалга рухсатингиз йўқ' })
    }

    // Check if user belongs to assigned organization
    const userOrgId = req.user!.organizationId
    if (!task.organizations.includes(userOrgId!)) {
      return res.status(403).json({ error: 'Ушбу топшириқ сизнинг ташкилотингизга тегишли эмас' })
    }

    // Update task organization status
    const taskOrg = taskOrganizations.find(to =>
      to.taskId === task.id && to.organizationId === userOrgId
    )
    if (taskOrg) {
      taskOrg.status = TaskStatus.IJRODA
      taskOrg.acceptedAt = new Date().toISOString()
    }

    // Create execution record
    const execution = {
      id: uuidv4(),
      taskId: task.id,
      executedBy: req.user!.id,
      actionType: ActionType.IJROGA_OLINDI,
      comment: 'Топшириқ ижрога олинди',
      createdAt: new Date().toISOString(),
      organizationId: userOrgId
    }
    taskExecutions.push(execution)

    // Add to timeline
    const timelineEntry = {
      id: uuidv4(),
      taskId: task.id,
      userId: req.user!.id,
      type: 'message',
      content: 'Топшириқ ижрога олинди',
      createdAt: new Date().toISOString(),
      isSystem: false
    }
    taskTimeline.push(timelineEntry)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.TASK_EXECUTED,
      details: 'Топшириқ ижрога олинди',
      targetType: 'task',
      targetId: task.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Топшириқ ижрога олинди' })
  } catch (error) {
    console.error('Accept task error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Submit report
router.post('/:id/report', authenticate, async (req, res) => {
  try {
    const { comment, attachments } = req.body

    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (!canManageTask(userRole!, 'submit_report')) {
      return res.status(403).json({ error: 'Ушбу амалга рухсатингиз йўқ' })
    }

    // Check if user belongs to assigned organization
    const userOrgId = req.user!.organizationId
    if (!task.organizations.includes(userOrgId!)) {
      return res.status(403).json({ error: 'Ушбу топшириқ сизнинг ташкилотингизга тегишли эмас' })
    }

    // Update task organization status
    const taskOrg = taskOrganizations.find(to =>
      to.taskId === task.id && to.organizationId === userOrgId
    )
    if (taskOrg) {
      taskOrg.status = TaskStatus.BAJARILDI
      taskOrg.completedAt = new Date().toISOString()
    }

    // Create execution record
    const execution = {
      id: uuidv4(),
      taskId: task.id,
      executedBy: req.user!.id,
      actionType: ActionType.HISOBOT_TOPSHIRILDI,
      comment,
      attachments,
      createdAt: new Date().toISOString(),
      organizationId: userOrgId
    }
    taskExecutions.push(execution)

    // Add to timeline
    const timelineEntry = {
      id: uuidv4(),
      taskId: task.id,
      userId: req.user!.id,
      type: 'message',
      content: `Ҳисобот топширилди: ${comment}`,
      createdAt: new Date().toISOString(),
      isSystem: false
    }
    taskTimeline.push(timelineEntry)

    // Create notification for mayor
    const mayor = users.find(u => u.roleId === '1') // TUMAN_HOKIMI
    if (mayor) {
      const notification = {
        id: uuidv4(),
        userId: mayor.id,
        type: 'task_completed',
        title: 'Топшириқ бажарилди',
        description: `${task.title} топшириғи бажарилди`,
        read: false,
        createdAt: new Date().toISOString(),
        taskId: task.id
      }
      notifications.push(notification)
    }

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.TASK_EXECUTED,
      details: 'Ҳисобот топширилди',
      targetType: 'task',
      targetId: task.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Ҳисобот муваффақиятли топширилди' })
  } catch (error) {
    console.error('Submit report error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Close task (only mayor)
router.post('/:id/close', authenticate, requirePermission(['close_tasks']), async (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    // Check if all organizations have completed
    const taskOrgs = taskOrganizations.filter(to => to.taskId === task.id)
    const allCompleted = taskOrgs.every(to => to.status === TaskStatus.BAJARILDI)

    if (!allCompleted) {
      return res.status(400).json({ error: 'Барча ташкилотлар топшириқни бажармагунча ёпиб бўлмайди' })
    }

    task.status = TaskStatus.NAZORATDAN_YECHILDI
    task.closedAt = new Date().toISOString()
    task.updatedAt = new Date().toISOString()

    // Update all task organizations
    taskOrgs.forEach(to => {
      to.status = TaskStatus.NAZORATDAN_YECHILDI
    })

    // Create execution record
    const execution = {
      id: uuidv4(),
      taskId: task.id,
      executedBy: req.user!.id,
      actionType: ActionType.NAZORATDAN_YECHILDI,
      comment: 'Топшириқ назоратдан ечиб қўйилди',
      createdAt: new Date().toISOString()
    }
    taskExecutions.push(execution)

    // Add to timeline
    const timelineEntry = {
      id: uuidv4(),
      taskId: task.id,
      userId: req.user!.id,
      type: 'system_log',
      content: 'Топшириқ назоратдан ечиб қўйилди',
      systemAction: 'TASK_CLOSED',
      createdAt: new Date().toISOString(),
      isSystem: true
    }
    taskTimeline.push(timelineEntry)

    // Audit log
    const auditLog = {
      id: uuidv4(),
      userId: req.user!.id,
      action: AuditAction.TASK_CLOSED,
      details: 'Топшириқ назоратдан ечиб қўйилди',
      targetType: 'task',
      targetId: task.id,
      createdAt: new Date().toISOString()
    }
    auditLogs.push(auditLog)

    res.json({ message: 'Топшириқ назоратдан ечиб қўйилди' })
  } catch (error) {
    console.error('Close task error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get task timeline
router.get('/:id/timeline', authenticate, async (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    // Check permissions
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (userRole === '3' || userRole === '4') { // Organization users
      const userOrgId = req.user!.organizationId
      if (!task.organizations.includes(userOrgId!)) {
        return res.status(403).json({ error: 'Ушбу топшириққа рухсатингиз йўқ' })
      }
    }

    const timeline = taskTimeline
      .filter(t => t.taskId === req.params.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(entry => {
        const user = users.find(u => u.id === entry.userId)
        return {
          ...entry,
          user: user ? `${user.firstName} ${user.lastName}` : 'System',
          userRole: user ? roles.find(r => r.id === user.roleId)?.displayName : null
        }
      })

    res.json(timeline)
  } catch (error) {
    console.error('Get timeline error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Add message to timeline
router.post('/:id/message', authenticate, async (req, res) => {
  try {
    const { type, content } = req.body

    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    // Check permissions
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (userRole === '3' || userRole === '4') { // Organization users
      const userOrgId = req.user!.organizationId
      if (!task.organizations.includes(userOrgId!)) {
        return res.status(403).json({ error: 'Ушбу топшириққа рухсатингиз йўқ' })
      }
    }

    const timelineEntry = {
      id: uuidv4(),
      taskId: task.id,
      userId: req.user!.id,
      type: type || 'message',
      content,
      createdAt: new Date().toISOString(),
      isSystem: false
    }
    taskTimeline.push(timelineEntry)

    res.status(201).json(timelineEntry)
  } catch (error) {
    console.error('Add message error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get task executions
router.get('/:id/executions', authenticate, async (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Топшириқ топилмади' })
    }

    // Check permissions
    const userRole = users.find(u => u.id === req.user!.id)?.roleId
    if (userRole === '3' || userRole === '4') { // Organization users
      const userOrgId = req.user!.organizationId
      if (!task.organizations.includes(userOrgId!)) {
        return res.status(403).json({ error: 'Ушбу топшириққа рухсатингиз йўқ' })
      }
    }

    const executions = taskExecutions
      .filter(e => e.taskId === req.params.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(execution => {
        const user = users.find(u => u.id === execution.executedBy)
        return {
          ...execution,
          user: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userRole: user ? roles.find(r => r.id === user.roleId)?.displayName : null
        }
      })

    res.json(executions)
  } catch (error) {
    console.error('Get executions error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

export default router
