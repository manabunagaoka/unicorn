import { cookies } from 'next/headers';
import PortfolioClient from './PortfolioClient';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token');
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MANABOODLE_API_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token.value}`
      },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
  } catch (error) {
    console.error('Auth verification failed:', error);
  }

  return null;
}

export default async function PortfolioPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-400 mb-8">Please sign in to view your portfolio</p>
          <a
            href="/login"
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-8 rounded-xl transition"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return <PortfolioClient user={user} />;
}
