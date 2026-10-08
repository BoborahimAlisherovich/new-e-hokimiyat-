import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Server Middleware
 * 
 * Tizimga login va parol bilan kirmagan foydalanuvchilarni
 * /dashboard yo'nalishlariga kiritmaydi va darhol /kirish sahifasiga yo'naltiradi.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard')) {
    const accessToken = request.cookies.get('access_token')?.value
    if (!accessToken) {
      const loginUrl = new URL('/kirish', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
