// lib/auth.ts
// Helper utilities to access authenticated user information
// User data is injected by middleware.ts from SSO headers

import { headers } from 'next/headers';

export interface ManaboodleUser {
  id: string;
  email: string;
  name: string;
  classCode: string;
}

/**
 * Get the authenticated user from request headers
 * Use this in Server Components and API Routes
 * 
 * @returns ManaboodleUser object or null if not authenticated
 * 
 * @example
 * // In a Server Component:
 * import { getUser } from '@/lib/auth';
 * 
 * export default async function DashboardPage() {
 *   const user = await getUser();
 *   
 *   if (!user) {
 *     return <div>Not authenticated</div>;
 *   }
 *   
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * 
 * @example
 * // In an API Route:
 * import { getUser } from '@/lib/auth';
 * import { NextResponse } from 'next/server';
 * 
 * export async function GET() {
 *   const user = await getUser();
 *   
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   
 *   return NextResponse.json({ message: `Hello ${user.name}` });
 * }
 */
export async function getUser(): Promise<ManaboodleUser | null> {
  const headersList = await headers();
  
  const id = headersList.get('x-user-id');
  const email = headersList.get('x-user-email');
  const name = headersList.get('x-user-name');
  const classCode = headersList.get('x-user-class');
  
  if (!id || !email) {
    return null;
  }
  
  return {
    id,
    email,
    name: name || '',
    classCode: classCode || ''
  };
}

/**
 * Require authentication - throws error if user is not authenticated
 * Use this when you want to enforce authentication
 * 
 * @throws Error if user is not authenticated
 * @returns ManaboodleUser object
 */
export async function requireUser(): Promise<ManaboodleUser> {
  const user = await getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}
