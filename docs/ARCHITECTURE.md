# Telegram-Based Gaming Platform Architecture & Design

## 1. System Structure Overview

```
                          ┌───────────────────────┐
                          │   PLAYER (TELEGRAM)   │
                          └───────────┬───────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    TELEGRAM BOT (CLIENT)  │
                        │   - Interactive Menus     │
                        │   - Inline Keyboards      │
                        │   - Telegram WebApp UI    │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │      BACKEND / API GATEWAY   │
                       │   - Webhook & Event Router  │
                       │   - REST API Controllers    │
                       │   - Auth & Session Context  │
                       └──────┬───────────────┬──────┘
                              │               │
            ┌─────────────────┴─┐           ┌─┴─────────────────┐
            │   BINGO ENGINE    │           │  NUMBERS ENGINE   │
            │ - Room Lifecycle  │           │ - Betting Window  │
            │ - Card Generator  │           │ - Pick Validation │
            │ - Number Drawing  │           │ - Multiplier Draw │
            │ - Winner Check    │           │ - Prize Settle    │
            └─────────┬─────────┘           └─────────┬─────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      │  Uses
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │                 SHARED SERVICES                 │
             │  ┌─────────────────┐   ┌──────────────────────┐ │
             │  │ Player Service  │   │ Balance Service      │ │
             │  ├─────────────────┤   ├──────────────────────┤ │
             │  │ Transaction Svc │   │ Deposit Service      │ │
             │  ├─────────────────┤   ├──────────────────────┤ │
             │  │ Withdrawal Svc  │   │ Payment Verification │ │
             │  ├─────────────────┤   ├──────────────────────┤ │
             │  │ Notification Svc│   │ Game History Service │ │
             │  ├─────────────────┤   ├──────────────────────┤ │
             │  │ Security & Auth │   │ Maintenance Mode     │ │
             │  └─────────────────┘   └──────────────────────┘ │
             └────────────────────────┬────────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │                    DATABASE                     │
             │  - Players             - Main & Bonus Balances  │
             │  - Deposits            - Withdrawals            │
             │  - Transactions        - Bingo Rooms & Rounds   │
             │  - Bingo Tickets       - Numbers Rounds/Tickets │
             │  - Winners             - Payouts                │
             │  - Game History        - System Settings        │
             └─────────────────────────────────────────────────┘
```

---

## 2. Project Directory Structure

```
├── docs/
│   └── ARCHITECTURE.md             # Complete architectural documentation
├── server/
│   ├── db/
│   │   ├── schema.ts               # Complete TypeScript database schema & interfaces
│   │   └── database.ts             # Relational in-memory store with file-persistence & atomicity
│   ├── services/
│   │   ├── playerService.ts        # Player profiles, auth, lookup, status
│   │   ├── balanceService.ts       # Main & bonus balance operations, fund locks
│   │   ├── transactionService.ts   # Double-entry ledger with balance verification
│   │   ├── depositService.ts       # Deposit intent, methods, verification flow
│   │   ├── withdrawalService.ts    # Withdrawal requests, fee calculation, approval
│   │   ├── paymentVerificationService.ts # Payment proof processing & verification
│   │   ├── notificationService.ts  # Telegram push messages & system notifications
│   │   ├── gameHistoryService.ts   # Unified game logs & player round history
│   │   ├── securityService.ts      # Authentication, rate limit, maintenance guards
│   │   └── systemSettingsService.ts # Global platform parameters & maintenance toggle
│   ├── engines/
│   │   ├── types.ts                # Base game engine interfaces & contracts
│   │   ├── bingoEngine.ts          # Independent Bingo Engine (75-ball, rooms, cards, draws)
│   │   └── numbersEngine.ts        # Independent Numbers Engine (Pick, Straight, Odd/Even)
│   ├── bot/
│   │   ├── telegramBotService.ts   # Main Player Telegram Bot (commands, callbacks, UI rendering)
│   │   └── adminBotService.ts      # Dedicated Admin Telegram Bot & Management Service
│   ├── routes/
│   │   └── apiRoutes.ts            # REST endpoints for web client & WebApp integration
│   └── server.ts                   # Express server entry point with Vite middleware
├── src/
│   ├── components/
│   │   ├── TelegramSimulator.tsx   # Realistic Telegram client interface with chat & inline keys
│   │   ├── AdminDashboard.tsx      # Comprehensive operations & admin monitoring console
│   │   ├── BingoLiveRoom.tsx       # Live Bingo visualizer with cards & animated caller
│   │   ├── NumbersLiveDraw.tsx     # Live Numbers visualizer with tickets & ball roller
│   │   ├── WalletModal.tsx         # Deposit, withdraw, and transaction history modal
│   │   └── ArchitectureView.tsx    # Live interactive system diagram & DB explorer
│   ├── types.ts                    # Client-side TypeScript contracts
│   ├── App.tsx                     # Main frontend application with mode switching
│   └── main.tsx                    # Entry point
```

---

## 3. Component Responsibilities

