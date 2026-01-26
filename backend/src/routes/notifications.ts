// Notification Routes

import { Router } from 'express'
import { notifications, auditLogs, AuditAction } from '../data'
import { authenticate } from '../auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { read, limit = 20, offset = 0 } = req.query

    let userNotifications = notifications
      .filter(n => n.userId === req.user!.id)
      .map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.description,
        read: n.read,
        createdAt: n.createdAt,
        taskId: n.taskId,
        organizationId: n.organizationId
      }))

    // Filter by read status
    if (read !== undefined) {
      userNotifications = userNotifications.filter(n => n.read === (read === 'true'))
    }

    // Sort by date (newest first)
    userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination
    const paginatedNotifications = userNotifications.slice(Number(offset), Number(offset) + Number(limit))

    res.json({
      notifications: paginatedNotifications,
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length,
      limit: Number(limit),
      offset: Number(offset)
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Get unread count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = notifications.filter(n =>
      n.userId === req.user!.id && !n.read
    ).length

    res.json({ unread: unreadCount })
  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = notifications.find(n =>
      n.id === req.params.id && n.userId === req.user!.id
    )

    if (!notification) {
      return res.status(404).json({ error: 'Билдиришнома топилмади' })
    }

    notification.read = true

    res.json(notification)
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const userNotifications = notifications.filter(n => n.userId === req.user!.id)
    userNotifications.forEach(n => {
      n.read = true
    })

    res.json({ message: 'Барча билдиришномалар ўқилган деб белгиланди' })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ error: 'Ички хато' })
  }
})

// Create notification (internal use)
export const createNotification = (
  userId: string,
  type: string,
  title: string,
  description: string,
  taskId?: string,
  organizationId?: string
) => {
  const notification = {
    id: uuidv4(),
    userId,
    type,
    title,
    description,
    read: false,
    createdAt: new Date().toISOString(),
    taskId,
    organizationId
  }

  notifications.push(notification)

  // Audit log
  const auditLog = {
    id: uuidv4(),
    userId: 'system',
    action: AuditAction.SETTINGS_UPDATED, // Using this for notifications
    details: `Билдиришнома яратилди: ${title}`,
    targetType: 'user',
    targetId: userId,
    createdAt: new Date().toISOString()
  }
  auditLogs.push(auditLog)

  return notification
}

export default router
