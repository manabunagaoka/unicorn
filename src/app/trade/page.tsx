import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

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

export default async function TradePage() {
  const user = await getUserFromToken();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?redirect_to=/trade');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <Header user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Trade Harvard Unicorns</h1>
          <p className="text-gray-400">Invest in legendary startups and emerging founders</p>
        </div>

        {/* Grid of trading indexes */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* HM7 - Featured Trading */}
          <Link href="/hm7" className="group">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-2 border-green-500/50 rounded-2xl p-8 hover:border-green-400 transition-all hover:shadow-xl hover:shadow-green-500/20 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Live Trading
                </span>
              </div>
              
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2">HM7</h2>
                <p className="text-green-300 font-semibold mb-1">Harvard Magnificent 7</p>
                <p className="text-gray-300 text-sm">Tech giants and industry leaders</p>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  <span>Meta, Microsoft, Airbnb, Cloudflare</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  <span>Grab, Moderna, Klaviyo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  <span>Real-time prices • Buy & Sell 24/7</span>
                </div>
              </div>

              <div className="flex items-center text-green-400 font-semibold group-hover:gap-3 gap-2 transition-all">
                <span>Trade Now</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* HM7 2.0 - Next Generation */}
          <Link href="/hm720" className="group">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-2 border-blue-500/50 rounded-2xl p-8 hover:border-blue-400 transition-all hover:shadow-xl hover:shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Live Trading
                </span>
              </div>
              
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2">HM7 2.0</h2>
                <p className="text-blue-300 font-semibold mb-1">Next Generation</p>
                <p className="text-gray-300 text-sm">Consumer, fintech, and emerging leaders</p>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Affirm, Peloton, Asana, Lyft</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>ThredUp, Nextdoor, Rent the Runway</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Real-time prices • Buy & Sell 24/7</span>
                </div>
              </div>

              <div className="flex items-center text-blue-400 font-semibold group-hover:gap-3 gap-2 transition-all">
                <span>Trade Now</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* H2026 - Now Accepting */}
          <Link href="/h2026" className="group">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-2 border-purple-500/50 rounded-2xl p-8 hover:border-purple-400 transition-all hover:shadow-xl hover:shadow-purple-500/20 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span>✨</span> Now Accepting
                </span>
              </div>
              
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2">H2026</h2>
                <p className="text-purple-300 font-semibold mb-1">Harvard Class of 2026</p>
                <p className="text-gray-300 text-sm">Join the next generation of unicorns</p>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Submit your startup for evaluation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Opt-in for public trading (IPO)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Get discovered by investors</span>
                </div>
              </div>

              <div className="flex items-center text-purple-400 font-semibold group-hover:gap-3 gap-2 transition-all">
                <span>Register Your Startup</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* H2027 - Now Accepting */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-2 border-purple-500/50 rounded-2xl p-8 opacity-75 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span>✨</span> Now Accepting
              </span>
            </div>
            
            <div className="mb-4">
              <h2 className="text-3xl font-bold mb-2">H2027</h2>
              <p className="text-purple-300 font-semibold mb-1">Harvard Class of 2027</p>
              <p className="text-gray-300 text-sm">Applications opening soon</p>
            </div>

            <div className="space-y-2 mb-6 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-purple-400">•</span>
                <span>For current students and recent grads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">•</span>
                <span>Early-stage startups welcome</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">•</span>
                <span>Registration opens Q2 2026</span>
              </div>
            </div>

            <div className="flex items-center text-gray-500 font-semibold gap-2">
              <span>Coming Soon</span>
            </div>
          </div>

          {/* Harvard President's Challenge */}
          <div className="bg-gradient-to-br from-gray-700/20 to-gray-800/20 border-2 border-gray-600/50 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Info
              </span>
            </div>
            
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Harvard President&apos;s Challenge</h2>
              <p className="text-gray-300 font-semibold mb-1">Annual Innovation Competition</p>
            </div>

            <div className="text-sm text-gray-300 mb-6">
              <p className="mb-3">
                The Harvard President&apos;s Innovation Challenge is the University&apos;s flagship entrepreneurship competition, 
                bringing together students from across all Harvard schools to develop ventures that make a positive impact on the world.
              </p>
              <p>
                Alumni startups and past winners are invited to submit inquiries about joining our trading platform.
              </p>
            </div>

            <a 
              href="https://www.manaboodle.com/contact" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              <span>Submit Inquiry</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
