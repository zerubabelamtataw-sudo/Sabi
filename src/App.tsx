import React, { useState, useEffect } from 'react';
import {
  Bot,
  Gamepad2,
  Zap,
  Shield,
  Layers,
  CreditCard,
  Bell,
  User,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { TelegramSimulator } from './components/TelegramSimulator';
import { BingoLiveRoom } from './components/BingoLiveRoom';
import { NumbersLiveDraw } from './components/NumbersLiveDraw';
import { AdminDashboard } from './components/AdminDashboard';
import { ArchitectureView } from './components/ArchitectureView';
import { WalletModal } from './components/WalletModal';
import { PlayerProfile } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bot' | 'bingo' | 'numbers' | 'admin' | 'architecture'>('bot');
  const [currentPlayer, setCurrentPlayer] = useState<PlayerProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [demoTelegramId, setDemoTelegramId] = useState('10001'); // Alex Vance
  const [unreadCount, setUnreadCount] = useState(0);

  const demoPlayers = [
    { telegramId: '10001', name: 'Alex Vance (@LuckyAlex)', vip: 'VIP 2' },
    { telegramId: '10002', name: 'Sarah Connor (@SarahBets)', vip: 'VIP 1' },
    { telegramId: '10003', name: 'Marcus Wright (@JackpotMarcus)', vip: 'VIP 3' },
  ];

  const fetchPlayer = async () => {
    try {
      const res = await fetch(`/api/player/${demoTelegramId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPlayer(data.profile);
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch {
      // Polling fallback
    }
  };

  useEffect(() => {
    fetchPlayer();
    const interval = setInterval(fetchPlayer, 2000);
    return () => clearInterval(interval);
  }, [demoTelegramId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Telegram Gaming Platform
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Bot Interface • Bingo & Numbers Engines • Shared Services
              </p>
            </div>
          </div>

          {/* Right Controls: Player switcher & Balance & Wallet */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Player Switcher */}
            <div className="relative">
              <select
                value={demoTelegramId}
                onChange={(e) => setDemoTelegramId(e.target.value)}
                className="bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700/80 rounded-xl px-3 py-2 pr-8 appearance-none cursor-pointer focus:outline-none focus:border-sky-500"
              >
                {demoPlayers.map((p) => (
                  <option key={p.telegramId} value={p.telegramId}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Quick Balance Pill */}
            {currentPlayer && (
              <button
                onClick={() => setIsWalletOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700/80 hover:border-emerald-500/60 transition-all group shadow-sm"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 group-hover:text-zinc-300">
                    Total Balance
                  </span>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono">
                    ${currentPlayer.totalBalance.toFixed(2)}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {/* Deposit CTA */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-colors"
            >
              + Deposit
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('bot')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'bot'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Telegram Bot (Main Interface)</span>
          </button>

          <button
            onClick={() => setActiveTab('bingo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'bingo'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Live Bingo Hall</span>
          </button>

          <button
            onClick={() => setActiveTab('numbers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'numbers'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Live Lucky Numbers</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Bot & Console</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-zinc-700 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>System Architecture & DB</span>
          </button>
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'bot' && (
          <TelegramSimulator
            player={currentPlayer}
            onRefreshPlayer={fetchPlayer}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenBingo={() => setActiveTab('bingo')}
            onOpenNumbers={() => setActiveTab('numbers')}
          />
        )}

        {activeTab === 'bingo' && (
          <BingoLiveRoom
            player={currentPlayer}
            onRefreshPlayer={fetchPlayer}
            onOpenBot={() => setActiveTab('bot')}
          />
        )}

        {activeTab === 'numbers' && (
          <NumbersLiveDraw
            player={currentPlayer}
            onRefreshPlayer={fetchPlayer}
            onOpenBot={() => setActiveTab('bot')}
          />
        )}

        {activeTab === 'admin' && <AdminDashboard />}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        player={currentPlayer}
        onRefreshPlayer={fetchPlayer}
      />
    </div>
  );
};

export default App;

