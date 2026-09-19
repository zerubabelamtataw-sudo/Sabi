import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Gamepad2,
  Bell,
  User,
  History,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { TelegramChatMessage, PlayerProfile } from '../types';

interface TelegramSimulatorProps {
  player: PlayerProfile | null;
  onRefreshPlayer: () => void;
  onOpenWallet: () => void;
  onOpenBingo: () => void;
  onOpenNumbers: () => void;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  player,
  onRefreshPlayer,
  onOpenWallet,
  onOpenBingo,
  onOpenNumbers,
}) => {
  const [messages, setMessages] = useState<TelegramChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyKeyboard, setReplyKeyboard] = useState<Array<Array<{ text: string }>>>([
    [{ text: '🎮 Games' }, { text: '💰 Wallet' }],
    [{ text: '👤 Profile' }, { text: '📜 Game History' }],
    [{ text: '🔔 Notifications' }, { text: '❓ Help/Support' }],
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with /start on mount if empty
  useEffect(() => {
    if (messages.length === 0 && player) {
      sendMessage('/start', false);
    }
  }, [player?.telegramId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string, showUserBubble = true) => {
    if (!text.trim() || !player) return;

    const userMsgId = `usr_msg_${Date.now()}`;
    if (showUserBubble) {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          text,
          timestamp: Date.now(),
        },
      ]);
      setInputText('');
    }

    setIsTyping(true);

    try {
      const res = await fetch('/api/telegram/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: player.telegramId,
          text,
          username: player.username,
          firstName: player.firstName,
          lastName: player.lastName,
        }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_msg_${Date.now()}`,
            sender: 'bot',
            text: data.response.text,
            timestamp: Date.now(),
            reply_markup: data.response.reply_markup,
          },
        ]);

        if (data.response.reply_markup?.keyboard) {
          setReplyKeyboard(data.response.reply_markup.keyboard);
        }
      }
      onRefreshPlayer();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: '⚠️ Network connection error. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCallbackClick = async (callbackData: string) => {
    if (!player) return;
    setIsTyping(true);

    try {
      const res = await fetch('/api/telegram/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: player.telegramId,
          callbackData,
          username: player.username,
          firstName: player.firstName,
        }),
      });

      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_msg_${Date.now()}`,
            sender: 'bot',
            text: data.response.text,
            timestamp: Date.now(),
            reply_markup: data.response.reply_markup,
          },
        ]);

        if (data.response.reply_markup?.keyboard) {
          setReplyKeyboard(data.response.reply_markup.keyboard);
        }
      }
      onRefreshPlayer();
    } catch {
      // Ignored
    } finally {
      setIsTyping(false);
    }
  };

  const renderMarkdown = (content: string) => {
    // Basic Telegram Markdown parser
    const formatted = content
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-xs font-mono">$1</code>')
      .replace(/\n/g, '<br/>');

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
      {/* Telegram Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-800/90 border-b border-zinc-700/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-800 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-white font-semibold text-base leading-tight">Telegram Gaming Bot</h2>
              <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400/20" />
            </div>
            <p className="text-zinc-400 text-xs flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              bot • online 24/7 • connected to game engines
            </p>
          </div>
        </div>

        {/* Quick actions in header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendMessage('/start')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-700/60 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
            title="Send /start command"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset /start</span>
          </button>
          <button
            onClick={onOpenBingo}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 rounded-lg transition-colors"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Bingo View</span>
          </button>
          <button
            onClick={onOpenNumbers}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Numbers View</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-950/60">
        <div className="text-center my-2">
          <span className="px-3 py-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/70 border border-zinc-700/40 rounded-full">
            Official Gaming Telegram Bot Client
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-full`}
          >
            <div
              className={`rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-zinc-800/95 border border-zinc-700/80 text-zinc-100 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMarkdown(msg.text)}</div>
              <div
                className={`text-[10px] mt-1 text-right ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-zinc-400'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Telegram Inline Keyboard */}
            {msg.reply_markup?.inline_keyboard && (
              <div className="mt-2 w-full max-w-[85%] sm:max-w-[75%] space-y-1.5">
                {msg.reply_markup.inline_keyboard.map((row, rIdx) => (
                  <div key={rIdx} className="flex flex-wrap gap-1.5">
                    {row.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => btn.callback_data && handleCallbackClick(btn.callback_data)}
                        className="flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 hover:border-sky-500/50 rounded-xl transition-all shadow-sm active:scale-[0.98] text-center"
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs px-2 py-1">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>bot is preparing response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Keyboard / Quick Menu Grid */}
      {replyKeyboard.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {replyKeyboard.flat().map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(item.text)}
                className="py-2 px-3 text-xs font-medium text-zinc-200 bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/60 rounded-lg hover:border-zinc-500 transition-colors truncate"
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Command Input Bar */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {['/start', '/games', '/bingo', '/numbers', '/wallet', '/deposit', '/withdraw'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => sendMessage(cmd)}
              className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-sky-300 hover:bg-zinc-700 whitespace-nowrap transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputText);
          }}
          className="flex-1 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or /command..."
            className="flex-1 bg-zinc-800/90 text-zinc-100 placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-700/80 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
