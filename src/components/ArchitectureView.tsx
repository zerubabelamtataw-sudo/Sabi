import React, { useState, useEffect } from 'react';
import {
  Database,
  Layers,
  ArrowRight,
  Server,
  Bot,
  User,
  Zap,
  Shield,
  Gamepad2,
  RefreshCw,
  Code2,
  CheckCircle,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [dbDump, setDbDump] = useState<any | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('players');
  const [loading, setLoading] = useState(false);

  const fetchDump = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/database-dump');
      const data = await res.json();
      setDbDump(data);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDump();
  }, []);

  const tables = [
    { key: 'players', name: 'Players', count: dbDump?.players?.length || 0 },
    { key: 'mainBalances', name: 'Main Balances', count: dbDump?.mainBalances?.length || 0 },
    { key: 'bonusBalances', name: 'Bonus Balances', count: dbDump?.bonusBalances?.length || 0 },
    { key: 'deposits', name: 'Deposits', count: dbDump?.deposits?.length || 0 },
    { key: 'withdrawals', name: 'Withdrawals', count: dbDump?.withdrawals?.length || 0 },
    { key: 'transactions', name: 'Transactions', count: dbDump?.transactions?.length || 0 },
    { key: 'bingoRooms', name: 'Bingo Rooms', count: dbDump?.bingoRooms?.length || 0 },
    { key: 'bingoRounds', name: 'Bingo Rounds', count: dbDump?.bingoRounds?.length || 0 },
    { key: 'bingoTickets', name: 'Bingo Tickets', count: dbDump?.bingoTickets?.length || 0 },
    { key: 'numbersRounds', name: 'Numbers Rounds', count: dbDump?.numbersRounds?.length || 0 },
    { key: 'numbersTickets', name: 'Numbers Tickets', count: dbDump?.numbersTickets?.length || 0 },
    { key: 'winners', name: 'Winners', count: dbDump?.winners?.length || 0 },
    { key: 'payouts', name: 'Payouts', count: dbDump?.payouts?.length || 0 },
    { key: 'gameHistory', name: 'Game History', count: dbDump?.gameHistory?.length || 0 },
    { key: 'settings', name: 'System Settings', count: 1 },
  ];

  const currentRecords =
    selectedTable === 'settings'
      ? dbDump?.settings
        ? [dbDump.settings]
        : []
      : dbDump?.[selectedTable] || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. Header & Architectural Statement */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Architecture & Modular Design</h2>
            <p className="text-xs text-zinc-400">
              Complete implementation of decoupled gaming engines and shared service architecture
            </p>
          </div>
        </div>
      </div>

      {/* 2. Visual System Diagram */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          <span>System Flow Diagram</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Node 1: Player */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
              <User className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-zinc-100">1. PLAYER</div>
            <div className="text-[11px] text-zinc-400">Telegram App / WebApp</div>
          </div>

          {/* Node 2: Telegram Bot */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-sky-600/20 text-sky-400 flex items-center justify-center mx-auto mb-2">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-zinc-100">2. TELEGRAM BOT</div>
            <div className="text-[11px] text-sky-300 font-semibold">Zero Game Logic</div>
            <div className="text-[10px] text-zinc-500">I/O Adapter & Keyboards</div>
          </div>

          {/* Node 3: Backend API */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
              <Server className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-zinc-100">3. BACKEND API</div>
            <div className="text-[11px] text-indigo-300 font-semibold">Routers & Auth</div>
            <div className="text-[10px] text-zinc-500">REST & Webhooks</div>
          </div>

          {/* Node 4: Shared Services & Engines */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-emerald-800/80 bg-emerald-950/20 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-emerald-300">4. SHARED SERVICES</div>
            <div className="text-[11px] text-zinc-300">Balance, Ledger & Risk</div>
            <div className="text-[10px] text-emerald-400/80">Decoupled Engines</div>
          </div>

          {/* Node 5: Database */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-purple-800/80 bg-purple-950/20 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-2">
              <Database className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-purple-300">5. DATABASE</div>
            <div className="text-[11px] text-zinc-300">15 Relational Entities</div>
            <div className="text-[10px] text-purple-400/80">Atomic Ledger & State</div>
          </div>
        </div>
      </div>

      {/* 3. Decoupled Game Engine Architecture & Extensibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Gamepad2 className="w-5 h-5" />
            <span>Bingo 75 Engine</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Autonomous multi-room state machine. Handles 5x5 card matrix generation, waiting & countdown timers, automated ball draws (1-75), line & full-house pattern detection, prize pool calculation (30% Line / 70% Bingo), and instant payouts via <code>balanceService</code>.
          </p>
          <div className="text-[11px] text-emerald-400/90 font-mono bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/60">
            ✓ Decoupled from Bot & Numbers
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Zap className="w-5 h-5" />
            <span>Lucky Numbers Engine</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Autonomous high-frequency lottery engine. Manages scheduled betting windows, multi-ticket placements (Pick 1, Pick 2, Pick 3, Even/Odd, Range), animated drawing of 5 balls from 1-36, multiplier evaluation (up to 180x), and automatic winning disbursements.
          </p>
          <div className="text-[11px] text-amber-400/90 font-mono bg-amber-950/40 p-2 rounded-lg border border-amber-900/60">
            ✓ Decoupled from Bot & Bingo
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Code2 className="w-5 h-5" />
            <span>Adding Game #3 (Extensibility)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Plugging a 3rd game (e.g. Crash or Roulette) requires zero changes to Bingo, Numbers, or the DB schema. Simply implement <code>BaseGameEngine</code>, call shared <code>balanceService.deductFunds(...)</code>, and record wins with <code>gameHistoryService.recordHistory(...)</code>.
          </p>
          <div className="text-[11px] text-sky-400/90 font-mono bg-sky-950/40 p-2 rounded-lg border border-sky-900/60">
            ✓ 100% Modular Architecture
          </div>
        </div>
      </div>

      {/* 4. Live Database Explorer (15 Relational Tables) */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <span>Live Database State Explorer (15 Schemas)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Inspect live records currently stored in the operational database
            </p>
          </div>
          <button
            onClick={fetchDump}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>

        {/* Tables Pills */}
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTable(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedTable === t.key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750 border border-zinc-700/60'
              }`}
            >
              <span>{t.name}</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table Records JSON Viewer */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs max-h-96 overflow-y-auto">
          {currentRecords.length === 0 ? (
            <div className="text-zinc-500 italic py-6 text-center">
              No records currently in table: <strong>{selectedTable}</strong>
            </div>
          ) : (
            <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(currentRecords, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