### A. Telegram Bot (Player Interface)
- **Zero Game Logic**: The bot NEVER calculates winners, numbers, or payouts.
- Acts purely as an input/output adapter: transforms Telegram messages/callbacks into Engine and Service API calls, then renders back rich Telegram response messages with inline keyboards.
- Supported menus & commands:
  - `/start` & Home menu: Navigation hub
  - `/games`: Select between Bingo & Numbers
  - `/bingo`: Room selection, ticket purchasing, live caller feed
  - `/numbers`: Place bets on upcoming draw, view selected numbers
  - `/wallet`: Balance overview (Main + Bonus), quick deposit, withdraw
  - `/deposit`: Select method (Crypto, Card, Pix, Voucher), submit amount
  - `/withdraw`: Submit payout address and amount
  - `/profile`: View VIP tier, win rates, registration date, stats
  - `/history`: Tabular view of recent game rounds and outcomes
  - `/notifications`: View unread alerts and prize notifications
  - `/help`: Rules, FAQ, and 24/7 support channel info

### B. Bingo Engine (`server/engines/bingoEngine.ts`)
- Completely decoupled from the Telegram Bot and from the Numbers Engine.
- Maintains multiple rooms (e.g. Classic, Silver, High Roller) with distinct buy-in prices and prize pools.
- Generates verified 5x5 Bingo cartelas (B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75).
- Controls autonomous round phases:
  1. `WAITING`: Players join and purchase tickets (deducted via `balanceService`).
  2. `COUNTDOWN`: 10-second countdown once min players/timer is reached.
  3. `DRAWING`: Draws balls at fixed intervals (3s), validates all tickets for Line and Bingo patterns.
  4. `ENDED`: Declares winners, computes 30% Line / 70% Bingo prize pools (minus house fee), executes payouts via `balanceService` + `transactionService`, records history in `gameHistoryService`, notifies winners via `notificationService`.
  5. Resets to new round.

### C. Numbers Engine (`server/engines/numbersEngine.ts`)
- Completely decoupled from Bingo and Telegram Bot.
- Runs scheduled draws (e.g. 6 winning balls drawn from 1 to 49).
- Supports multiple bet types:
  - Straight Pick (Exact matching numbers with progressive multiplier)
  - Color / Range (Low 1-24 vs High 25-49)
  - Parity (Even / Odd)
- Betting phase opens, tickets are locked in via `balanceService`.
- Timed drawing sequence with cryptographic-quality random draws.
- Evaluates winning tickets against multiplier tables, disburses winnings via `balanceService`, and logs round history.

### D. Shared Services Layer
1. **Player Service**: Identity management, auto-provisioning Telegram users on first command, player status (Active/Suspended).
2. **Balance Service**: Atomic balances (`mainBalance`, `bonusBalance`). Handles reserve locks, deductions, deposits, winnings credits.
3. **Transaction Service**: Strict immutable ledger. Every coin movement records `beforeBalance`, `afterBalance`, `type`, `referenceId`, `timestamp`.
4. **Deposit Service**: Supports multi-rail deposits, generates payment instructions, tracks pending verifications.
5. **Withdrawal Service**: Enforces minimum payout, checks playthrough requirements, calculates fees, queues for admin approval.
6. **Payment Verification Service**: Processes manual and automated transaction proofs.
7. **Notification Service**: Dispatches instant Telegram chat messages and in-app toasts for win alerts, deposit confirmations, and system announcements.
8. **Game History Service**: Unified query interface for player betting history and global round records across all games.
9. **Security Service**: Rate limiting, token verification, and maintenance mode checks.
10. **System Settings Service**: Centralized configuration for house commission, minimum limits, and maintenance mode.

### E. Admin Bot & Interface (`server/bot/adminBotService.ts`)
- Separate privileged interface for operators:
  - `/admin`: Overview of active games, system status, active player count.
  - Player search & balance adjustment (credit/debit/bonus).
  - Deposit queue: review and 1-click Approve / Reject.
  - Withdrawal queue: review destination wallet and 1-click Approve / Reject.
  - Live Game Engines Monitor: pause/resume rooms, force round start.
  - Platform Financial Statistics: Gross Gaming Revenue (GGR), total turnover, net payout, profit margin.
  - Maintenance Mode: toggle platform maintenance.

---

## 4. Database Structure & Schema

