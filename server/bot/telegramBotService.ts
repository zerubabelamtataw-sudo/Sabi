import { playerService } from '../services/playerService.js';
import { balanceService } from '../services/balanceService.js';
import { depositService } from '../services/depositService.js';
import { withdrawalService } from '../services/withdrawalService.js';
import { paymentVerificationService } from '../services/paymentVerificationService.js';
import { notificationService } from '../services/notificationService.js';
import { gameHistoryService } from '../services/gameHistoryService.js';
import { securityService } from '../services/securityService.js';
import { bingoEngine } from '../engines/bingoEngine.js';
import { numbersEngine } from '../engines/numbersEngine.js';
import { db } from '../db/database.js';
import { NumbersBetType, DepositMethod } from '../db/schema.js';

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

export interface TelegramMessageResponse {
  chat_id: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: {
    inline_keyboard?: TelegramInlineButton[][];
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
  };
}

export class TelegramBotService {
  /**
   * Main dispatch router for Telegram text messages and commands.
   * Notice: All game logic is strictly delegated to bingoEngine & numbersEngine.
   */
  public handleMessage(params: {
    telegramId: string;
    text: string;
    username?: string;
    firstName: string;
    lastName?: string;
  }): TelegramMessageResponse {
    const { telegramId, text, username, firstName, lastName } = params;

    // 1. Security & Maintenance Gate
    const access = securityService.checkAccess(telegramId);
    if (!access.allowed) {
      return {
        chat_id: telegramId,
        text: `⚠️ *SYSTEM NOTICE*\n\n${access.reason}`,
        parse_mode: 'Markdown',
      };
    }

    // 2. Ensure player is registered in Player Service
    const player = playerService.getOrCreatePlayer(telegramId, { username, firstName, lastName });

    const cleanText = text.trim();
    const command = cleanText.split(' ')[0].toLowerCase();
    const args = cleanText.split(' ').slice(1);

    switch (command) {
      case '/start':
      case 'home':
      case '🏠 home':
        return this.renderStartMenu(player);

      case '/games':
      case '🎮 games':
        return this.renderGamesMenu(player);

      case '/bingo':
      case '🎱 bingo':
        return this.renderBingoMenu(player, args);

      case '/numbers':
      case '🔢 numbers':
        return this.renderNumbersMenu(player, args);

      case '/wallet':
      case '💰 wallet':
        return this.renderWalletMenu(player);

      case '/deposit':
      case '💳 deposit':
        return this.renderDepositMenu(player, args);

      case '/withdraw':
      case '💸 withdraw':
        return this.renderWithdrawMenu(player, args);

      case '/balance':
        return this.renderBalanceCard(player);

      case '/profile':
      case '👤 profile':
        return this.renderProfileMenu(player);

      case '/history':
      case '📜 game history':
      case 'history':
        return this.renderHistoryMenu(player);

      case '/notifications':
      case '🔔 notifications':
        return this.renderNotificationsMenu(player);

      case '/help':
      case '❓ help/support':
      case 'help':
        return this.renderHelpMenu(player);

      default:
        return {
          chat_id: telegramId,
          text: `👋 Hello *${player.firstName}*! I didn't recognize that command.\n\nUse the buttons below or type /start to access the main gaming menu.`,
          parse_mode: 'Markdown',
          reply_markup: this.getMainReplyKeyboard(),
        };
    }
  }

