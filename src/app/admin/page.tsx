'use client';

import { useState, useEffect } from 'react';
import { formatNumber, formatCurrency, formatPercent, formatShares } from '@/lib/formatters';

interface User {
  userId: string;
  displayName: string;
  email: string | null;
  isAI: boolean;
  ui: any;
  db: any;
  discrepancies: any;
  hasDiscrepancy: boolean;
}

interface AIDetail {
  user: any;
  investments: any[];
  transactions: any[];
  logs: any[];
  pitches: any[];
  lastTradeTime: string | null;
  systemInfo: any;
}

interface TestResult {
  timestamp: string;
  aiName: string;
  userId: string;
  success: boolean;
  decision?: {
    action: string;
    ticker?: string;
    shares?: number;
    reasoning: string;
  };
  execution?: {
    balanceBefore: number;
    balanceAfter: number;
    portfolioBefore: number;
    portfolioAfter: number;
    price?: number;
    cost?: number;
  };
  message: string;
  error?: string;
}

const TICKER_MAP: Record<number, string> = {
  1: 'META', 2: 'MSFT', 3: 'ABNB', 4: 'NET', 5: 'GRAB',
  6: 'MRNA', 7: 'KVYO', 8: 'AFRM', 9: 'PTON', 10: 'ASAN',
  11: 'LYFT', 12: 'TDUP', 13: 'KIND', 14: 'RENT'
};

