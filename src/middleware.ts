// src/middleware.ts
// Proteção de rotas com Supabase SSR

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Renova sessão se expirada
  const { data: { user } } = await supabase.auth.getUser()

  // Ajuste segurança: APENAS /estrategia/[id-uuid] é public route, mas a lista /estrategia e o /estrategia/novo não podem ser!
  const isStrategyPublicLink = request.nextUrl.pathname.match(/^\/estrategia\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) !== null
  
  // Roteamento Monetização 2026: Permitir Novo e Detalhes sem Login (com Paywall interno)
  const isGuestAllowedRoute = [
    '/juridico/novo',
    '/justica/novo',
    '/estrategia/novo',
    '/api/juridico/gerar',
    '/api/justica/gerar',
    '/api/justica/analisar',
    '/api/ai/strategy',
    '/api/ai/chat',
    '/api/juridico/document',
    '/api/justica/demand',
    '/api/estrategia/document'
  ].some(p => request.nextUrl.pathname.startsWith(p)) || 
  request.nextUrl.pathname.match(/^\/juridico\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ||
  request.nextUrl.pathname.match(/^\/justica\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)

  const isPublicRoute = [
    '/login', '/signup', '/invite', '/api/onboarding', '/api/strategy/public', '/_next', '/favicon', '/dashboard',
    '/juridico', '/justica', '/estrategia'
  ].some(
    p => request.nextUrl.pathname.startsWith(p)
  ) || isStrategyPublicLink || isGuestAllowedRoute
  
  const isRootLanding = request.nextUrl.pathname === '/'

  // Redireciona para login se não autenticado e não é rota pública
  if (!user && !isPublicRoute && !isRootLanding) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redireciona para dashboard se já autenticado e tenta acessar login/signup
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
