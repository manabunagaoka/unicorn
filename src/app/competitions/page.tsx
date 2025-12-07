import { Suspense } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import CompetitionsClient from './CompetitionsClient';

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

export default async function CompetitionsPage() {
  const user = await getUserFromToken();

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CompetitionsClient user={user} />
    </Suspense>
  );
}