```sql
-- PLAYERS
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'active', -- 'active' | 'suspended' | 'banned'
    vip_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BALANCES
CREATE TABLE main_balances (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bonus_balances (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    wagering_requirement NUMERIC(14,2) DEFAULT 0.00,
    wagering_progress NUMERIC(14,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS (LEDGER)
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    type TEXT NOT NULL, -- 'deposit' | 'withdrawal' | 'bingo_buyin' | 'bingo_win' | 'numbers_bet' | 'numbers_win' | 'bonus_grant' | 'admin_adjust'
    amount NUMERIC(14,2) NOT NULL,
    balance_type TEXT NOT NULL, -- 'main' | 'bonus'
    before_balance NUMERIC(14,2) NOT NULL,
    after_balance NUMERIC(14,2) NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEPOSITS & WITHDRAWALS
CREATE TABLE deposits (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    amount NUMERIC(14,2) NOT NULL,
    method TEXT NOT NULL, -- 'crypto_usdt' | 'card' | 'pix' | 'voucher'
    status TEXT NOT NULL, -- 'pending' | 'verified' | 'rejected'
    proof_ref TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE withdrawals (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    amount NUMERIC(14,2) NOT NULL,
    fee NUMERIC(14,2) NOT NULL,
    net_amount NUMERIC(14,2) NOT NULL,
    destination TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending' | 'approved' | 'rejected' | 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- BINGO ENGINE TABLES
CREATE TABLE bingo_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT NOT NULL,
    ticket_price NUMERIC(10,2) NOT NULL,
    max_tickets_per_player INTEGER NOT NULL DEFAULT 6,
    min_players INTEGER NOT NULL DEFAULT 1,
    prize_pool_pct NUMERIC(5,2) DEFAULT 85.00,
    house_fee_pct NUMERIC(5,2) DEFAULT 15.00,
    countdown_duration_sec INTEGER DEFAULT 15,
    draw_interval_sec INTEGER DEFAULT 3,
    status TEXT DEFAULT 'active'
);

CREATE TABLE bingo_rounds (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES bingo_rooms(id),
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'waiting' | 'countdown' | 'drawing' | 'ended'
    prize_pool NUMERIC(14,2) DEFAULT 0.00,
    line_prize NUMERIC(14,2) DEFAULT 0.00,
    bingo_prize NUMERIC(14,2) DEFAULT 0.00,
    drawn_numbers JSONB DEFAULT '[]',
    current_drawn_index INTEGER DEFAULT 0,
    line_winner_id TEXT REFERENCES players(id),
    bingo_winner_id TEXT REFERENCES players(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

CREATE TABLE bingo_tickets (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES bingo_rounds(id),
    player_id TEXT NOT NULL REFERENCES players(id),
    card_matrix JSONB NOT NULL, -- 5x5 numbers
    marked_matrix JSONB NOT NULL, -- 5x5 booleans
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    has_line BOOLEAN DEFAULT FALSE,
    has_bingo BOOLEAN DEFAULT FALSE
);

-- NUMBERS ENGINE TABLES
CREATE TABLE numbers_rounds (
    id TEXT PRIMARY KEY,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'betting' | 'countdown' | 'drawing' | 'settled'
    total_pool NUMERIC(14,2) DEFAULT 0.00,
    winning_numbers JSONB DEFAULT '[]', -- Drawn numbers
    total_payout NUMERIC(14,2) DEFAULT 0.00,
    start_time TIMESTAMP,
    draw_time TIMESTAMP,
    settled_at TIMESTAMP
);

CREATE TABLE numbers_tickets (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES numbers_rounds(id),
    player_id TEXT NOT NULL REFERENCES players(id),
    bet_type TEXT NOT NULL, -- 'pick1' | 'pick2' | 'pick3' | 'parity' | 'range'
    selected_numbers JSONB NOT NULL,
    bet_amount NUMERIC(14,2) NOT NULL,
    multiplier NUMERIC(6,2) NOT NULL,
    potential_win NUMERIC(14,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending' | 'won' | 'lost'
    payout_amount NUMERIC(14,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WINNERS & PAYOUTS
CREATE TABLE winners (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL, -- 'bingo' | 'numbers'
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES players(id),
    prize_type TEXT NOT NULL, -- 'line' | 'full_house' | 'pick_match'
    prize_amount NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payouts (
    id TEXT PRIMARY KEY,
    winner_id TEXT NOT NULL REFERENCES winners(id),
    player_id TEXT NOT NULL REFERENCES players(id),
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    amount NUMERIC(14,2) NOT NULL,
    status TEXT DEFAULT 'completed',
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GAME HISTORY
CREATE TABLE game_history (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES players(id),
    bet_amount NUMERIC(14,2) NOT NULL,
    payout_amount NUMERIC(14,2) NOT NULL,
    outcome TEXT NOT NULL, -- 'win' | 'loss'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SYSTEM SETTINGS
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'config',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT DEFAULT 'System under scheduled maintenance.',
    min_deposit NUMERIC(10,2) DEFAULT 5.00,
    min_withdrawal NUMERIC(10,2) DEFAULT 10.00,
    bingo_house_fee_pct NUMERIC(5,2) DEFAULT 10.00,
    numbers_house_fee_pct NUMERIC(5,2) DEFAULT 10.00,
    default_bonus_amount NUMERIC(10,2) DEFAULT 25.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Extensibility: Adding a New Game
Thanks to the decoupled design, adding a 3rd game (e.g. `CrashEngine` or `DiceEngine`) requires only:
1. Implement the `GameEngine` interface in `server/engines/newGameEngine.ts`.
2. Connect to existing `balanceService.deductFunds(...)` and `balanceService.creditFunds(...)`.
3. Register round outcomes with `gameHistoryService.recordHistory(...)`.
4. Register the bot menu handler in `telegramBotService.ts` via the modular game registry.
No changes to `BingoEngine` or `NumbersEngine` are needed.
