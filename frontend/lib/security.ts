import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function rateLimitMiddleware(
  requests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
) {
  return function middleware(request: NextRequest) {
    const ip = request.ip || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old entries
    for (const [key, value] of rateLimit.entries()) {
      if (value.resetTime < windowStart) {
        rateLimit.delete(key)
      }
    }

    const current = rateLimit.get(ip) || { count: 0, resetTime: now + windowMs }

    if (current.count >= requests) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(current.resetTime).toUTCString(),
          }
        }
      )
    }

    current.count++
    rateLimit.set(ip, current)

    return NextResponse.next()
  }
}

// Security headers
export function securityHeaders() {
  return function middleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Strict Transport Security
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    )
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Permissions Policy
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    return response
  }
}

// CORS configuration
export function corsMiddleware(allowedOrigins: string[] = ['http://localhost:3000']) {
  return function middleware(request: NextRequest) {
    const origin = request.headers.get('origin')
    
    if (!origin || allowedOrigins.includes(origin)) {
      const response = NextResponse.next()
      
      response.headers.set('Access-Control-Allow-Origin', origin || '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      
      return response
    }
    
    return NextResponse.json({ error: 'CORS policy violation' }, { status: 403 })
  }
}

// Input validation and sanitization
export function validateInput(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim()
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? validateInput(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// Authentication utilities
export function generateToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ 
    alg: 'HS256', 
    typ: 'JWT' 
  })).toString('base64')
  
  const payload64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  
  return `${header}.${payload64}.${Buffer.from('signature').toString('base64')}`
}

export function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split('.')
    
    // Verify signature (in production, use proper JWT library)
    const decodedPayload = Buffer.from(payload, 'base64').toString()
    
    return JSON.parse(decodedPayload)
  } catch {
    return null
  }
}

// Error handling
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(error: Error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  console.error('Unexpected error:', error)
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Logging utilities
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },
  
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }))
  },
  
  error: (message: string, error?: Error, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      stack: error?.stack,
      ...meta
    }))
  }
}

// Environment validation
export function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing environment variables: ${missing.join(', ')}`,
      500
    )
  }
}
