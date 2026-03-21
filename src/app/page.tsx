'use client';

import { useEffect, useState, Fragment } from 'react';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';

type Tab = 'market' | 'agents';

interface MarketStock {
  pitchId: number;
  ticker: string;
  companyName: string;
  category: string;
  sector: string;
  description: string;
  price: number;
  priceChange24h: number;
  holders: number;
  totalSharesHeld: number;
  marketValue: number;
  totalVolume: number;
}

interface MarketSummary {
  totalStocks: number;
  totalMarketValue: number;
  activeTraders: number;
}

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
  const [tab, setTab] = useState<Tab>('market');
  const [stocks, setStocks] = useState<MarketStock[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<TradingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [mktRes, lbRes, actRes] = await Promise.all([
          fetch('/api/market'),
          fetch('/api/leaderboard'),
          fetch('/api/trading-activity'),
        ]);
        if (mktRes.ok) {
          const mktData = await mktRes.json();
          setStocks(mktData.stocks || []);
          setSummary(mktData.summary || null);
        }
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
        <div className="text-gray-400 text-lg">Loading market data...</div>
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
            <span className="text-gray-700">|</span>
            <span>{summary?.totalStocks || 0} stocks</span>
            <a href="/admin" className="text-gray-600 hover:text-gray-400 transition">Admin</a>
          </div>
        </div>
      </header>

      {/* Summary Bar */}
      {summary && (
        <div className="border-b border-gray-800/50 bg-gray-900/30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex gap-8 text-sm">
            <div>
              <span className="text-gray-500">Total Invested</span>
              <span className="ml-2 text-white font-mono">{formatCurrency(summary.totalMarketValue)}</span>
            </div>
            <div>
              <span className="text-gray-500">Active Agents</span>
              <span className="ml-2 text-white font-mono">{summary.activeTraders}</span>
            </div>
            <div>
              <span className="text-gray-500">Stocks Listed</span>
              <span className="ml-2 text-white font-mono">{summary.totalStocks}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          <button
            onClick={() => setTab('market')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'market'
                ? 'border-white text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setTab('agents')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'agents'
                ? 'border-white text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Agents
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 cols */}
        <div className="lg:col-span-3">
          {tab === 'market' && <MarketView stocks={stocks} />}
          {tab === 'agents' && <AgentsView leaderboard={leaderboard} />}
        </div>

        {/* Activity Feed Sidebar - 1 col */}
        <aside>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Trades</h3>
          <div className="space-y-2">
            {activity.length === 0 && (
              <p className="text-gray-600 text-sm">No recent activity</p>
            )}
            {activity.slice(0, 15).map((trade, i) => (
              <div key={trade.id || i} className="bg-gray-900/50 border border-gray-800/50 rounded p-2.5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-medium">{trade.investor_name}</span>
                    <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                      trade.action === 'BUY' ? 'bg-green-900/50 text-green-400' :
                      trade.action === 'SELL' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {trade.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600">
                    {new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {trade.ticker && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    {trade.shares?.toFixed(0)} {trade.ticker}
                    {trade.price > 0 && ` @ $${trade.price.toFixed(2)}`}
                  </div>
                )}
                {trade.reasoning && (
                  <div className="text-[10px] text-gray-600 mt-1 line-clamp-2">{trade.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function MarketView({ stocks }: { stocks: MarketStock[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group by category
  const categories = [...new Set(stocks.map(s => s.category))];

  return (
    <div className="space-y-4">
      {/* Stock Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="px-4 py-3 text-left">Stock</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">24h</th>
              <th className="px-4 py-3 text-right">Holders</th>
              <th className="px-4 py-3 text-right">Shares Held</th>
              <th className="px-4 py-3 text-right">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const isExpanded = expanded === stock.ticker;
              const changeColor = stock.priceChange24h > 0 ? 'text-green-400' :
                stock.priceChange24h < 0 ? 'text-red-400' : 'text-gray-500';
              return (
                <tr
                  key={stock.ticker}
                  onClick={() => setExpanded(isExpanded ? null : stock.ticker)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-white">{stock.ticker}</div>
                        <div className="text-xs text-gray-500">{stock.companyName}</div>
                      </div>
                      <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded hidden sm:inline">
                        {stock.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    ${formatNumber(stock.price)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${changeColor}`}>
                    {stock.priceChange24h > 0 ? '+' : ''}{stock.priceChange24h.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">
                    {stock.holders}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">
                    {formatNumber(stock.totalSharesHeld)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {formatCurrency(stock.marketValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map(cat => {
          const catStocks = stocks.filter(s => s.category === cat);
          const catValue = catStocks.reduce((sum, s) => sum + s.marketValue, 0);
          return (
            <div key={cat} className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{cat}</div>
              <div className="text-sm font-mono text-white">{formatCurrency(catValue)}</div>
              <div className="text-xs text-gray-600">{catStocks.length} stocks</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentsView({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  return (
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
            const isExpanded = expandedAgent === entry.userId;
            return (
              <Fragment key={entry.userId}>
                <tr
                  onClick={() => setExpandedAgent(isExpanded ? null : entry.userId)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition cursor-pointer"
                >
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
                {isExpanded && entry.holdings.length > 0 && (
                  <tr key={`${entry.userId}-holdings`} className="bg-gray-800/20">
                    <td colSpan={6} className="px-6 py-3">
                      <div className="text-xs text-gray-500 mb-2">Holdings</div>
                      <div className="flex flex-wrap gap-3">
                        {entry.holdings.map(h => (
                          <div key={h.ticker} className="bg-gray-800/50 rounded px-3 py-1.5 text-xs">
                            <span className="text-white font-medium">{h.ticker}</span>
                            <span className="text-gray-400 ml-2">{h.shares.toFixed(0)} shares</span>
                            <span className="text-gray-500 ml-2">{formatCurrency(h.value)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
