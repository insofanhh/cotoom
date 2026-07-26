import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/driver/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/history/:path*',
    '/ride/:path*',
  ],
}
