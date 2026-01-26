// Authentication Routes

import { Router } from 'express'
import { oneIDLogin, getCurrentUser } from '../auth'

const router = Router()

// OneID login endpoint
router.post('/oneid/login', oneIDLogin)

// Get current user info
router.get('/me', getCurrentUser)

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

export default router
