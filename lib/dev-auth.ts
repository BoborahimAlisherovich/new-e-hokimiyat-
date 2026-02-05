/**
 * Development-only authentication utility
 * Automatically logs in a test user in development environment
 */

import { API_BASE, setAccessToken, setRefreshToken } from './api'

const DEV_CREDENTIALS = {
  pnfl: '00000000000001',
  password: 'admin123'
}

export async function ensureDevAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  // Check if already authenticated
  const token = localStorage.getItem('access_token')
  if (token) return true
  
  // Try to login with dev credentials
  try {
    const response = await fetch(`${API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEV_CREDENTIALS)
    })
    
    if (!response.ok) return false
    
    const data = await response.json()
    setAccessToken(data.access)
    setRefreshToken(data.refresh)
    return true
  } catch (error) {
    console.error('Dev auth failed:', error)
    return false
  }
}
