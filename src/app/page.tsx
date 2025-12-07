import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPage from './LandingPageNew';

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

export default async function HomePage() {
  const user = await getUserFromToken();

  // Show landing page for everyone (logged in or not)
  return <LandingPage user={user} />;
}
