import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
} from 'lucide-react';
import { PlayerProfile } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | null;
  onRefreshPlayer: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  player,
  onRefreshPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [depositAmount, setDepositAmount] = useState<number>(25);
  const [depositMethod, setDepositMethod] = useState<'crypto_usdt' | 'card' | 'pix' | 'voucher'>('crypto_usdt');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(20);
  const [withdrawDest, setWithdrawDest] = useState<string>('TQ1r8v7x9L4K...USDT_Address');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyData, setHistoryData] = useState<{ deposits: any[]; withdrawals: any[]; gameHistory: any[] }>({
    deposits: [],
    withdrawals: [],
    gameHistory: [],
  });

  const fetchHistory = async () => {
    if (!player) return;
    try {
      const res = await fetch(`/api/wallet/history/${player.id}`);
      const data = await res.json();
      setHistoryData(data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isOpen && player) {
      fetchHistory();
      setStatusMsg(null);
    }
  }, [isOpen, player?.id]);

  if (!isOpen || !player) return null;

  const handleDeposit = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          amount: depositAmount,
          method: depositMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Auto verify in simulation for quick test
        const vRes = await fetch('/api/wallet/deposit/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depositId: data.deposit.id }),
        });
        const vData = await vRes.json();
        if (vData.verified) {
          setStatusMsg({
            text: `Deposit of $${depositAmount.toFixed(2)} (${depositMethod}) verified & credited!`,
            type: 'success',
          });
          onRefreshPlayer();
          fetchHistory();
        }
      } else {
        setStatusMsg({ text: data.error || 'Deposit failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setIsProcessing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          amount: withdrawAmount,
          destination: withdrawDest,
          method: 'crypto_usdt',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          text: `Withdrawal of $${withdrawAmount.toFixed(2)} requested! (Net: $${data.withdrawal.netAmount.toFixed(2)}) Queued for admin approval.`,
          type: 'success',
        });
        onRefreshPlayer();
        fetchHistory();
      } else {
        setStatusMsg({ text: data.error || 'Withdrawal failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Player Wallet & Cashier</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Current balance: <strong className="text-emerald-400">${player.totalBalance.toFixed(2)}</strong> (Main: ${player.mainBalance.toFixed(2)} | Bonus: ${player.bonusBalance.toFixed(2)})
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 gap-2">
          <button
            onClick={() => { setActiveTab('deposit'); setStatusMsg(null); }}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'deposit'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setStatusMsg(null); }}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'withdraw'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); setStatusMsg(null); }}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Tab 1: Deposit */}
        {activeTab === 'deposit' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Payment Rail:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'crypto_usdt', label: 'USDT TRC20 (Instant)' },
                  { id: 'card', label: 'Credit Card (Visa/MC)' },
                  { id: 'pix', label: 'PIX / Bank Transfer' },
                  { id: 'voucher', label: 'Cashier Voucher' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDepositMethod(m.id as any)}
                    className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                      depositMethod === m.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Quick Amounts ($):</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      depositAmount === amt
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : `Deposit $${depositAmount} & Auto-Credit`}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Withdraw */}
        {activeTab === 'withdraw' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Destination Wallet / Account:</label>
              <input
                type="text"
                value={withdrawDest}
                onChange={(e) => setWithdrawDest(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Withdrawal Amount ($):</label>
              <div className="grid grid-cols-3 gap-2">
                {[20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(amt)}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      withdrawAmount === amt
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400">Net after 2% fee:</span>
              <strong className="text-purple-400 text-sm">
                ${Math.max(0, withdrawAmount - Math.max(1, withdrawAmount * 0.02)).toFixed(2)}
              </strong>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isProcessing || withdrawAmount > player.mainBalance}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-lg"
            >
              {isProcessing ? 'Submitting...' : `Submit Withdrawal for $${withdrawAmount}`}
            </button>
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
            <div className="font-bold text-zinc-300 mb-1">Recent Activity Logs:</div>
            {historyData.deposits.length === 0 && historyData.withdrawals.length === 0 ? (
              <p className="text-zinc-500 italic">No transactions recorded yet.</p>
            ) : (
              [...historyData.deposits.map((d) => ({ ...d, logType: 'Deposit' })),
               ...historyData.withdrawals.map((w) => ({ ...w, logType: 'Withdrawal' }))]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {item.logType}: ${item.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.status === 'verified' || item.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
            )}
          </div>
        )}

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border border-rose-800 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
