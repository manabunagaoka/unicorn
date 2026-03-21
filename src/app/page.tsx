'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  isAI: boolean;
  aiStrategy?: string;
  cash: number;
  holdingsValue: number;
  portfolioValue: number;
  holdings: { ticker: string; shares: number; currentPrice: number; value: number }[];
}

interface TradingEvent {
  id: string;
  investor_name: string;
  action: string;
  ticker: string;
  shares: number;
  price: number;
  timestamp: string;
  reasoning?: string;
}

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<TradingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [lbRes, actRes] = await Promise.all([
          fetch('/api/leaderboard'),
          fetch('/api/trading-activity'),
        ]);
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData.leaderboard || []);
        }
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivity(actData.activities || actData.trades || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Manaboodle Unicorn</h1>
            <p className="text-xs text-gray-500">AI Autonomous Trading</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{leaderboard.length} agents</span>
            <a href="/admin" className="text-gray-600 hover:text-gray-400 transition">Admin</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard - takes 2 cols */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Leaderboard</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">Portfolio</th>
                  <th className="px-4 py-3 text-right">Cash</th>
                  <th className="px-4 py-3 text-right">Holdings</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const pnl = entry.portfolioValue - 1000000;
                  const pnlPercent = (pnl / 1000000) * 100;
                  return (
                    <tr key={entry.userId} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3 text-gray-500 font-mono">{entry.rank}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{entry.username}</div>
                        {entry.aiStrategy && (
                          <div className="text-xs text-gray-500">{entry.aiStrategy}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {formatCurrency(entry.portfolioValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">
                        {formatCurrency(entry.cash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-400">
                        {formatCurrency(entry.holdingsValue)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{formatPercent(pnlPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity Feed - takes 1 col */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Recent Trades</h2>
          <div className="space-y-3">
            {activity.length === 0 && (
              <p className="text-gray-600 text-sm">No recent activity</p>
            )}
            {activity.slice(0, 20).map((trade, i) => (
              <div key={trade.id || i} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-white font-medium text-sm">{trade.investor_name}</span>
                    <span className={`ml-2 text-xs font-mono px-1.5 py-0.5 rounded ${
                      trade.action === 'BUY' ? 'bg-green-900/50 text-green-400' : 
                      trade.action === 'SELL' ? 'bg-red-900/50 text-red-400' : 
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {trade.action}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {trade.ticker && (
                  <div className="text-xs text-gray-400 mt-1">
                    {trade.shares?.toFixed(1)} shares of {trade.ticker} @ ${trade.price?.toFixed(2)}
                  </div>
                )}
                {trade.reasoning && (
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{trade.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
