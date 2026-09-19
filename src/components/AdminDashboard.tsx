import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Search,
  RefreshCw,
  Terminal,
  Activity,
  CreditCard,
  Send,
} from 'lucide-react';
import { AdminStatsData } from '../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'deposits' | 'withdrawals' | 'settings' | 'terminal'>('overview');

  // Balance adjustment modal
  const [selectedPlayerForAdjust, setSelectedPlayerForAdjust] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustType, setAdjustType] = useState<'main' | 'bonus'>('main');
  const [adjustReason, setAdjustReason] = useState<string>('VIP loyalty promotion');

  // Terminal input
  const [terminalInput, setTerminalInput] = useState('/status');
  const [terminalLogs, setTerminalLogs] = useState<Array<{ sender: 'admin' | 'bot'; text: string }>>([
    { sender: 'bot', text: '🛡️ Admin Bot Terminal Ready. Type /status, /deposits, /withdrawals, or /maintenance on|off' },
  ]);

  const fetchAdminData = async () => {
    try {
      const [sRes, dRes, wRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/deposits'),
        fetch('/api/admin/withdrawals'),
      ]);

      const sData = await sRes.json();
      const dData = await dRes.json();
      const wData = await wRes.json();

      setStats(sData);
      setPendingDeposits(dData.pending || []);
      setPendingWithdrawals(wData.pending || []);
    } catch {
      // Polling fallback
    }
  };

  const searchPlayers = async (q = searchQuery) => {
    try {
      const res = await fetch(`/api/admin/players?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPlayersList(data.players || []);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchAdminData();
    searchPlayers('');
    const interval = setInterval(fetchAdminData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (data.settings) {
        setStats((prev) => (prev ? { ...prev, maintenanceMode: data.settings.maintenanceMode } : null));
      }
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleApproveDeposit = async (id: string) => {
    try {
      await fetch(`/api/admin/deposits/${id}/approve`, { method: 'POST' });
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleRejectDeposit = async (id: string) => {
    try {
      await fetch(`/api/admin/deposits/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Failed proof verification' }),
      });
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await fetch(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await fetch(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by risk management' }),
      });
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedPlayerForAdjust) return;
    try {
      await fetch('/api/admin/balance-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerForAdjust.id,
          amount: adjustAmount,
          balanceType: adjustType,
          reason: adjustReason,
        }),
      });
      setSelectedPlayerForAdjust(null);
      searchPlayers();
      fetchAdminData();
    } catch {
      // Ignored
    }
  };

  const handleSendTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalLogs((prev) => [...prev, { sender: 'admin', text: cmd }]);
    setTerminalInput('');

    try {
      const res = await fetch('/api/admin/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cmd }),
      });
      const data = await res.json();
      if (data.responseText) {
        setTerminalLogs((prev) => [...prev, { sender: 'bot', text: data.responseText }]);
      }
      fetchAdminData();
    } catch {
      setTerminalLogs((prev) => [...prev, { sender: 'bot', text: 'Error connecting to Admin Bot router.' }]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Admin & Operations Console</span>
              {stats?.maintenanceMode ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                  Maintenance Active
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  Platform Live
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400">
              Superadmin oversight • Finance & payment queue • Game monitoring
            </p>
          </div>
        </div>

        {/* Maintenance Toggle button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleMaintenance(!stats?.maintenanceMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              stats?.maintenanceMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{stats?.maintenanceMode ? 'Resume Live Platform' : 'Enable Maintenance Mode'}</span>
          </button>
          <button
            onClick={fetchAdminData}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Gross Revenue (GGR)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            ${stats?.grossGamingRevenue.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Margin: {stats?.platformProfitMarginPct || 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Total Turnover</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-zinc-100">
            ${stats?.totalTurnover.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Total Payouts: ${stats?.totalPayouts.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Pending Deposits</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            {stats?.pendingDepositsCount || 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Requires verification
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Pending Withdrawals</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">
            {stats?.pendingWithdrawalsCount || 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Escrow queue review
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: Activity },
          { id: 'players', label: `Players Directory (${stats?.totalPlayers || 0})`, icon: Users },
          { id: 'deposits', label: `Deposits Queue (${pendingDeposits.length})`, icon: CreditCard },
          { id: 'withdrawals', label: `Withdrawals Queue (${pendingWithdrawals.length})`, icon: DollarSign },
          { id: 'terminal', label: 'Admin Bot Terminal', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Pending Queues */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Pending Deposits Awaiting Approval ({pendingDeposits.length})</span>
              </h3>
              <button
                onClick={() => setActiveTab('deposits')}
                className="text-xs text-sky-400 hover:underline"
              >
                View all →
              </button>
            </div>

            {pendingDeposits.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No deposits in pending queue.</p>
            ) : (
              <div className="space-y-2">
                {pendingDeposits.slice(0, 3).map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-200">${dep.amount.toFixed(2)}</span>{' '}
                      <span className="text-zinc-500 uppercase">({dep.method})</span>
                      <div className="text-[10px] text-zinc-500">ID: {dep.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveDeposit(dep.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectDeposit(dep.id)}
                        className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span>Pending Withdrawals ({pendingWithdrawals.length})</span>
              </h3>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className="text-xs text-sky-400 hover:underline"
              >
                View all →
              </button>
            </div>

            {pendingWithdrawals.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No withdrawals in pending queue.</p>
            ) : (
              <div className="space-y-2">
                {pendingWithdrawals.slice(0, 3).map((wth) => (
                  <div
                    key={wth.id}
                    className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-200">${wth.amount.toFixed(2)}</span>{' '}
                      <span className="text-zinc-500">(Net: ${wth.netAmount.toFixed(2)})</span>
                      <div className="text-[10px] text-zinc-500">To: {wth.destination}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveWithdrawal(wth.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectWithdrawal(wth.id)}
                        className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Players Directory & Balance Adjuster */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchPlayers(e.target.value);
                }}
                placeholder="Search by username, name, or Telegram ID..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Telegram ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Main Bal</th>
                  <th className="p-3">Bonus Bal</th>
                  <th className="p-3">Wagered</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {playersList.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850">
                    <td className="p-3">
                      <div className="font-semibold text-zinc-100">{p.firstName} {p.lastName || ''}</div>
                      <div className="text-[10px] text-zinc-500">@{p.username}</div>
                    </td>
                    <td className="p-3 font-mono text-zinc-400">{p.telegramId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-400">${p.mainBalance.toFixed(2)}</td>
                    <td className="p-3 font-medium text-amber-400">${p.bonusBalance.toFixed(2)}</td>
                    <td className="p-3 text-zinc-400">${p.stats?.totalBets.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPlayerForAdjust(p)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-zinc-700"
                      >
                        Adjust Balance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Deposits Queue */}
      {activeTab === 'deposits' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
          <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-200">Deposits Queue ({pendingDeposits.length} pending)</span>
          </div>
          {pendingDeposits.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">No pending deposits to verify.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {pendingDeposits.map((dep) => (
                <div key={dep.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-zinc-100 text-sm">${dep.amount.toFixed(2)} USD</div>
                    <div className="text-zinc-400">Method: <strong className="uppercase">{dep.method}</strong> • Ref: {dep.proofRef || 'N/A'}</div>
                    <div className="text-[10px] text-zinc-500">Player ID: {dep.playerId} • {new Date(dep.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveDeposit(dep.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve & Credit
                    </button>
                    <button
                      onClick={() => handleRejectDeposit(dep.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Withdrawals Queue */}
      {activeTab === 'withdrawals' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
          <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-200">Withdrawals Queue ({pendingWithdrawals.length} pending)</span>
          </div>
          {pendingWithdrawals.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">No pending withdrawals to review.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {pendingWithdrawals.map((wth) => (
                <div key={wth.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-zinc-100 text-sm">
                      ${wth.amount.toFixed(2)} USD <span className="text-zinc-500 text-xs font-normal">(Net: ${wth.netAmount.toFixed(2)}, Fee: ${wth.fee.toFixed(2)})</span>
                    </div>
                    <div className="text-zinc-400">Destination: <code className="text-zinc-300 font-mono">{wth.destination}</code></div>
                    <div className="text-[10px] text-zinc-500">Player ID: {wth.playerId} • {new Date(wth.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveWithdrawal(wth.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve & Disburse
                    </button>
                    <button
                      onClick={() => handleRejectWithdrawal(wth.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject & Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Admin Bot Terminal */}
      {activeTab === 'terminal' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Telegram Admin Bot Command Shell
            </span>
            <span className="text-[11px] text-zinc-500">Connected: admin_router</span>
          </div>

          <div className="p-4 h-64 overflow-y-auto space-y-3 font-mono text-xs">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className={log.sender === 'admin' ? 'text-sky-300' : 'text-zinc-300'}>
                <span className="text-zinc-600 mr-2">{log.sender === 'admin' ? 'admin@bot:~$ ' : 'bot:> '}</span>
                <span className="whitespace-pre-wrap">{log.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendTerminal} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Try /status, /deposits, /withdrawals, or /maintenance on|off..."
              className="flex-1 bg-zinc-950 text-zinc-100 px-3 py-2 rounded-lg text-xs font-mono border border-zinc-800 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Execute</span>
            </button>
          </form>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {selectedPlayerForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Adjust Balance for @{selectedPlayerForAdjust.username}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Amount ($) (use negative to debit):</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Target Balance:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('main')}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                      adjustType === 'main'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Main Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('bonus')}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold ${
                      adjustType === 'bonus'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Bonus Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Reason / Note:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPlayerForAdjust(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustBalance}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
              >
                Apply Balance Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
