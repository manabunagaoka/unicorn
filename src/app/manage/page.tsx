import { cookies } from 'next/headers';
import AccountClient from './AccountClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function AccountPage() {
  const user = await getUserFromToken();

  // Middleware handles auth redirect, but if we somehow get here without a user,
  // show a message (this shouldn't normally happen due to middleware protection)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-400 mb-6">
              Please sign in to access your account.
            </p>
            <a
              href="/login?redirect_to=/manage"
              className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-8 rounded-lg transition"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AccountClient user={user} />;
}
