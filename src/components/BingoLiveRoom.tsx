import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  Clock,
  Ticket,
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  Flame,
} from 'lucide-react';
import { PlayerProfile, BingoTicketData } from '../types';

interface BingoLiveRoomProps {
  player: PlayerProfile | null;
  onRefreshPlayer: () => void;
  onOpenBot: () => void;
}

export const BingoLiveRoom: React.FC<BingoLiveRoomProps> = ({
  player,
  onRefreshPlayer,
  onOpenBot,
}) => {
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room_classic');
  const [myTickets, setMyTickets] = useState<BingoTicketData[]>([]);
  const [isBuying, setIsBuying] = useState(false);
  const [buyMessage, setBuyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBingoStatus = async () => {
    try {
      const res = await fetch('/api/games/bingo/status');
      const data = await res.json();
      if (data.rooms) {
        setRoomsData(data.rooms);
      }
    } catch {
      // Polling fallback
    }
  };

  const fetchMyTickets = async (roundId: string) => {
    if (!player || !roundId) return;
    try {
      const res = await fetch(`/api/games/bingo/my-tickets/${roundId}/${player.id}`);
      const data = await res.json();
      if (data.tickets) {
        setMyTickets(data.tickets);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchBingoStatus();
    const interval = setInterval(fetchBingoStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentRoomObj = roomsData.find((r) => r.room.id === selectedRoomId);
  const currentRound = currentRoomObj?.activeRound;

  useEffect(() => {
    if (currentRound?.id && player?.id) {
      fetchMyTickets(currentRound.id);
    } else {
      setMyTickets([]);
    }
  }, [currentRound?.id, currentRound?.currentDrawnIndex, player?.id]);

  const handleBuyTickets = async (count: number) => {
    if (!player || !selectedRoomId) return;
    setIsBuying(true);
    setBuyMessage(null);

    try {
      const res = await fetch('/api/games/bingo/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          playerId: player.id,
          count,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBuyMessage({ text: data.message, type: 'success' });
        if (currentRound?.id) fetchMyTickets(currentRound.id);
        fetchBingoStatus();
        onRefreshPlayer();
      } else {
        setBuyMessage({ text: data.message || 'Purchase failed', type: 'error' });
      }
    } catch (err: any) {
      setBuyMessage({ text: err.message, type: 'error' });
    } finally {
      setIsBuying(false);
    }
  };

  const getBallLetter = (ball: number): string => {
    if (ball <= 15) return 'B';
    if (ball <= 30) return 'I';
    if (ball <= 45) return 'N';
    if (ball <= 60) return 'G';
    return 'O';
  };

  const getBallColor = (ball: number): string => {
    if (ball <= 15) return 'bg-sky-500 text-white';
    if (ball <= 30) return 'bg-rose-500 text-white';
    if (ball <= 45) return 'bg-amber-500 text-white';
    if (ball <= 60) return 'bg-emerald-500 text-white';
    return 'bg-purple-500 text-white';
  };

  const drawnBalls = currentRound?.drawnNumbers
    ? currentRound.drawnNumbers.slice(0, currentRound.currentDrawnIndex)
    : [];
  const latestBall = drawnBalls.length > 0 ? drawnBalls[drawnBalls.length - 1] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Rooms Switcher Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roomsData.map((item) => {
          const isSelected = item.room.id === selectedRoomId;
          const status = item.activeRound?.status || 'waiting';

          return (
            <button
              key={item.room.id}
              onClick={() => setSelectedRoomId(item.room.id)}
              className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-zinc-800 border-sky-500 ring-1 ring-sky-500/50 shadow-lg'
                  : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-100 text-sm">{item.room.name}</span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    status === 'drawing'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : status === 'countdown'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Buy-in: <strong className="text-zinc-200">${item.room.ticketPrice.toFixed(2)}</strong></span>
                <span>Pool: <strong className="text-emerald-400">${item.activeRound?.prizePool.toFixed(2) || '0.00'}</strong></span>
              </div>

              <div className="mt-2 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Round #{item.activeRound?.roundNumber || 1}</span>
                <span>{item.ticketCount} tickets in play</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Game Stage */}
      {currentRoomObj && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Caller / Draw Stage */}
          <div className="lg:col-span-1 space-y-4">
            {/* Live Caller Board */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Round #{currentRound?.roundNumber}
                </span>
                <span className="flex items-center gap-1 font-medium text-emerald-400">
                  <Users className="w-3.5 h-3.5" />
                  {currentRoomObj.playerCount} Players
                </span>
              </div>

              {/* Big Caller Ball Display */}
              <div className="my-3">
                {currentRound?.status === 'drawing' ? (
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-white/20 transition-transform transform scale-105 ${
                        latestBall ? getBallColor(latestBall) : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="text-xs font-black tracking-widest opacity-80">
                        {latestBall ? getBallLetter(latestBall) : '-'}
                      </span>
                      <span className="text-4xl font-extrabold tracking-tight">
                        {latestBall || '--'}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 mt-2 font-medium">
                      Drawn {drawnBalls.length} / 75
                    </span>
                  </div>
                ) : currentRound?.status === 'countdown' ? (
                  <div className="w-28 h-28 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex flex-col items-center justify-center text-amber-400 animate-pulse">
                    <Flame className="w-8 h-8 mb-1" />
                    <span className="text-xs font-bold uppercase">Starting...</span>
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-full bg-zinc-800/80 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-400">
                    <Ticket className="w-8 h-8 mb-1 opacity-50" />
                    <span className="text-xs font-semibold">Waiting Room</span>
                  </div>
                )}
              </div>

              {/* Prizes breakdown card */}
              <div className="w-full bg-zinc-950/80 rounded-xl p-3 border border-zinc-800/80 mt-2 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Line Prize (30%):
                  </span>
                  <span className="font-bold text-amber-300">
                    ${currentRound?.linePrize.toFixed(2) || '0.00'}
                  </span>
                </div>
                {currentRound?.lineWinnerPlayerId && (
                  <div className="text-[10px] text-amber-400/90 font-medium pl-4">
                    ✓ Line Winner Declared!
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    Full BINGO (70%):
                  </span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ${currentRound?.bingoPrize.toFixed(2) || '0.00'}
                  </span>
                </div>
                {currentRound?.bingoWinnerPlayerId && (
                  <div className="text-[10px] text-emerald-400 font-bold pl-4">
                    🏆 FULL HOUSE BINGO WON!
                  </div>
                )}
              </div>

              {/* Buy Tickets Control */}
              <div className="w-full mt-4 space-y-2">
                <div className="text-xs font-medium text-zinc-300 text-left">
                  Purchase Tickets ($ {currentRoomObj.room.ticketPrice.toFixed(2)} ea):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleBuyTickets(1)}
                    disabled={isBuying || (currentRound?.status !== 'waiting' && currentRound?.status !== 'countdown')}
                    className="py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    +1 Ticket
                  </button>
                  <button
                    onClick={() => handleBuyTickets(3)}
                    disabled={isBuying || (currentRound?.status !== 'waiting' && currentRound?.status !== 'countdown')}
                    className="py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 rounded-lg transition-colors"
                  >
                    +3 Tickets
                  </button>
                  <button
                    onClick={() => handleBuyTickets(6)}
                    disabled={isBuying || (currentRound?.status !== 'waiting' && currentRound?.status !== 'countdown')}
                    className="py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-lg transition-colors"
                  >
                    +6 Max
                  </button>
                </div>

                {buyMessage && (
                  <div
                    className={`text-xs p-2 rounded-lg flex items-center gap-1.5 ${
                      buyMessage.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
                    }`}
                  >
                    {buyMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{buyMessage.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawn Balls Tape */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300 mb-2 block">
                Recently Drawn Numbers ({drawnBalls.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {drawnBalls.length === 0 ? (
                  <span className="text-xs text-zinc-500 italic">No balls drawn yet.</span>
                ) : (
                  [...drawnBalls].reverse().map((ball, idx) => (
                    <span
                      key={idx}
                      className={`text-xs font-bold px-2 py-1 rounded-md ${getBallColor(ball)}`}
                    >
                      {getBallLetter(ball)}{ball}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Player's Live Cartelas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span>Your Bingo Cartelas</span>
                  <span className="px-2 py-0.5 text-xs bg-zinc-800 rounded-full text-zinc-300">
                    {myTickets.length} Active
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Cartelas are auto-daubed in real-time as caller announces numbers.
                </p>
              </div>

              <button
                onClick={onOpenBot}
                className="text-xs font-medium text-sky-400 hover:text-sky-300 underline"
              >
                Open Telegram Bot Chat →
              </button>
            </div>

            {myTickets.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800">
                <Ticket className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h4 className="text-zinc-300 font-semibold text-sm">No Active Tickets in this Room</h4>
                <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                  Click &quot;+1 Ticket&quot; or use the Telegram Bot command <code>/bingo</code> to purchase cartelas before the round starts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTickets.map((ticket, tIdx) => (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border transition-all ${
                      ticket.hasBingo
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-xl ring-2 ring-emerald-500/50'
                        : ticket.hasLine
                        ? 'bg-amber-950/40 border-amber-500 shadow-lg'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300">
                        Cartela #{tIdx + 1}
                      </span>
                      {ticket.hasBingo ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-white rounded-full animate-bounce">
                          🏆 BINGO!
                        </span>
                      ) : ticket.hasLine ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-500 text-black rounded-full">
                          ⭐ LINE!
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          #{ticket.id.slice(-5)}
                        </span>
                      )}
                    </div>

                    {/* 5x5 Card Matrix */}
                    <div className="grid grid-cols-5 gap-1 text-center font-bold text-xs">
                      {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                        <div
                          key={i}
                          className="py-1 text-zinc-400 font-extrabold text-[11px] bg-zinc-800/80 rounded"
                        >
                          {letter}
                        </div>
                      ))}

                      {ticket.cardMatrix.map((row, rIdx) =>
                        row.map((val, cIdx) => {
                          const isMarked = ticket.markedMatrix[rIdx][cIdx];
                          const isFree = rIdx === 2 && cIdx === 2;

                          return (
                            <div
                              key={`${rIdx}-${cIdx}`}
                              className={`aspect-square flex items-center justify-center rounded text-xs transition-all ${
                                isMarked
                                  ? 'bg-emerald-500 text-white font-extrabold shadow-sm scale-[0.96]'
                                  : 'bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-750'
                              }`}
                            >
                              {isFree ? (
                                <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                              ) : (
                                val
                              )}
                            </div>
                          );
                        }),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
