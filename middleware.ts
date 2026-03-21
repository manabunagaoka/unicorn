// middleware.ts
// Manaboodle Unicorn - All routes are public (spectator view)
// Only /admin routes are password-protected (handled by the admin page itself)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