export default function UnicornAdmin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data-integrity' | 'ai-investors' | 'human-users'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [aiInvestors, setAIInvestors] = useState<any[]>([]);
  const [selectedAI, setSelectedAI] = useState<string | null>(null);
  const [aiDetail, setAIDetail] = useState<AIDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [testTrading, setTestTrading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const [personaText, setPersonaText] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const [generatedPersona, setGeneratedPersona] = useState<string>('');
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [batchProgress, setBatchProgress] = useState<{
    show: boolean;
    current: number;
    total: number;
    currentAI?: string;
    results: Array<{ ai: string; success: boolean; data?: any; error?: string }>;
  }>({ show: false, current: 0, total: 0, results: [] });
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'toggle-active' | 'delete' | 'clone' | 'reset' | 'batch-test' | 'activate-all' | 'deactivate-all' | 'success' | 'error' | null;
    aiData: any;
  }>({
    show: false,
    title: '',
    message: '',
    type: null,
    aiData: null
  });

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const savePersona = async (userId: string, newPersona: string) => {
    try {
      const res = await fetch('/api/admin/ai-update-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, persona: newPersona })
      });
      if (res.ok) {
        setConfirmModal({
          show: true,
          title: 'Success',
          message: 'Persona updated successfully!',
          type: 'success',
          aiData: null
        });
        setEditingPersona(false);
        setGeneratedPersona('');
        setGeneratedSummary('');
        loadAIDetail(userId);
        loadData();
      } else {
        setConfirmModal({
          show: true,
          title: 'Error',
          message: 'Failed to update persona',
          type: 'error',
          aiData: null
        });
      }
    } catch (err) {
      console.error('Error updating persona:', err);
      setConfirmModal({
        show: true,
        title: 'Error',
        message: 'Error updating persona',
        type: 'error',
        aiData: null
      });
    }
  };

  const generatePersona = async () => {
    // Auto-generate description from existing data
    const existingPersona = aiDetail?.user?.persona || aiDetail?.user?.catchphrase || '';
    const strategy = aiDetail?.user?.strategy || '';
    const nickname = aiDetail?.user?.nickname || 'AI Investor';
    
    const description = existingPersona || `${nickname} - ${strategy} strategy investor`;

    setGeneratingPersona(true);
    console.log('[Persona Gen] Starting generation...', {
      description,
      nickname: aiDetail?.user?.nickname,
      strategy: aiDetail?.user?.strategy
    });

    try {
      const res = await fetch('/api/admin/ai-generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: description,
          currentData: {
            nickname: aiDetail?.user?.nickname,
            strategy: aiDetail?.user?.strategy,
            catchphrase: aiDetail?.user?.catchphrase
          }
        })
      });

      console.log('[Persona Gen] Response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('[Persona Gen] Success! Persona length:', data.persona?.length || 0);
        console.log('[Persona Gen] Quick summary:', data.quickSummary);
        
        setGeneratedPersona(data.persona || '');
        setGeneratedSummary(data.quickSummary || '');
      } else {
        const errorData = await res.json();
        console.error('[Persona Gen] API Error:', errorData);
        
        setConfirmModal({
          show: true,
          title: 'Generation Failed',
          message: `Failed to generate persona: ${errorData.error || 'Unknown error'}${errorData.details ? '\n\nDetails: ' + errorData.details : ''}`,
          type: 'error',
          aiData: null
        });
        
        // Reset state on error
        setGeneratedPersona('');
        setGeneratedSummary('');
      }
    } catch (err) {
      console.error('[Persona Gen] Fetch Error:', err);
      setConfirmModal({
        show: true,
        title: 'Error',
        message: `Error generating persona: ${err instanceof Error ? err.message : 'Network error'}`,
        type: 'error',
        aiData: null
      });
      
      // Reset state on error
      setGeneratedPersona('');
      setGeneratedSummary('');
    } finally {
      setGeneratingPersona(false);
    }
  };

  const acceptGeneratedPersona = async () => {
    if (!generatedPersona || !selectedAI) return;

    await savePersona(selectedAI, generatedPersona);
    
    // Reset generation state
    setGeneratedPersona('');
    setGeneratedSummary('');
  };

  const handleToggleActive = async () => {
    if (!confirmModal.aiData) return;
    
    try {
      const res = await fetch('/api/admin/ai-toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: confirmModal.aiData.userId, 
          isActive: !confirmModal.aiData.isActive,
          adminToken: 'admin_secret_manaboodle_2025'
        })
      });
      if (res.ok) {
        loadData();
        setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.aiData) return;
    
    try {
      const res = await fetch('/api/admin/ai-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: confirmModal.aiData.userId,
          adminToken: 'admin_secret_manaboodle_2025'
        })
      });
      if (res.ok) {
        loadData();
        setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
      }
    } catch (err) {
      console.error('Delete AI error:', err);
    }
  };

  const handleClone = async () => {
    if (!confirmModal.aiData) return;
    
    try {
      const res = await fetch('/api/admin/ai-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceUserId: confirmModal.aiData.userId,
          adminToken: 'admin_secret_manaboodle_2025'
        })
      });
      if (res.ok) {
        loadData();
        setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
      }
    } catch (err) {
      console.error('Clone AI error:', err);
    }
  };

  const handleReset = async () => {
    if (!confirmModal.aiData) return;
    
    try {
      console.log('[Reset] Attempting reset for:', confirmModal.aiData);
      const res = await fetch('/api/admin/ai-reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin_secret_manaboodle_2025'
        },
        body: JSON.stringify({ 
          userId: confirmModal.aiData.userId,
          adminToken: 'admin_secret_manaboodle_2025'
        })
      });
      
      const data = await res.json();
      console.log('[Reset] Response:', { status: res.status, ok: res.ok, data });
      
      if (res.ok) {
        console.log('[Reset] Success! Reloading data...');
        await loadData();
        setConfirmModal({ 
          show: true, 
          title: 'Reset Successful', 
          message: `✅ ${confirmModal.aiData.nickname} has been reset to $1,000,000 MTK with all history cleared.`, 
          type: 'success', 
          aiData: null 
        });
      } else {
        console.error('[Reset] Failed:', data);
        setConfirmModal({ 
          show: true, 
          title: 'Reset Failed', 
          message: `❌ Failed to reset ${confirmModal.aiData.nickname}: ${data.error || 'Unknown error'}`, 
          type: 'error', 
          aiData: null 
        });
      }
    } catch (err) {
      console.error('[Reset] Error:', err);
      setConfirmModal({ 
        show: true, 
        title: 'Reset Error', 
        message: `❌ Error resetting AI: ${err instanceof Error ? err.message : String(err)}`, 
        type: 'error', 
        aiData: null 
      });
    }
  };

  const handleBatchTest = async () => {
    if (!confirmModal.aiData?.activeAIs) return;
    
    const activeAIs = confirmModal.aiData.activeAIs;
    setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
    setBatchProgress({ show: true, current: 0, total: activeAIs.length, results: [] });
    setShowResults(true); // Auto-show results panel
    
    for (let i = 0; i < activeAIs.length; i++) {
      const ai = activeAIs[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1, currentAI: ai.nickname }));
      
      try {
        const res = await fetch('/api/admin/ai-trading/trigger', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-test-token'
          },
          body: JSON.stringify({ 
            userId: ai.userId,
            adminToken: 'admin_secret_manaboodle_2025'
          })
        });
        const data = await res.json();
        
        // Add to batch progress
        setBatchProgress(prev => ({
          ...prev,
          results: [...prev.results, { ai: ai.nickname, success: res.ok, data }]
        }));
        
        // Add to test results panel
        // API returns { results: [{ decision, result, execution }] }
        if (res.ok && data.results && data.results[0]) {
          const result = data.results[0];
          const testResult: TestResult = {
            timestamp: new Date().toISOString(),
            aiName: ai.nickname,
            userId: ai.userId,
            success: result.result?.success || false,
            decision: result.decision,
            execution: result.execution,
            message: result.result?.message || 'Trade executed'
          };
          setTestResults(prev => [testResult, ...prev].slice(0, 20));
        }
      } catch (err) {
        setBatchProgress(prev => ({
          ...prev,
          results: [...prev.results, { ai: ai.nickname, success: false, error: String(err) }]
        }));
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setBatchProgress(prev => ({ ...prev, currentAI: undefined }));
    loadData();
  };

  const handleActivateAll = async () => {
    setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
    for (const ai of aiInvestors) {
      if (!ai.isActive) {
        await fetch('/api/admin/ai-toggle-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: ai.userId, 
            isActive: true,
            adminToken: 'admin_secret_manaboodle_2025'
          })
        });
      }
    }
    loadData();
  };

  const handleDeactivateAll = async () => {
    setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
    for (const ai of aiInvestors) {
      if (ai.isActive) {
        await fetch('/api/admin/ai-toggle-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: ai.userId, 
            isActive: false,
            adminToken: 'admin_secret_manaboodle_2025'
          })
        });
      }
    }
    loadData();
  };

  const confirmAction = () => {
    if (confirmModal.type === 'toggle-active') {
      handleToggleActive();
    } else if (confirmModal.type === 'delete') {
      handleDelete();
    } else if (confirmModal.type === 'clone') {
      handleClone();
    } else if (confirmModal.type === 'reset') {
      handleReset();
    } else if (confirmModal.type === 'batch-test') {
      handleBatchTest();
    } else if (confirmModal.type === 'activate-all') {
      handleActivateAll();
    } else if (confirmModal.type === 'deactivate-all') {
      handleDeactivateAll();
    } else if (confirmModal.type === 'success' || confirmModal.type === 'error') {
      // Just close modal for success/error messages
      setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'rize2025') {
      setIsAuthenticated(true);
      loadData();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all APIs with comparison
      const cacheBuster = Date.now();
      const [integrityRes, aiRes, leaderboardRes] = await Promise.all([
        fetch(`/api/data-integrity?t=${cacheBuster}`),
        fetch(`/api/admin/ai-investors?t=${cacheBuster}`),
        fetch(`/api/leaderboard?t=${cacheBuster}`)
      ]);
      
      if (integrityRes.ok && aiRes.ok) {
        const integrityData = await integrityRes.json();
        const aiData = await aiRes.json();
        const leaderboardData = leaderboardRes.ok ? await leaderboardRes.json() : null;
        
        // Fetch db-truth for each user
        const dbTruthResults = await Promise.all(
          integrityData.users.map(async (intUser: any) => {
            try {
              const res = await fetch(`/api/db-truth?userId=${intUser.userId}&t=${cacheBuster}`);
              if (res.ok) {
                return await res.json();
              }
            } catch (err) {
              console.error(`Failed to fetch db-truth for ${intUser.userId}:`, err);
            }
            return null;
          })
        );
        
        // Build comparison for each user
        const usersWithComparison = integrityData.users.map((intUser: any, index: number) => {
          const aiInv = aiData.aiInvestors?.find((ai: any) => ai.userId === intUser.userId);
          const lbUser = leaderboardData?.leaderboard?.find((u: any) => u.userId === intUser.userId);
          const dbUser = dbTruthResults[index];
          
          const values = {
            aiInvestors: aiInv?.totalValue || 0,
            integrity: intUser.ui.totalValue || 0,
            leaderboard: lbUser?.portfolioValue || 0,
            database: dbUser?.database_raw.total_value || 0
          };
          
          // Allow small differences due to price timing (< $1 is OK)
          const closeEnough = (a: number, b: number) => Math.abs(a - b) < 1;
          
          // For AI investors: all 3 live APIs should match
          // For human investors: skip aiInvestors comparison (it's not in that API)
          const allMatch = intUser.isAI 
            ? (closeEnough(values.aiInvestors, values.integrity) && closeEnough(values.integrity, values.leaderboard))
            : closeEnough(values.integrity, values.leaderboard);
          
          return { ...intUser, apiComparison: { values, allMatch, aiInv, lbUser, dbUser } };
        });
        
        setUsers(usersWithComparison);
        setAIInvestors(aiData.aiInvestors || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAIDetail = async (userId: string) => {
    setSelectedAI(userId);
    setAIDetail(null);
    try {
      const res = await fetch(`/api/admin/ai-details?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAIDetail(data);
      }
    } catch (err) {
      console.error('Error loading AI detail:', err);
    }
  };

  const triggerTestTrade = async (userId: string) => {
    setTestTrading(true);
    const aiName = aiDetail?.user?.nickname || 'Unknown AI';
    
    try {
      const res = await fetch('/api/admin/ai-trading/trigger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-test-token'
        },
        body: JSON.stringify({ userId })
      });
      
      if (res.ok) {
        const data = await res.json();
        const result = data.results?.[0];
        
        if (result) {
          const testResult: TestResult = {
            timestamp: new Date().toISOString(),
            aiName,
            userId,
            success: result.result?.success || false,
            decision: result.decision ? {
              action: result.decision.action || 'UNKNOWN',
              ticker: result.decision.ticker,
              shares: result.decision.shares,
              reasoning: result.decision.reasoning || 'No reasoning provided'
            } : undefined,
            execution: result.execution ? {
              balanceBefore: result.execution.balanceBefore || 0,
              balanceAfter: result.execution.balanceAfter || 0,
              portfolioBefore: result.execution.portfolioBefore || 0,
              portfolioAfter: result.execution.portfolioAfter || 0,
              price: result.execution.price,
              cost: result.execution.cost
            } : undefined,
            message: result.result?.message || 'No message',
            error: result.error
          };
          
          setTestResults(prev => [testResult, ...prev].slice(0, 10)); // Keep last 10
          setShowResults(true);
        }
        
        // Reload AI detail and data
        loadAIDetail(userId);
        loadData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const testResult: TestResult = {
          timestamp: new Date().toISOString(),
          aiName,
          userId,
          success: false,
          message: 'Failed to execute test trade',
          error: errorData.error || 'Unknown error'
        };
        setTestResults(prev => [testResult, ...prev].slice(0, 10));
        setShowResults(true);
      }
    } catch (err) {
      console.error('Error triggering test trade:', err);
      const testResult: TestResult = {
        timestamp: new Date().toISOString(),
        aiName,
        userId,
        success: false,
        message: 'Failed to trigger test trade',
        error: err instanceof Error ? err.message : String(err)
      };
      setTestResults(prev => [testResult, ...prev].slice(0, 10));
      setShowResults(true);
    } finally {
      setTestTrading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && autoRefresh) {
      // Only refresh if auto-refresh is enabled, and use 5 minutes to match cache TTL
      const interval = setInterval(loadData, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, autoRefresh]);


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Unicorn Admin
          </h1>
          <p className="text-gray-400 text-center mb-6">Complete platform management</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
              placeholder="Admin Password"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Access Admin Panel
            </button>
            <p className="text-gray-400 text-xs text-center">Password: rize2025</p>
          </form>
        </div>
      </div>
    );
  }

  const humanUsers = users.filter(u => !u.isAI);
  const issuesCount = users.filter(u => u.hasDiscrepancy).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Unicorn Admin</h1>
            <p className="text-gray-400 text-sm">Complete platform management</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-gray-300">Auto-refresh (5min)</span>
            </label>
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'data-integrity', label: 'Data Integrity' },
              { id: 'ai-investors', label: 'AI Investors' },
              { id: 'human-users', label: 'Human Users' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-1">Total Users</div>
                <div className="text-3xl font-bold">{users.length}</div>
                <div className="text-xs text-gray-500 mt-1">{humanUsers.length} humans, {users.length - humanUsers.length} AI</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-6 border border-red-500">
                <div className="text-red-400 text-sm mb-1">Data Issues</div>
                <div className="text-3xl font-bold text-red-400">{issuesCount}</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-6 border border-green-500">
                <div className="text-green-400 text-sm mb-1">Active AI</div>
                <div className="text-3xl font-bold text-green-400">
                  {aiInvestors.filter(ai => ai.status === 'ACTIVE').length}
                </div>
              </div>
              <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-500">
                <div className="text-blue-400 text-sm mb-1">Platform Value</div>
                <div className="text-2xl font-bold text-blue-400">
                  ${users.reduce((sum, u) => sum + (u.ui?.totalValue || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('data-integrity')}
                  className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left"
                >
                  <div className="font-bold text-lg mb-1">Data Integrity</div>
                  <div className="text-sm text-gray-400">
                    {issuesCount > 0 ? `${issuesCount} issues found` : 'All healthy'}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('ai-investors')}
                  className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left"
                >
                  <div className="font-bold text-lg mb-1">AI Investors</div>
                  <div className="text-sm text-gray-400">{aiInvestors.length} AI traders</div>
                </button>
                <button
                  onClick={() => setActiveTab('human-users')}
                  className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg text-left"
                >
                  <div className="font-bold text-lg mb-1">Human Users</div>
                  <div className="text-sm text-gray-400">{humanUsers.length} investors</div>
                </button>
                <div className="bg-gray-700/50 p-4 rounded-lg opacity-50">
                  <div className="font-bold text-lg mb-1">Competitions</div>
                  <div className="text-sm text-gray-400">Coming soon</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 text-2xl">ℹ️</div>
                <div>
                  <div className="font-bold text-blue-400 mb-1">API Usage Notice</div>
                  <div className="text-sm text-gray-300">
                    All prices are cached for 5 minutes to conserve Finnhub API quota. 
                    Auto-refresh is disabled by default. Enable it only when actively monitoring markets.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data-integrity' && (
          <div className="space-y-6">
            {/* API Comparison Info */}
            <div className="border border-blue-500 bg-blue-900/10 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-2 text-blue-400">🔍 Live API Comparison Active</h2>
              <p className="text-sm text-gray-400">
                Showing real-time comparison from all APIs. Small differences (&lt;$1000) between refreshes are normal due to live price changes.
                {' '}<button onClick={loadData} className="text-blue-400 underline hover:text-blue-300">
                  Refresh data
                </button>
              </p>
            </div>
            
            {users.map(user => (
              <div
                key={user.userId}
                className={`border rounded-lg p-6 ${
                  user.hasDiscrepancy ? 'border-red-500 bg-red-900/10' : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{user.displayName}</h2>
                    <p className="text-gray-400 text-sm">
                      {user.isAI ? 'AI Investor' : 'Human Investor'} {user.email && `• ${user.email}`}
                    </p>
                  </div>
                  {user.hasDiscrepancy ? (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">ISSUE</span>
                  ) : (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">OK</span>
                  )}
                </div>

                {/* API Comparison Section (if fetched) */}
                {(user as any).apiComparison && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="text-purple-400">API Comparison</span>
                      {(user as any).apiComparison.allMatch ? (
                        <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs">ALL MATCH</span>
                      ) : (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">MISMATCH</span>
                      )}
                    </h3>
                    <div className={`grid ${user.isAI ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-sm`}>
                      {/* Only show AI Investors API for AI investors */}
                      {user.isAI && (
                        <div className="bg-gray-900/50 rounded p-3">
                          <div className="text-gray-400 text-xs mb-1">AI Investors API</div>
                          <div className={`font-mono font-bold ${(user as any).apiComparison.allMatch ? 'text-green-400' : 'text-red-400'}`}>
                            ${(user as any).apiComparison.values.aiInvestors.toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div className="bg-gray-900/50 rounded p-3">
                        <div className="text-gray-400 text-xs mb-1">Data Integrity API</div>
                        <div className={`font-mono font-bold ${(user as any).apiComparison.allMatch ? 'text-green-400' : 'text-red-400'}`}>
                          ${(user as any).apiComparison.values.integrity.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3">
                        <div className="text-gray-400 text-xs mb-1">Leaderboard API</div>
                        <div className={`font-mono font-bold ${(user as any).apiComparison.allMatch ? 'text-green-400' : 'text-red-400'}`}>
                          ${(user as any).apiComparison.values.leaderboard.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-3">
                        <div className="text-gray-400 text-xs mb-1">Database (Stale)</div>
                        <div className="font-mono font-bold text-gray-500">
                          ${(user as any).apiComparison.values.database.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {!(user as any).apiComparison.allMatch && (
                      <div className="mt-2 text-xs text-red-400">
                        ⚠️ Values don&apos;t match! Max difference: $
                        {user.isAI 
                          ? Math.max(
                              Math.abs((user as any).apiComparison.values.aiInvestors - (user as any).apiComparison.values.integrity),
                              Math.abs((user as any).apiComparison.values.aiInvestors - (user as any).apiComparison.values.leaderboard),
                              Math.abs((user as any).apiComparison.values.integrity - (user as any).apiComparison.values.leaderboard)
                            ).toLocaleString()
                          : Math.abs((user as any).apiComparison.values.integrity - (user as any).apiComparison.values.leaderboard).toLocaleString()
                        }
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-blue-400">UI Display</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cash:</span>
                        <span className="font-mono">${user.ui?.cash?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Portfolio:</span>
                        <span className="font-mono">${user.ui?.portfolioValue?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-mono">${user.ui?.totalValue?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-3 text-green-400">Database</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cash:</span>
                        <span className="font-mono">${user.db?.cash?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Portfolio:</span>
                        <span className="font-mono">${user.db?.portfolioValue?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-mono">${user.db?.totalValue?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {user.ui?.investments?.length > 0 && (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-bold text-gray-300 mb-2">Holdings</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {user.ui.investments.map((inv: any, idx: number) => (
                        <div key={idx} className="bg-gray-900/50 rounded p-2 text-sm">
                          <span className="font-bold text-blue-400">{inv.ticker}</span>
                          <span className="text-gray-400 ml-2">{formatShares(inv.shares)} @ ${formatNumber(inv.currentPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai-investors' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">AI Investors ({aiInvestors.length})</h2>
              <div className="text-sm text-gray-400">Click any AI to see details and test trades</div>
            </div>

            {/* 2-Column Layout: Main Content + Side Panel */}
            <div className="grid grid-cols-12 gap-4">
              {/* Main Content - Left Side (8 columns) */}
              <div className="col-span-8 space-y-4">{/* Batch Operations */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3 text-blue-400">Batch Operations</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    const activeAIs = aiInvestors.filter(ai => ai.isActive);
                    if (activeAIs.length === 0) {
                      setConfirmModal({
                        show: true,
                        title: 'No Active AIs',
                        message: 'There are no active AIs to test. Please activate at least one AI first.',
                        type: null,
                        aiData: null
                      });
                      return;
                    }
                    
                    setConfirmModal({
                      show: true,
                      title: 'Test All Active AIs',
                      message: `Run test trades for all ${activeAIs.length} active AIs?\n\nThis will execute sequentially and may take a few minutes.`,
                      type: 'batch-test',
                      aiData: { activeAIs }
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  🚀 Test All Active AIs ({aiInvestors.filter(ai => ai.isActive).length})
                </button>
                
                {/* Note: Activate All button hidden - AI trading cron is currently disabled */}
                {/* To enable: Add AI trading schedule to vercel.json crons array */}
                
                <button
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: 'Deactivate All AIs',
                      message: `Deactivate ALL ${aiInvestors.length} AI investors?\n\nAll AIs will be paused and skip auto-trading.`,
                      type: 'deactivate-all',
                      aiData: null
                    });
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ○ Deactivate All
                </button>
                
                <button
                  onClick={() => {
                    const csvData = aiInvestors.map(ai => ({
                      Nickname: ai.nickname,
                      Strategy: ai.strategy,
                      Status: ai.isActive ? 'Active' : 'Inactive',
                      Cash: ai.cash,
                      Total_Value: ai.totalValue,
                      ROI: ai.roi,
                      Total_Trades: ai.totalTrades || 0,
                      Win_Rate: ai.winRate || 0,
                      Last_Trade: ai.lastTradeTime || 'Never'
                    }));
                    const csv = [
                      Object.keys(csvData[0]).join(','),
                      ...csvData.map(row => Object.values(row).join(','))
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ai-investors-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  📊 Export All Stats
                </button>
              </div>
              
              {/* Batch Progress Indicator */}
              {batchProgress.show && (
                <div className="mt-4 bg-gray-900 rounded p-4 border border-blue-500">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">
                      {batchProgress.currentAI ? `Testing ${batchProgress.currentAI}...` : 'Complete!'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {batchProgress.current}/{batchProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {batchProgress.results.map((result, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>{result.success ? '✓' : '✗'}</span>
                        <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                          {result.ai}
                        </span>
                        {result.success && result.data?.decision && (
                          <span className="text-gray-400">
                            {result.data.decision.action} {result.data.decision.ticker || ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!batchProgress.currentAI && (
                    <button
                      onClick={() => setBatchProgress({ show: false, current: 0, total: 0, results: [] })}
                      className="mt-3 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm w-full"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">{aiInvestors.map(ai => (
                <div
                  key={ai.userId}
                  className="bg-gray-800 rounded-lg p-4 relative"
                >
                  {/* Active/Inactive Badge */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          show: true,
                          title: ai.isActive ? 'Deactivate AI' : 'Activate AI',
                          message: `Are you sure you want to ${ai.isActive ? 'deactivate' : 'activate'} ${ai.nickname}?\n\n${ai.isActive ? 'Inactive AIs will be skipped during auto-trading.' : 'AI will resume trading on schedule.'}`,
                          type: 'toggle-active',
                          aiData: { userId: ai.userId, isActive: ai.isActive, nickname: ai.nickname }
                        });
                      }}
                      className={`text-sm px-3 py-1.5 rounded font-medium transition-all ${
                        ai.isActive !== false 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/50' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title={ai.isActive !== false ? 'Active - Click to pause' : 'Inactive - Click to activate'}
                    >
                      {ai.isActive !== false ? '● Active' : '○ Inactive'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          show: true,
                          title: 'Clone AI Investor',
                          message: `Create a copy of ${ai.nickname}?\n\nThe clone will have:\n- Same strategy and persona\n- Fresh $1M balance\n- Empty trading history\n- Name: "${ai.nickname} 2"`,
                          type: 'clone',
                          aiData: { userId: ai.userId, nickname: ai.nickname, strategy: ai.strategy, emoji: ai.emoji, catchphrase: ai.catchphrase, persona: ai.persona }
                        });
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg shadow-purple-900/50"
                      title="Clone this AI"
                    >
                      👥
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          show: true,
                          title: 'Reset AI Investor',
                          message: `🔄 RESET ${ai.nickname}?\n\nThis will:\n- Reset balance to $1,000,000\n- Clear all transaction history\n- Clear all trading logs\n- Preserve persona and strategy\n\nThis action CANNOT be undone!`,
                          type: 'reset',
                          aiData: { userId: ai.userId, nickname: ai.nickname }
                        });
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-medium transition-all shadow-lg shadow-orange-900/50"
                      title="Reset to fresh start"
                    >
                      🔄
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          show: true,
                          title: 'Delete AI Investor',
                          message: `⚠️ DELETE ${ai.nickname} PERMANENTLY?\n\nThis will remove:\n- AI investor profile\n- All holdings\n- All transaction history\n- All trading logs\n\nThis action CANNOT be undone!`,
                          type: 'delete',
                          aiData: { userId: ai.userId, nickname: ai.nickname }
                        });
                      }}
                      className="text-sm px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-all shadow-lg shadow-red-900/50"
                      title="Delete permanently"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Clickable card content */}
                  <button
                    onClick={() => loadAIDetail(ai.userId)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{ai.emoji}</span>
                      <div>
                        <div className="font-bold text-lg">{ai.nickname}</div>
                        <div className="text-sm text-gray-400">{ai.strategy}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 italic mb-3">&quot;{ai.catchphrase}&quot;</p>
                    
                    {/* Financial Stats - Excel Style */}
                    <div className="bg-gray-900/50 rounded p-3 mb-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cash:</span>
                          <span className="text-white">${ai.cash.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Portfolio:</span>
                          <span className="text-white">${(ai.portfolioValue - ai.cash).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total:</span>
                          <span className="text-white font-bold">${ai.totalValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">ROI:</span>
                          <span className={`font-bold ${(typeof ai.roi === 'number' ? ai.roi : parseFloat(ai.roi || '0')) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof ai.roi === 'number' ? ai.roi.toFixed(2) : ai.roi || '0.00'}%
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-gray-700 mt-2 pt-2 grid grid-cols-3 gap-x-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trades:</span>
                          <span className="text-white">{ai.totalTrades || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Win Rate:</span>
                          <span className="text-blue-400">{ai.winRate || '0.0'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last:</span>
                          <span className="text-white">
                            {ai.lastTradeTime ? new Date(ai.lastTradeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Holdings - All Stocks */}
                    {ai.investments?.length > 0 && (
                      <div className="bg-gray-900/30 rounded p-2">
                        <div className="text-xs text-gray-400 mb-2 font-semibold">HOLDINGS ({ai.investments.length})</div>
                        <div className="space-y-1">
                          {ai.investments.map((inv: any) => (
                            <div key={inv.pitchId} className="flex justify-between items-center text-xs font-mono">
                              <span className="text-blue-400 font-bold">{TICKER_MAP[inv.pitchId]}</span>
                              <span className="text-gray-300">{formatShares(inv.shares)} @ ${formatNumber(inv.currentValue / inv.shares)}</span>
                              <span className={`font-semibold ${inv.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {inv.gain >= 0 ? '+' : ''}{inv.gainPercent}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!ai.investments?.length && (
                      <div className="bg-gray-900/30 rounded p-2 text-center text-xs text-gray-500">
                        No holdings
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
              </div>

              {/* Side Panel - Test Results (4 columns) */}
              <div className="col-span-4">
                {testResults.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4 sticky top-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-lg">Test Results</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowResults(!showResults)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                        >
                          {showResults ? 'Hide' : 'Show'}
                        </button>
                        <button
                          onClick={() => setTestResults([])}
                          className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {showResults && (
                      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {testResults.map((result, idx) => (
                          <div key={idx} className="bg-gray-900 p-3 rounded text-xs border-l-4" 
                               style={{borderColor: result.success ? '#10b981' : '#ef4444'}}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-bold">
                                  {result.success ? '✅' : '❌'} {result.aiName}
                                </div>
                                <div className="text-gray-500 text-[10px]">
                                  {formatTimestamp(result.timestamp)}
                                </div>
                              </div>
                            </div>

                            {result.decision && (
                              <div className="mb-2 bg-gray-800 p-2 rounded">
                                <div className="font-semibold text-blue-400">
                                  {result.decision.action} {result.decision.ticker} 
                                  {result.decision.shares && ` (${Math.floor(result.decision.shares)})`}
                                </div>
                                <div className="text-gray-400 italic mt-1 text-[10px]">
                                  {result.decision.reasoning?.substring(0, 80)}...
                                </div>
                              </div>
                            )}

                            {result.execution && (
                              <div className="text-[10px] space-y-1 font-mono">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Cash:</span>
                                  <span>${Math.floor(result.execution.balanceBefore).toLocaleString()} → ${Math.floor(result.execution.balanceAfter).toLocaleString()}</span>
                                </div>
                                {result.execution.cost && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Cost:</span>
                                    <span className="text-red-400">-${Math.floor(result.execution.cost).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {result.error && (
                              <div className="mt-2 text-red-400 text-[10px]">
                                {result.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!showResults && (
                      <div className="text-center text-gray-500 text-sm py-4">
                        {testResults.length} result{testResults.length !== 1 ? 's' : ''} hidden
                      </div>
                    )}
                  </div>
                )}
                {testResults.length === 0 && (
                  <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-500 text-sm">
                    No test results yet.<br/>
                    <span className="text-xs">Click &ldquo;Test&rdquo; on any AI card to run a trade simulation</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'human-users' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Human Users ({humanUsers.length})</h2>
            <div className="grid grid-cols-1 gap-4">
              {humanUsers.map(user => (
                <div key={user.userId} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-lg">{user.displayName}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total Value</div>
                      <div className="font-mono text-xl">${user.ui?.totalValue?.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400">Cash</div>
                      <div className="font-mono">${(user.ui?.cash || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Portfolio</div>
                      <div className="font-mono">${(user.ui?.portfolioValue || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Holdings</div>
                      <div className="font-mono">{user.ui?.investments?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">ROI</div>
                      <div className={`font-mono ${user.ui?.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {user.ui?.roi?.toFixed(2) || '0.00'}%
                      </div>
                    </div>
                  </div>
                  {user.ui?.investments?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {user.ui.investments.map((inv: any) => (
                          <span key={inv.pitchId} className="text-xs bg-blue-600 px-2 py-1 rounded">
                            {inv.ticker}: {formatShares(inv.shares)} @ ${formatNumber(inv.currentPrice)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedAI && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedAI(null)}>
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-bold">AI Investor Deep Inspection</h2>
              <button onClick={() => setSelectedAI(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {!aiDetail ? (
                <div className="text-center py-12 text-gray-400">Loading AI details...</div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold">{aiDetail.user?.nickname || 'AI Investor'}</h3>
                        <p className="text-gray-400">{aiDetail.user?.strategy || 'N/A'}</p>
                        <p className="text-sm italic text-gray-500">&quot;{aiDetail.user?.catchphrase || ''}&quot;</p>
                      </div>
                    </div>

                    {/* Editable Persona Section */}
                    <div className="mt-4 mb-4 border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg text-gray-300">AI Persona / Trading Guidelines</h4>
                        {!editingPersona && !generatedPersona && !generatingPersona && (
                          <div className="flex gap-2">
                            <button 
                              onClick={generatePersona}
                              className="text-sm bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium transition-colors"
                            >
                              Generate with AI
                            </button>
                            <button 
                              onClick={() => {
                                setEditingPersona(true);
                                setPersonaText(aiDetail.user?.persona || aiDetail.user?.catchphrase || '');
                              }}
                              className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition-colors"
                            >
                              Edit Persona
                            </button>
                          </div>
                        )}
                        {generatingPersona && (
                          <div className="flex items-center gap-2 text-purple-400">
                            <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                            <span className="text-sm">Generating persona...</span>
                          </div>
                        )}
                      </div>
                      {editingPersona ? (
                        <div className="space-y-3">
                          <div className="text-xs text-gray-400 mb-2">
                            Define this AI&apos;s personality, trading style, risk tolerance, decision-making approach, and any specific rules or guidelines.
                          </div>
                          <textarea
                            value={personaText}
                            onChange={(e) => setPersonaText(e.target.value)}
                            className="w-full bg-gray-900 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-blue-500 outline-none font-mono text-sm leading-relaxed resize-none"
                            style={{ height: '60vh' }}
                            placeholder="Example:&#10;&#10;I'm a tech-focused investor who believes in disruption. I look for companies with innovative products and strong market potential. My strategy:&#10;&#10;• Risk Tolerance: Moderate-High&#10;• Focus: Technology sector, especially cloud and AI&#10;• Buy Signal: Strong revenue growth + positive sentiment&#10;• Sell Signal: Declining market share or negative news&#10;• Hold: Maintain positions in winners&#10;&#10;I trade with conviction but always consider fundamentals..."
                          />
                          <div className="flex gap-3 justify-end">
                            <button
                              onClick={() => setEditingPersona(false)}
                              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => savePersona(selectedAI!, personaText)}
                              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/50"
                            >
                              Save Persona
                            </button>
                          </div>
                        </div>
                      ) : generatedPersona ? (
                        <div className="space-y-4">
                          <div className="text-sm text-gray-400 mb-2">
                            Review the generated persona below. You can accept it, regenerate a different version, or edit the input description.
                          </div>
                          
                          {generatedSummary && (
                            <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-600">
                              <div className="text-xs font-bold text-purple-400 mb-1">QUICK SUMMARY:</div>
                              <div className="text-sm text-gray-200">{generatedSummary}</div>
                            </div>
                          )}

                          {/* Generated Persona Preview */}
                          <div className="bg-gray-900 p-4 rounded-lg border-2 border-purple-500 max-h-[50vh] overflow-y-auto">
                            <div className="text-xs font-bold text-purple-400 mb-2">GENERATED PERSONA:</div>
                            <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                              {generatedPersona}
                            </pre>
                          </div>

                          <div className="flex gap-3 justify-end pt-2">
                            <button
                              onClick={() => {
                                setGeneratedPersona('');
                                setGeneratedSummary('');
                              }}
                              className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={generatePersona}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                            >
                              Regenerate
                            </button>
                            <button
                              onClick={acceptGeneratedPersona}
                              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/50"
                            >
                              Accept & Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {aiDetail.user?.persona ? (
                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                              <div className="text-xs font-bold text-blue-400 mb-2">CURRENT PERSONA:</div>
                              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                                {aiDetail.user.persona}
                              </pre>
                            </div>
                          ) : (
                            <div className="bg-gray-900 p-4 rounded-lg border border-yellow-700">
                              <div className="text-xs font-bold text-yellow-400 mb-2">DEFAULT STRATEGY ({aiDetail.user?.strategy}):</div>
                              <div className="text-sm text-gray-200 font-sans leading-relaxed">
                                {aiDetail.user?.strategy === 'CONSERVATIVE' && 'The Boomer: ONLY invest in proven companies like Microsoft and Facebook. Small positions. Prefer holding over frequent trading. You lived through dot-com crash - never again!'}
                                {aiDetail.user?.strategy === 'DIVERSIFIED' && 'Steady Eddie: MUST spread investments across at least 4 different companies. Balance growth vs stability. Regular rebalancing. Never go all-in on one stock.'}
                                {aiDetail.user?.strategy === 'ALL_IN' && 'YOLO Kid: Pick ONE stock you believe in and BET BIG (80-95%). High risk = high reward. Fortune favors the bold! No half measures!'}
                                {aiDetail.user?.strategy === 'HOLD_FOREVER' && 'Diamond Hands: Buy quality and NEVER EVER SELL. Long-term value investing. Ignore ALL short-term volatility. Paper hands lose, diamond hands WIN. 💎🙌'}
                                {aiDetail.user?.strategy === 'TECH_ONLY' && 'Silicon Brain: ONLY pure tech companies (Facebook, Microsoft, Dropbox). NO non-tech. Growth over everything. Code is eating the world.'}
                                {aiDetail.user?.strategy === 'SAAS_ONLY' && 'Cloud Surfer: ONLY software-as-a-service businesses with recurring revenue. Dropbox, Microsoft yes. Hardware? NO WAY.'}
                                {aiDetail.user?.strategy === 'MOMENTUM' && 'FOMO Master: You HATE missing gains! Buy stocks rising 2%+. Stock falling 2%+? Consider SELLING! Sitting on >40% cash is UNACCEPTABLE - you MUST be in the market!'}
                                {aiDetail.user?.strategy === 'TREND_FOLLOW' && 'Hype Train: Ride trends. Buy stocks with positive momentum. Sell losers quickly. Follow the crowd to profits!'}
                                {aiDetail.user?.strategy === 'CONTRARIAN' && 'The Contrarian: Buy when others panic-sell (falling stocks). Sell when others FOMO-buy (rising stocks). Go against the herd ALWAYS.'}
                                {aiDetail.user?.strategy === 'PERFECT_TIMING' && 'The Oracle: Buy low, sell high. Look for oversold opportunities (down 5%+). Exit overbought peaks (up 8%+). Precision timing wins.'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Cash</div>
                        <div className="font-mono text-lg">${(aiDetail.user?.cash || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Portfolio</div>
                        <div className="font-mono text-lg">${(aiDetail.user?.portfolioValue || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Value</div>
                        <div className="font-mono text-lg">${(aiDetail.user?.totalValue || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">ROI</div>
                        <div className={`font-mono text-lg ${(aiDetail.user?.roi || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(aiDetail.user?.roi || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="font-bold mb-2">Last Trade Time (EST)</h4>
                    <p className="text-gray-400">{formatTimestamp(aiDetail.lastTradeTime)}</p>
                  </div>

                  {aiDetail.systemInfo && (
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="font-bold mb-2">AI Trading Schedule</h4>
                      <p className="text-sm text-gray-400">{aiDetail.systemInfo.schedule}</p>
                      <p className="text-xs text-gray-500 mt-1">{aiDetail.systemInfo.description}</p>
                    </div>
                  )}

                  <button
                    onClick={() => triggerTestTrade(selectedAI)}
                    disabled={testTrading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
                  >
                    {testTrading ? 'Running Test Trade...' : 'Test Trade Now (Manual Trigger)'}
                  </button>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="font-bold mb-3">Current Holdings ({aiDetail.investments?.length || 0})</h4>
                    {!aiDetail.investments || aiDetail.investments.length === 0 ? (
                      <p className="text-gray-400 text-sm">No current holdings</p>
                    ) : (
                      <div className="space-y-2">
                        {aiDetail.investments.map((inv: any) => (
                          <div key={inv.pitchId} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                            <div>
                              <div className="font-bold">{TICKER_MAP[inv.pitchId] || 'Unknown'}</div>
                              <div className="text-xs text-gray-400">
                                {formatShares(inv.shares)} shares @ ${formatNumber(inv.avgPrice)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">{formatCurrency(inv.currentValue)}</div>
                              <div className={`text-xs ${(inv.gain || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(inv.gain || 0) >= 0 ? '+' : ''}{(inv.gain || 0).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="font-bold mb-3">Recent Transactions ({aiDetail.transactions?.length || 0})</h4>
                    {!aiDetail.transactions || aiDetail.transactions.length === 0 ? (
                      <p className="text-gray-400 text-sm">No transactions yet</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {aiDetail.transactions.map((tx: any) => (
                          <div key={tx.id} className="bg-gray-800 p-2 rounded text-sm">
                            <div className="flex justify-between items-center">
                              <span className={`font-bold ${tx.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.type}
                              </span>
                              <span className="text-gray-400">{new Date(tx.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-gray-300 mt-1">
                              {TICKER_MAP[tx.pitch_id] || 'Unknown'}: {formatShares(tx.shares)} @ ${formatNumber(tx.price_per_share)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="font-bold mb-3">Recent Trading Decisions ({aiDetail.logs?.length || 0})</h4>
                    {!aiDetail.logs || aiDetail.logs.length === 0 ? (
                      <p className="text-gray-400 text-sm">No trading decisions yet</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {aiDetail.logs.map((log: any, idx: number) => (
                          <div key={log.id || idx} className="bg-gray-800 p-3 rounded border-l-4" style={{
                            borderLeftColor: log.execution_success ? '#10b981' : '#ef4444'
                          }}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${
                                  log.decision_action === 'BUY' ? 'text-green-400' : 
                                  log.decision_action === 'SELL' ? 'text-red-400' : 
                                  'text-gray-400'
                                }`}>
                                  {log.decision_action}
                                </span>
                                {log.decision_pitch_id && (
                                  <span className="text-sm text-gray-400">
                                    Pitch #{log.decision_pitch_id}
                                  </span>
                                )}
                                {log.decision_shares && (
                                  <span className="text-sm font-mono text-blue-400">
                                    {Math.floor(log.decision_shares)} shares
                                  </span>
                                )}
                              </div>
                              <div className="text-right text-xs">
                                <div className={log.execution_success ? 'text-green-400' : 'text-red-400'}>
                                  {log.execution_success ? '✓ Success' : '✗ Failed'}
                                </div>
                                <div className="text-gray-500">
                                  {new Date(log.execution_timestamp).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                              {log.decision_reasoning || 'No reasoning provided'}
                            </p>
                            {log.execution_message && (
                              <p className="text-xs text-gray-500 italic">
                                {log.execution_message}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">{confirmModal.title}</h3>
              <p className="text-gray-300 whitespace-pre-line mb-6">{confirmModal.message}</p>
              <div className="flex gap-3 justify-end">
                {confirmModal.type === 'success' || confirmModal.type === 'error' ? (
                  <button
                    onClick={() => setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null })}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    OK
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmModal({ show: false, title: '', message: '', type: null, aiData: null })}
                      className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAction}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        confirmModal.type === 'delete' 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : confirmModal.type === 'clone'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Confirm
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
