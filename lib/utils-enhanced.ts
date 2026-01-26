import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date utilities
export const formatDate = (date: string | Date, locale: string = "uz-UZ"): string => {
  const d = new Date(date)
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateTime = (date: string | Date, locale: string = "uz-UZ"): string => {
  const d = new Date(date)
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatTime = (date: string | Date, locale: string = "uz-UZ"): string => {
  const d = new Date(date)
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Number utilities
export const formatNumber = (num: number, locale: string = "uz-UZ"): string => {
  return new Intl.NumberFormat(locale).format(num)
}

export const formatCurrency = (amount: number, currency: string = "UZS", locale: string = "uz-UZ"): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+998\d{9}$/
  return phoneRegex.test(phone)
}

export const validatePNFL = (pnfl: string): boolean => {
  const pnflRegex = /^\d{14}$/
  return pnflRegex.test(pnfl)
}

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0
}

// API utilities
export const handleApiError = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  if (error?.message) {
    return error.message
  }
  return 'Номаълум хатолик юз берилди'
}

export const createApiHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

// Storage utilities
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from localStorage:', error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }
}

// Array utilities
export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) {
      return direction === 'asc' ? -1 : 1
    }
    if (aVal > bVal) {
      return direction === 'asc' ? 1 : -1
    }
    return 0
  })
}

export const uniqueBy = <T, K extends keyof T>(
  array: T[],
  key: K
): T[] => {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(String(value))) {
      return false
    }
    seen.add(String(value))
    return true
  })
}

// Color utilities
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'text-blue-600',
    in_progress: 'text-orange-600',
    completed: 'text-green-600',
    cancelled: 'text-red-600',
    active: 'text-green-600',
    inactive: 'text-gray-600',
  }
  return colors[status] || 'text-gray-600'
}

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: 'text-gray-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }
  return colors[priority] || 'text-gray-600'
}
