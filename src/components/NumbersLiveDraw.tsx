import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Hash,
  Sparkles,
} from 'lucide-react';
import { PlayerProfile, NumbersRoundData, NumbersTicketData } from '../types';

interface NumbersLiveDrawProps {
  player: PlayerProfile | null;
  onRefreshPlayer: () => void;
  onOpenBot: () => void;
}

export const NumbersLiveDraw: React.FC<NumbersLiveDrawProps> = ({
  player,
  onRefreshPlayer,
  onOpenBot,
}) => {
  const [roundData, setRoundData] = useState<NumbersRoundData | null>(null);
  const [myTickets, setMyTickets] = useState<NumbersTicketData[]>([]);
  const [selectedBetType, setSelectedBetType] = useState<
    'pick1' | 'pick2' | 'pick3' | 'parity_even' | 'parity_odd' | 'range_low' | 'range_high'
  >('pick1');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([7]);
  const [betAmount, setBetAmount] = useState<number>(5);
  const [isPlacing, setIsPlacing] = useState(false);
  const [betMessage, setBetMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchNumbersStatus = async () => {
    try {
      const res = await fetch('/api/games/numbers/status');
      const data = await res.json();
      if (data.activeRound) {
        setRoundData(data.activeRound);
      }
    } catch {
      // Polling fallback
    }
  };

  useEffect(() => {
    fetchNumbersStatus();
    const interval = setInterval(fetchNumbersStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleNumber = (num: number) => {
    if (selectedBetType.startsWith('parity_') || selectedBetType.startsWith('range_')) {
      return; // Not used for parity or range
    }

    const maxPicks = selectedBetType === 'pick1' ? 1 : selectedBetType === 'pick2' ? 2 : 3;

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length < maxPicks) {
        setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
      } else {
        // Replace first
        setSelectedNumbers([...selectedNumbers.slice(1), num].sort((a, b) => a - b));
      }
    }
  };

  const handleBetTypeChange = (type: typeof selectedBetType) => {
    setSelectedBetType(type);
    if (type === 'pick1') setSelectedNumbers([7]);
    else if (type === 'pick2') setSelectedNumbers([7, 14]);
    else if (type === 'pick3') setSelectedNumbers([7, 14, 21]);
    else setSelectedNumbers([]);
  };

  const handlePlaceBet = async () => {
    if (!player || !roundData) return;
    setIsPlacing(true);
    setBetMessage(null);

    try {
      const res = await fetch('/api/games/numbers/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          betType: selectedBetType,
          selectedNumbers,
          betAmount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBetMessage({ text: data.message, type: 'success' });
        if (data.ticket) {
          setMyTickets((prev) => [data.ticket, ...prev]);
        }
        fetchNumbersStatus();
        onRefreshPlayer();
      } else {
        setBetMessage({ text: data.message || 'Bet failed', type: 'error' });
      }
    } catch (err: any) {
      setBetMessage({ text: err.message, type: 'error' });
    } finally {
      setIsPlacing(false);
    }
  };

  const secRemaining = roundData
    ? Math.max(0, Math.floor((roundData.drawTime - Date.now()) / 1000))
    : 0;

  const getMultiplierLabel = () => {
    switch (selectedBetType) {
      case 'pick1': return '6.0x Payout';
      case 'pick2': return '35.0x Payout';
      case 'pick3': return '180.0x Payout';
      case 'parity_even':
      case 'parity_odd': return '1.95x Payout';
      case 'range_low':
      case 'range_high': return '1.95x Payout';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Live Draw Stage Header */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Lucky Numbers Live Draw</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  Round #{roundData?.roundNumber || 1}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Independent numbers engine • 5 winning balls drawn from 1 to 36
              </p>
            </div>
          </div>

          {/* Countdown & Status */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Status</span>
              <span
                className={`text-xs font-bold uppercase ${
                  roundData?.status === 'drawing'
                    ? 'text-rose-400 animate-pulse'
                    : roundData?.status === 'countdown'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {roundData?.status || 'Betting'}
              </span>
            </div>

            <div className="text-center px-5 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Countdown</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {secRemaining}s
              </span>
            </div>

            <div className="text-center px-4 py-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Pool</span>
              <span className="text-sm font-bold text-zinc-200">
                ${roundData?.totalPool.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Drawn Winning Balls Bar */}
        <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col items-center">
          <span className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Winning Balls (5 Drawn from 1-36):
          </span>

          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const ball = roundData?.winningNumbers?.[slotIdx];
              const isDrawn = ball !== undefined;

              return (
                <div
                  key={slotIdx}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg transition-all transform ${
                    isDrawn
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 scale-105 ring-2 ring-amber-400/50'
                      : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-500'
                  }`}
                >
                  {isDrawn ? ball : '?'}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Betting Slip & Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Number Grid & Options */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bet Type Tabs */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-xs font-semibold text-zinc-300 mb-2 block">1. Select Bet Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pick1', label: 'Pick 1', mult: '6.0x' },
                { id: 'pick2', label: 'Pick 2', mult: '35.0x' },
                { id: 'pick3', label: 'Pick 3', mult: '180.0x' },
                { id: 'parity_even', label: 'Even Parity', mult: '1.95x' },
                { id: 'parity_odd', label: 'Odd Parity', mult: '1.95x' },
                { id: 'range_low', label: 'Low 1-18', mult: '1.95x' },
                { id: 'range_high', label: 'High 19-36', mult: '1.95x' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleBetTypeChange(b.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedBetType === b.id
                      ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{b.label}</div>
                  <div className="text-[10px] text-amber-400 font-semibold">{b.mult}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Number Selector Grid (1 to 36) */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-300">
                2. Pick Numbers{' '}
                {selectedBetType.startsWith('pick') && `(Selected: ${selectedNumbers.join(', ') || 'None'})`}
              </span>
              {selectedBetType.startsWith('pick') && (
                <span className="text-[11px] text-zinc-500">
                  Select up to {selectedBetType === 'pick1' ? 1 : selectedBetType === 'pick2' ? 2 : 3}
                </span>
              )}
            </div>

            {selectedBetType.startsWith('pick') ? (
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedNumbers.includes(num);

                  return (
                    <button
                      key={num}
                      onClick={() => toggleNumber(num)}
                      className={`h-10 rounded-lg font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 shadow-md scale-105 ring-2 ring-amber-300'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/60'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg bg-zinc-950/60 border border-dashed border-zinc-800">
                <span className="text-xs text-zinc-400">
                  No individual numbers needed for <strong>{selectedBetType.replace('_', ' ').toUpperCase()}</strong>.
                  Your bet covers all matching balls drawn!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Bet Slip */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Bet Placement Slip
              </h3>
              <span className="text-xs font-bold text-amber-400">{getMultiplierLabel()}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Selected Type:</span>
                <strong className="text-zinc-200 uppercase">{selectedBetType}</strong>
              </div>
              {selectedBetType.startsWith('pick') && (
                <div className="flex justify-between text-zinc-400">
                  <span>Your Numbers:</span>
                  <strong className="text-amber-400 font-mono">
                    {selectedNumbers.join(', ') || 'Select numbers'}
                  </strong>
                </div>
              )}
            </div>

            {/* Quick Stake Selector */}
            <div>
              <span className="text-xs font-semibold text-zinc-400 mb-1.5 block">Wager Amount ($):</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      betAmount === amt
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Payout calculation */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Potential Return:</span>
                <span className="text-base font-extrabold text-emerald-400">
                  ${(
                    betAmount *
                    (selectedBetType === 'pick1'
                      ? 6
                      : selectedBetType === 'pick2'
                      ? 35
                      : selectedBetType === 'pick3'
                      ? 180
                      : 1.95)
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Place Bet Button */}
            <button
              onClick={handlePlaceBet}
              disabled={isPlacing || roundData?.status !== 'betting'}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-blue-600 shadow-lg transition-all"
            >
              {isPlacing ? 'Placing Bet...' : `Place $${betAmount} Bet`}
            </button>

            {betMessage && (
              <div
                className={`text-xs p-2.5 rounded-lg flex items-center gap-1.5 ${
                  betMessage.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                }`}
              >
                {betMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{betMessage.text}</span>
              </div>
            )}

            <button
              onClick={onOpenBot}
              className="w-full text-center text-xs text-sky-400 hover:underline pt-1"
            >
              Or place bets directly in Telegram Bot chat →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
