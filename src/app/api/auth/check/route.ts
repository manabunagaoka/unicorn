import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';


// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';
async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('manaboodle_sso_token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const response = await fetch('https://www.manaboodle.com/api/sso/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const user = data.user || data;
    
    if (user && user.id && user.email) {
      return {
        id: user.id,
        email: user.email,
        name: user.name || '',
        classCode: user.classCode || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        classCode: user.classCode
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
