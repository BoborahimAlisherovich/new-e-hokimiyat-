import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityHeaders, corsMiddleware, rateLimitMiddleware } from '@/lib/security'

// Combine all security middleware
export function middleware(request: NextRequest) {
  // Apply security headers first
  const securityResponse = securityHeaders()(request)
  
  // Apply rate limiting
  const rateLimitResponse = rateLimitMiddleware()(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  // Apply CORS
  const corsResponse = corsMiddleware()(request)
  if (corsResponse) {
    return corsResponse
  }
  
  return securityResponse
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
  ],
}
