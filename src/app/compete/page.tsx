'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import InvestorProfileModal from '@/components/InvestorProfileModal';
import { Crown, Trophy, Award, TrendingUp, TrendingDown, User, Bot, GraduationCap, BarChart3 } from 'lucide-react';

interface Holding {
  ticker: string;
  shares: number;
  currentPrice: number;
  value: number;
}

interface Investor {
  userId: string;
  email: string;
  username: string;
  isAI: boolean;
  aiEmoji: string;
  aiStrategy?: string;
  aiCatchphrase?: string;
  aiStatus?: string;
  investorTier?: string;
  founderTier?: string;
  cash: number;
  holdingsValue: number;
  portfolioValue: number;
  rank: number;
  holdings: Holding[];
}

interface LeaderboardData {
  leaderboard: Investor[];
  currentUser: Investor | null;
  topAI: Investor[];
  totalInvestors: number;
  timestamp: string;
}

type FilterType = 'all' | 'students' | 'ai';

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Fetch both leaderboard AND portfolio to get accurate cash balance
      const cacheBuster = `${Date.now()}.${Math.random()}`;
      const [leaderboardResponse, portfolioResponse] = await Promise.all([
        fetch(`/api/leaderboard?t=${cacheBuster}&nocache=1`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`/api/portfolio?t=${cacheBuster}&nocache=1`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      ]);
      
      if (!leaderboardResponse.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const result = await leaderboardResponse.json();
      
      // Override currentUser cash with accurate value from Portfolio API
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json();
        if (result.currentUser && portfolioData.balance) {
          console.log('[Compete] Data comparison:', {
            leaderboard: {
              cash: result.currentUser.cash,
              holdings: result.currentUser.holdingsValue,
              total: result.currentUser.portfolioValue,
              holdings_count: result.currentUser.holdings?.length || 0
            },
            portfolio: {
              cash: portfolioData.balance.available_tokens,
              holdings: portfolioData.balance.portfolio_value,
              total: portfolioData.balance.available_tokens + portfolioData.balance.portfolio_value,
              holdings_count: portfolioData.investments?.length || 0
            },
            difference: {
              cash: portfolioData.balance.available_tokens - result.currentUser.cash,
              holdings: portfolioData.balance.portfolio_value - result.currentUser.holdingsValue,
              total: (portfolioData.balance.available_tokens + portfolioData.balance.portfolio_value) - result.currentUser.portfolioValue
            }
          });
          
          // Use Portfolio API data as source of truth (it has fresh prices and correct holdings)
          result.currentUser.cash = portfolioData.balance.available_tokens;
          result.currentUser.holdingsValue = portfolioData.balance.portfolio_value;
          result.currentUser.portfolioValue = portfolioData.balance.available_tokens + portfolioData.balance.portfolio_value;
          
          // Update holdings array from Portfolio API (has correct count and prices)
          const tickerMap: Record<number, string> = {
            1: 'META', 2: 'MSFT', 3: 'DBX', 4: 'AKAM', 
            5: 'RDDT', 6: 'WRBY', 7: 'BKNG'
          };
          
          if (portfolioData.investments) {
            result.currentUser.holdings = portfolioData.investments.map((inv: any) => ({
              ticker: tickerMap[inv.pitch_id] || `PITCH-${inv.pitch_id}`,
              shares: inv.shares_owned,
              currentPrice: inv.current_price,
              value: inv.current_value
            }));
          }
        }
      }
      
      console.log('[Compete] API Response:', {
        timestamp: result.timestamp,
        currentUser: result.currentUser ? {
          cash: result.currentUser.cash,
          holdings: result.currentUser.holdingsValue,
          total: result.currentUser.portfolioValue,
          rank: result.currentUser.rank
        } : null,
        totalInvestors: result.totalInvestors
      });
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const percentage = ((value - 1000000) / 1000000) * 100;
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    const percentage = ((value - 1000000) / 1000000) * 100;
    if (percentage > 0) return 'text-green-400';
    if (percentage < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getPercentile = () => {
    if (!data?.currentUser) return null;
    const percentile = ((data.totalInvestors - data.currentUser.rank + 1) / data.totalInvestors) * 100;
    return Math.round(percentile);
  };

  // ARCHIVED: Tier badge system (temporarily disabled - everyone at $1M after reset)
  // TODO: Re-enable when tier thresholds make sense again
  /*
  const getTierBadge = (investorTier?: string, founderTier?: string, status?: string) => {
    if (!investorTier && !founderTier && !status) return null;
    
    // Investor tiers - performance-based (portfolio value)
    const investorTierStyles: Record<string, string> = {
      'TITAN': 'bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text',
      'ORACLE': 'bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text',
      'ALCHEMIST': 'bg-gradient-to-r from-pink-600 to-orange-500 text-transparent bg-clip-text',
    };

    // Founder tiers - startup success-based (distinct colors)
    const founderTierStyles: Record<string, string> = {
      'UNICORN': 'bg-gradient-to-r from-indigo-500 to-purple-400 text-transparent bg-clip-text',
      'PHOENIX': 'bg-gradient-to-r from-orange-600 to-amber-500 text-transparent bg-clip-text',
      'DRAGON': 'bg-gradient-to-r from-red-600 to-rose-500 text-transparent bg-clip-text',
    };

    const statusStyles: Record<string, string> = {
      'RETIRED': 'text-gray-500 opacity-70',
      'LEGENDARY': 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text animate-pulse',
      'PAUSED': 'text-gray-600',
    };

    return (
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider">
        {investorTier && (
          <span className={investorTierStyles[investorTier] || 'text-gray-400'} title="Investor Tier (Portfolio Performance)">
            📊 {investorTier}
          </span>
        )}
        {founderTier && (
          <span className={founderTierStyles[founderTier] || 'text-gray-400'} title="Founder Tier (Startup Success)">
            🚀 {founderTier}
          </span>
        )}
        {status && status !== 'ACTIVE' && (
          <span className={statusStyles[status] || 'text-gray-400'}>
            • {status}
          </span>
        )}
      </div>
    );
  };
  */

  const filteredLeaderboard = data?.leaderboard.filter(investor => {
    if (filter === 'students') return !investor.isAI;
    if (filter === 'ai') return investor.isAI;
    return true;
  }) || [];

  const top3 = filteredLeaderboard.slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <Header user={null} />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="text-xl text-gray-400">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <Header user={null} />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="text-xl text-red-400">{error || 'Failed to load data'}</div>
          <button 
            onClick={fetchLeaderboard}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <Header user={data?.currentUser ? { email: data.currentUser.email, id: data.currentUser.userId, name: data.currentUser.username, classCode: '' } : null} />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
                  Compete
                </h1>
                <p className="text-gray-400 text-base md:text-lg mb-2">Real-time rankings • 10 AI investors • Live market competition</p>
                <p className="text-gray-500 text-sm md:text-base">
                  Track your rank and compete against AI investors and fellow students. View detailed performance in the Manage tab.
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  AI investors trade every 6 hours (2-3 trades each) • Prices delayed 15 min
                </p>
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-3">
                <BarChart3 className="w-5 h-5" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live • Updated {data ? new Date(data.timestamp).toLocaleTimeString() : '—'}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2 md:gap-3">
              <button 
                onClick={() => setFilter('all')} 
                className={`px-3 py-2 rounded-lg transition-all ${
                  filter === 'all' 
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/50' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <User className="inline w-4 h-4 mr-2" /> All
              </button>
              <button 
                onClick={() => setFilter('students')} 
                className={`px-3 py-2 rounded-lg transition-all ${
                  filter === 'students' 
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/50' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <GraduationCap className="inline w-4 h-4 mr-2" /> Students
              </button>
              <button 
                onClick={() => setFilter('ai')} 
                className={`px-3 py-2 rounded-lg transition-all ${
                  filter === 'ai' 
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/50' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Bot className="inline w-4 h-4 mr-2" /> AI
              </button>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Investor
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Portfolio Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredLeaderboard.map((investor) => {
                    const isCurrentUser = data?.currentUser?.userId === investor.userId;
                    return (
                      <tr 
                        key={investor.userId}
                        onClick={() => setSelectedInvestor(investor)}
                        className={`
                          ${isCurrentUser ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'hover:bg-gray-700/30'}
                          transition-colors cursor-pointer
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xl font-bold text-white">#{investor.rank}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {investor.isAI ? (
                              <Bot className="w-5 h-5 text-purple-400" />
                            ) : (
                              <User className="w-5 h-5 text-green-400" />
                            )}
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                {isCurrentUser && <span className="text-blue-400">● </span>}
                                {investor.username}
                                <span className="text-xs text-gray-500">ⓘ</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-sm text-gray-400">
                                  {investor.isAI ? 'AI Investor' : 'Student'}
                                </div>
                                {/* Tier badges archived - see getTierBadge function above */}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-xl font-bold text-white">
                            {formatCurrency(investor.portfolioValue)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {formatCurrency(investor.cash)} cash
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {((investor.portfolioValue - 1000000) / 1000000) * 100 >= 0 ? (
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            )}
                            <div className={`text-xl font-bold ${getPerformanceColor(investor.portfolioValue)}`}>
                              {formatPercentage(investor.portfolioValue)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Real-time prices</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>{data?.totalInvestors} total investors</span>
            </div>
            {data?.currentUser && getPercentile() && (
              <>
                <span>•</span>
                <span>You&apos;re in the top {getPercentile()}%</span>
              </>
            )}
            <span>•</span>
            <span>Updated {new Date(data?.timestamp || '').toLocaleTimeString()}</span>
          </div>

        </div>
      </div>

      {/* Investor Profile Modal */}
      <InvestorProfileModal 
        investor={selectedInvestor} 
        onClose={() => setSelectedInvestor(null)} 
      />
    </div>
  );
}