  /**
   * Main dispatch router for Telegram Inline Button callbacks.
   */
  public handleCallbackQuery(params: {
    telegramId: string;
    callbackData: string;
    username?: string;
    firstName: string;
  }): TelegramMessageResponse {
    const { telegramId, callbackData, username, firstName } = params;

    const access = securityService.checkAccess(telegramId);
    if (!access.allowed) {
      return {
        chat_id: telegramId,
        text: `⚠️ *MAINTENANCE MODE*\n\n${access.reason}`,
        parse_mode: 'Markdown',
      };
    }

    const player = playerService.getOrCreatePlayer(telegramId, { username, firstName });
    const parts = callbackData.split(':');
    const action = parts[0];

    switch (action) {
      case 'menu_start':
        return this.renderStartMenu(player);

      case 'menu_games':
        return this.renderGamesMenu(player);

      case 'menu_bingo':
        return this.renderBingoMenu(player, parts.slice(1));

      case 'buy_bingo': {
        const roomId = parts[1] || 'room_classic';
        const count = parseInt(parts[2] || '1', 10);
        const result = bingoEngine.buyTickets(roomId, player.id, count);

        return {
          chat_id: telegramId,
          text: result.success
            ? `🎟️ *TICKETS CONFIRMED!*\n\n${result.message}\n\n🏆 *Round Prize Pool:* $${result.round?.prizePool.toFixed(2) || '0.00'}\n\nYour cartelas are ready for the live draw.`
            : `❌ *PURCHASE FAILED*\n\n${result.message}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👀 View My Room & Cards', callback_data: `view_bingo_room:${roomId}` },
                { text: '🎮 Games Lobby', callback_data: 'menu_games' },
              ],
            ],
          },
        };
      }

      case 'view_bingo_room': {
        const roomId = parts[1] || 'room_classic';
        return this.renderBingoRoomDetail(player, roomId);
      }

      case 'menu_numbers':
        return this.renderNumbersMenu(player, parts.slice(1));

      case 'bet_numbers': {
        const betType = (parts[1] as NumbersBetType) || 'pick1';
        const amount = parseFloat(parts[2] || '5');
        const numbers = parts[3] ? parts[3].split(',').map((n) => parseInt(n, 10)) : [7];

        const result = numbersEngine.placeBet({
          playerId: player.id,
          betType,
          betAmount: amount,
          selectedNumbers: numbers,
        });

        return {
          chat_id: telegramId,
          text: result.success
            ? `✅ *BET PLACED SUCCESSFULLY!*\n\n${result.message}\n\nDraw takes place every minute. Good luck!`
            : `❌ *BET FAILED*\n\n${result.message}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔢 Back to Numbers', callback_data: 'menu_numbers' }],
              [{ text: '💰 Check Wallet', callback_data: 'menu_wallet' }],
            ],
          },
        };
      }

      case 'menu_wallet':
        return this.renderWalletMenu(player);

      case 'menu_deposit':
        return this.renderDepositMenu(player, parts.slice(1));

      case 'quick_deposit': {
        const amount = parseFloat(parts[1] || '25');
        const method = (parts[2] as DepositMethod) || 'crypto_usdt';

        try {
          const deposit = depositService.createDepositRequest({
            playerId: player.id,
            amount,
            method,
          });

          return {
            chat_id: telegramId,
            text: `💳 *DEPOSIT INVOICE #${deposit.id}*\n\n` +
              `Amount: *$${deposit.amount.toFixed(2)} USD*\n` +
              `Method: *${deposit.method.toUpperCase()}*\n` +
              `Status: *Pending Verification*\n\n` +
              `💡 Click *Confirm Payment* below to simulate automated instant gateway verification.`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚡ Confirm & Auto-Verify Payment', callback_data: `verify_deposit:${deposit.id}` }],
                [{ text: '🔙 Back to Wallet', callback_data: 'menu_wallet' }],
              ],
            },
          };
        } catch (err: any) {
          return {
            chat_id: telegramId,
            text: `❌ *Deposit Error:* ${err.message}`,
            parse_mode: 'Markdown',
          };
        }
      }

      case 'verify_deposit': {
        const depositId = parts[1];
        const res = paymentVerificationService.simulateInstantPayment(depositId);
        const bal = balanceService.getBalance(player.id);

        return {
          chat_id: telegramId,
          text: res.verified
            ? `✅ *DEPOSIT CREDITED!*\n\n$${res.amount?.toFixed(2)} has been added to your main balance.\n\n💵 *New Total Balance:* $${bal.totalBalance.toFixed(2)}`
            : `❌ ${res.message}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎮 Play Games Now', callback_data: 'menu_games' }],
              [{ text: '💰 Wallet', callback_data: 'menu_wallet' }],
            ],
          },
        };
      }

      case 'menu_withdraw':
        return this.renderWithdrawMenu(player, parts.slice(1));

      case 'quick_withdraw': {
        const amount = parseFloat(parts[1] || '20');
        try {
          const wth = withdrawalService.createWithdrawalRequest({
            playerId: player.id,
            amount,
            destination: 'TQ1r8v...WalletAddress',
            method: 'crypto_usdt',
          });

          return {
            chat_id: telegramId,
            text: `💸 *WITHDRAWAL REQUEST CREATED*\n\n` +
              `ID: *#${wth.id}*\n` +
              `Gross Amount: *$${wth.amount.toFixed(2)}*\n` +
              `Network Fee: *$${wth.fee.toFixed(2)}*\n` +
              `Net Payout: *$${wth.netAmount.toFixed(2)}*\n` +
              `Status: *Pending Review*\n\n` +
              `Funds have been reserved and will be processed shortly.`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Back to Wallet', callback_data: 'menu_wallet' }]],
            },
          };
        } catch (err: any) {
          return {
            chat_id: telegramId,
            text: `❌ *Withdrawal Error:* ${err.message}`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Back to Wallet', callback_data: 'menu_wallet' }]],
            },
          };
        }
      }

      case 'menu_profile':
        return this.renderProfileMenu(player);

      case 'menu_history':
        return this.renderHistoryMenu(player);

      case 'menu_notifications':
        return this.renderNotificationsMenu(player);

      case 'menu_help':
        return this.renderHelpMenu(player);

      default:
        return this.renderStartMenu(player);
    }
  }

  // --- View Renderers ---

  private renderStartMenu(player: any): TelegramMessageResponse {
    const bal = balanceService.getBalance(player.id);

    const text =
      `🎰 *WELCOME TO TELEGRAM GAMING PLATFORM*\n\n` +
      `Hey *${player.firstName}*! Welcome to the decentralized casino and lottery bot.\n\n` +
      `💰 *Your Balance:* $${bal.totalBalance.toFixed(2)} ` +
      `(Main: $${bal.mainBalance.toFixed(2)} | Bonus: $${bal.bonusBalance.toFixed(2)})\n\n` +
      `Choose an option below to start playing or manage your wallet:`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎱 Play Bingo', callback_data: 'menu_bingo' },
            { text: '🔢 Play Numbers', callback_data: 'menu_numbers' },
          ],
          [
            { text: '💰 Wallet & Cashier', callback_data: 'menu_wallet' },
            { text: '👤 My Profile', callback_data: 'menu_profile' },
          ],
          [
            { text: '📜 Game History', callback_data: 'menu_history' },
            { text: '🔔 Notifications', callback_data: 'menu_notifications' },
          ],
          [
            { text: '❓ Help & Support', callback_data: 'menu_help' },
          ],
        ],
      },
    };
  }

  private renderGamesMenu(player: any): TelegramMessageResponse {
    const text =
      `🎮 *AVAILABLE GAMES LOBBY*\n\n` +
      `Select a game to enter:\n\n` +
      `🎱 *BINGO 75*\n` +
      `• Live multi-room caller\n` +
      `• Buy multiple cartelas per round\n` +
      `• Line Prize (30%) + Full House Bingo Prize (70%)\n` +
      `• Real-time ball draws every 3 seconds\n\n` +
      `🔢 *LUCKY NUMBERS*\n` +
      `• High payout lottery rounds\n` +
      `• Pick 1 (6x), Pick 2 (35x), Pick 3 (180x)\n` +
      `• Parity (Odd/Even) & Range bets (1.95x)\n` +
      `• Automated draws every minute\n`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎱 Enter Bingo Lobby', callback_data: 'menu_bingo' }],
          [{ text: '🔢 Enter Lucky Numbers', callback_data: 'menu_numbers' }],
          [{ text: '🏠 Home Menu', callback_data: 'menu_start' }],
        ],
      },
    };
  }

  private renderBingoMenu(player: any, _args: string[] = []): TelegramMessageResponse {
    const rooms = Array.from(db.bingoRooms.values());
    let text = `🎱 *BINGO 75 ROOMS*\n\nChoose a room to buy tickets and participate in active rounds:\n\n`;

    const buttons: TelegramInlineButton[][] = [];

    rooms.forEach((room) => {
      const activeRound = bingoEngine.getActiveRoundForRoom(room.id);
      const tickets = activeRound ? bingoEngine.getTicketsForRound(activeRound.id) : [];
      const myTickets = activeRound ? bingoEngine.getPlayerTicketsInRound(activeRound.id, player.id) : [];

      const statusIcon =
        activeRound?.status === 'drawing'
          ? '🔴 DRAWING'
          : activeRound?.status === 'countdown'
          ? '⏳ STARTING'
          : '🟢 OPEN';

      text +=
        `*${room.name}*\n` +
        `• Ticket Price: *$${room.ticketPrice.toFixed(2)}*\n` +
        `• Status: *${statusIcon}* (Round #${activeRound?.roundNumber || 1})\n` +
        `• Current Pool: *$${activeRound?.prizePool.toFixed(2) || '0.00'}*\n` +
        `• Total Tickets: *${tickets.length}* (Yours: ${myTickets.length})\n\n`;

      buttons.push([
        { text: `🎟️ Buy 1 in ${room.name} ($${room.ticketPrice})`, callback_data: `buy_bingo:${room.id}:1` },
        { text: `🎟️ Buy 3 ($${room.ticketPrice * 3})`, callback_data: `buy_bingo:${room.id}:3` },
      ]);
      buttons.push([
        { text: `👀 View Room: ${room.name}`, callback_data: `view_bingo_room:${room.id}` },
      ]);
    });

    buttons.push([{ text: '🔙 Back to Games', callback_data: 'menu_games' }]);

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons },
    };
  }

  private renderBingoRoomDetail(player: any, roomId: string): TelegramMessageResponse {
    const room = db.bingoRooms.get(roomId);
    if (!room) return this.renderBingoMenu(player);

    const activeRound = bingoEngine.getActiveRoundForRoom(roomId);
    const myTickets = activeRound ? bingoEngine.getPlayerTicketsInRound(activeRound.id, player.id) : [];
    const allTickets = activeRound ? bingoEngine.getTicketsForRound(activeRound.id) : [];

    let text =
      `🎱 *ROOM: ${room.name.toUpperCase()}*\n\n` +
      `Round: *#${activeRound?.roundNumber || 1}*\n` +
      `Status: *${activeRound?.status.toUpperCase() || 'WAITING'}*\n` +
      `Ticket Price: *$${room.ticketPrice.toFixed(2)}*\n` +
      `Total Prize Pool: *$${activeRound?.prizePool.toFixed(2) || '0.00'}*\n` +
      `• Line Prize (30%): *$${activeRound?.linePrize.toFixed(2) || '0.00'}* ${activeRound?.lineWinnerPlayerId ? '✅ WON' : '⏳ OPEN'}\n` +
      `• Bingo Prize (70%): *$${activeRound?.bingoPrize.toFixed(2) || '0.00'}* ${activeRound?.bingoWinnerPlayerId ? '✅ WON' : '⏳ OPEN'}\n\n`;

    if (activeRound?.status === 'drawing') {
      const drawn = activeRound.drawnNumbers.slice(0, activeRound.currentDrawnIndex);
      const latest = drawn[drawn.length - 1];
      text += `🎯 *Latest Ball Drawn:* [ *${latest || '-'}* ]\n`;
      text += `Balls Drawn (${drawn.length}/75): ${drawn.slice(-10).join(', ')}...\n\n`;
    }

    text += `🎫 *Your Active Tickets (${myTickets.length}):*\n`;
    if (myTickets.length === 0) {
      text += `You have not purchased any cartelas for this round yet.\n`;
    } else {
      myTickets.slice(0, 2).forEach((t, idx) => {
        text += `\n*Cartela #${idx + 1} (${t.id.slice(-5)})*:\n`;
        text += `B: ${t.cardMatrix[0].slice(0, 5).join(' ')}\n`;
        text += `Status: ${t.hasBingo ? '🏆 BINGO!' : t.hasLine ? '⭐ LINE' : 'In Play'}\n`;
      });
      if (myTickets.length > 2) {
        text += `\n(+${myTickets.length - 2} more tickets active)\n`;
      }
    }

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: `🎟️ Buy 1 Ticket ($${room.ticketPrice})`, callback_data: `buy_bingo:${room.id}:1` },
            { text: `🔄 Refresh Room`, callback_data: `view_bingo_room:${room.id}` },
          ],
          [{ text: '🔙 Back to Rooms', callback_data: 'menu_bingo' }],
        ],
      },
    };
  }

  private renderNumbersMenu(player: any, _args: string[] = []): TelegramMessageResponse {
    const activeRound = numbersEngine.ensureActiveRound();
    const myTickets = numbersEngine.getPlayerTicketsInRound(activeRound.id, player.id);

    const now = Date.now();
    const secRemaining = Math.max(0, Math.floor((activeRound.drawTime - now) / 1000));

    let text =
      `🔢 *LUCKY NUMBERS DRAW #${activeRound.roundNumber}*\n\n` +
      `Status: *${activeRound.status.toUpperCase()}*\n` +
      `Countdown: *${secRemaining} seconds*\n` +
      `Current Round Pool: *$${activeRound.totalPool.toFixed(2)}*\n\n` +
      `🎯 *Multipliers:*\n` +
      `• Pick 1 Number: *6.0x*\n` +
      `• Pick 2 Numbers: *35.0x*\n` +
      `• Pick 3 Numbers: *180.0x*\n` +
      `• Even / Odd Parity: *1.95x*\n` +
      `• Low (1-18) / High (19-36): *1.95x*\n\n` +
      `Your active bets this round: *${myTickets.length}*\n`;

    if (myTickets.length > 0) {
      myTickets.forEach((t) => {
        text += `• ${t.betType.toUpperCase()} ($${t.betAmount}) → Potential Win: $${t.potentialWin.toFixed(2)}\n`;
      });
    }

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 Bet Pick 1: #7 ($5)', callback_data: 'bet_numbers:pick1:5:7' },
            { text: '🎯 Bet Pick 1: #21 ($5)', callback_data: 'bet_numbers:pick1:5:21' },
          ],
          [
            { text: '🎲 Bet Even ($10)', callback_data: 'bet_numbers:parity_even:10:0' },
            { text: '🎲 Bet Odd ($10)', callback_data: 'bet_numbers:parity_odd:10:0' },
          ],
          [
            { text: '📉 Range Low 1-18 ($10)', callback_data: 'bet_numbers:range_low:10:0' },
            { text: '📈 Range High 19-36 ($10)', callback_data: 'bet_numbers:range_high:10:0' },
          ],
          [
            { text: '🔄 Refresh Draw Status', callback_data: 'menu_numbers' },
            { text: '🏠 Home Menu', callback_data: 'menu_start' },
          ],
        ],
      },
    };
  }

  private renderWalletMenu(player: any): TelegramMessageResponse {
    const bal = balanceService.getBalance(player.id);
    const bonusRecord = db.bonusBalances.get(player.id);

    const text =
      `💰 *YOUR WALLET & CASHIER*\n\n` +
      `💵 *Main Balance:* $${bal.mainBalance.toFixed(2)} USD\n` +
      `🎁 *Bonus Balance:* $${bal.bonusBalance.toFixed(2)} USD\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Total Available:* $${bal.totalBalance.toFixed(2)} USD\n\n` +
      `🎯 *Bonus Wagering:*\n` +
      `Progress: $${bonusRecord?.wageringProgress.toFixed(2) || '0.00'} / $${bonusRecord?.wageringRequirement.toFixed(2) || '0.00'}\n\n` +
      `Instant crypto & fiat deposits and fast automated withdrawals are available.`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➕ Quick Deposit $25', callback_data: 'quick_deposit:25:crypto_usdt' },
            { text: '➕ Quick Deposit $50', callback_data: 'quick_deposit:50:crypto_usdt' },
          ],
          [
            { text: '💳 Deposit Options', callback_data: 'menu_deposit' },
            { text: '💸 Withdraw Funds', callback_data: 'menu_withdraw' },
          ],
          [
            { text: '📜 My Transactions', callback_data: 'menu_history' },
            { text: '🏠 Home Menu', callback_data: 'menu_start' },
          ],
        ],
      },
    };
  }

  private renderDepositMenu(player: any, _args: string[] = []): TelegramMessageResponse {
    const text =
      `💳 *DEPOSIT CASHIER*\n\n` +
      `Select a deposit amount and method to fund your gaming account:\n\n` +
      `• Minimum deposit: *$${db.settings.minDeposit.toFixed(2)}*\n` +
      `• Supported: *USDT TRC20, Credit Card, PIX, Instant Voucher*\n` +
      `• Instant balance activation upon verification\n\n` +
      `Select a quick deposit pack below:`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💵 $10 (USDT)', callback_data: 'quick_deposit:10:crypto_usdt' },
            { text: '💵 $25 (USDT)', callback_data: 'quick_deposit:25:crypto_usdt' },
          ],
          [
            { text: '💵 $50 (Card)', callback_data: 'quick_deposit:50:card' },
            { text: '💵 $100 (VIP)', callback_data: 'quick_deposit:100:crypto_usdt' },
          ],
          [{ text: '🔙 Back to Wallet', callback_data: 'menu_wallet' }],
        ],
      },
    };
  }

  private renderWithdrawMenu(player: any, _args: string[] = []): TelegramMessageResponse {
    const bal = balanceService.getBalance(player.id);

    const text =
      `💸 *WITHDRAW CASHIER*\n\n` +
      `Available to withdraw: *$${bal.mainBalance.toFixed(2)} USD*\n` +
      `Minimum withdrawal: *$${db.settings.minWithdrawal.toFixed(2)} USD*\n\n` +
      `Withdrawals are checked by security service and processed directly to your destination wallet or bank.\n\n` +
      `Select an amount to request:`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💸 Withdraw $20', callback_data: 'quick_withdraw:20' },
            { text: '💸 Withdraw $50', callback_data: 'quick_withdraw:50' },
          ],
          [
            { text: '💸 Withdraw $100', callback_data: 'quick_withdraw:100' },
            { text: '🔙 Back to Wallet', callback_data: 'menu_wallet' },
          ],
        ],
      },
    };
  }

  private renderBalanceCard(player: any): TelegramMessageResponse {
    const bal = balanceService.getBalance(player.id);
    return {
      chat_id: player.telegramId,
      text: `💳 *ACCOUNT BALANCE*\n\nMain: *$${bal.mainBalance.toFixed(2)}*\nBonus: *$${bal.bonusBalance.toFixed(2)}*\nTotal: *$${bal.totalBalance.toFixed(2)}*`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 Deposit', callback_data: 'menu_deposit' }, { text: '💸 Withdraw', callback_data: 'menu_withdraw' }],
          [{ text: '🏠 Home', callback_data: 'menu_start' }],
        ],
      },
    };
  }

  private renderProfileMenu(player: any): TelegramMessageResponse {
    const profile = playerService.getPlayerProfile(player.id);
    if (!profile) return this.renderStartMenu(player);

    const text =
      `👤 *PLAYER PROFILE*\n\n` +
      `• Username: *@${profile.username}*\n` +
      `• Telegram ID: \`${profile.telegramId}\`\n` +
      `• Status: *${profile.status.toUpperCase()}*\n` +
      `• VIP Tier: *Level ${profile.vipLevel}*\n` +
      `• Member Since: *${new Date(profile.createdAt).toLocaleDateString()}*\n\n` +
      `📊 *Gaming Performance:*\n` +
      `• Rounds Played: *${profile.stats.roundsPlayed}*\n` +
      `• Total Wagered: *$${profile.stats.totalBets.toFixed(2)}*\n` +
      `• Total Won: *$${profile.stats.totalWins.toFixed(2)}*\n` +
      `• Net Profit: *${profile.stats.netProfit >= 0 ? '+$' : '-$'}${Math.abs(profile.stats.netProfit).toFixed(2)}*`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📜 View Game History', callback_data: 'menu_history' }],
          [{ text: '🏠 Home Menu', callback_data: 'menu_start' }],
        ],
      },
    };
  }

  private renderHistoryMenu(player: any): TelegramMessageResponse {
    const history = gameHistoryService.getPlayerGameHistory(player.id, 5);

    let text = `📜 *RECENT GAME HISTORY*\n\n`;
    if (history.length === 0) {
      text += `No games played yet. Try out /bingo or /numbers!\n`;
    } else {
      history.forEach((h, idx) => {
        const icon = h.outcome === 'win' ? '🟢 WIN' : '🔴 LOSS';
        text +=
          `*#${idx + 1}. ${h.gameType.toUpperCase()}* - ${icon}\n` +
          `• Wager: $${h.betAmount.toFixed(2)} | Payout: $${h.payoutAmount.toFixed(2)}\n` +
          `• Time: ${new Date(h.createdAt).toLocaleTimeString()}\n\n`;
      });
    }

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Play Games', callback_data: 'menu_games' }],
          [{ text: '🏠 Home Menu', callback_data: 'menu_start' }],
        ],
      },
    };
  }

  private renderNotificationsMenu(player: any): TelegramMessageResponse {
    const notifications = notificationService.getPlayerNotifications(player.id);

    let text = `🔔 *NOTIFICATIONS (${notifications.length})*\n\n`;
    if (notifications.length === 0) {
      text += `You have no notifications at this time.\n`;
    } else {
      notifications.slice(0, 5).forEach((n) => {
        text += `*${n.title}*\n${n.message}\n_${new Date(n.createdAt).toLocaleString()}_\n\n`;
        notificationService.markAsRead(n.id);
      });
    }

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🏠 Home Menu', callback_data: 'menu_start' }]],
      },
    };
  }

  private renderHelpMenu(player: any): TelegramMessageResponse {
    const text =
      `❓ *HELP & SUPPORT GUIDE*\n\n` +
      `*1. How to Play Bingo 75:*\n` +
      `• Buy 1 to 6 cartelas in any open room.\n` +
      `• The auto-caller announces balls 1-75.\n` +
      `• Complete any 5-number horizontal, vertical, or diagonal line for the *Line Prize* (30%).\n` +
      `• Complete the entire card for the *Full House BINGO Prize* (70%)!\n\n` +
      `*2. How to Play Lucky Numbers:*\n` +
      `• Place bets on numbers 1-36 or bet on Even/Odd or Range.\n` +
      `• Multipliers range from 1.95x up to 180x!\n\n` +
      `*3. Deposits & Withdrawals:*\n` +
      `• Fast payments via USDT, Card, and Pix.\n` +
      `• 24/7 automated platform monitoring.\n\n` +
      `💬 Need personal assistance? Contact @GamingPlatformSupport`;

    return {
      chat_id: player.telegramId,
      text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 Start Playing', callback_data: 'menu_games' }],
          [{ text: '🏠 Home Menu', callback_data: 'menu_start' }],
        ],
      },
    };
  }

  private getMainReplyKeyboard() {
    return {
      keyboard: [
        [{ text: '🎮 Games' }, { text: '💰 Wallet' }],
        [{ text: '👤 Profile' }, { text: '📜 Game History' }],
        [{ text: '🔔 Notifications' }, { text: '❓ Help/Support' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    };
  }
}

export const telegramBotService = new TelegramBotService();
