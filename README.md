# SolTrace ⚡

**SolTrace** is an advanced AI-powered conversational on-chain investigator and transaction scanner for the **Solana blockchain**. It connects natural language queries directly to live on-chain telemetry, decodes complex decentralized transactions, and provides verified Solscan proof links for every finding.

---

## 🚀 Key Features

- 💬 **Conversational AI Scanner**: Chat naturally with SolTrace! Say hello, ask questions, or paste any Solana Base58 address or transaction hash.
- 🔗 **Verified Proof Links**: Every cited transaction signature, counterparty, and token mint links directly to [Solscan.io](https://solscan.io).
- 📊 **Interactive Visual Money Flow**: Generates interactive 3-column diagrams mapping Inbound Senders $\to$ Target Wallet $\to$ Outbound Recipients.
- 🪙 **Multi-Token Counterparty Analytics**: Evaluates native SOL, USDT, USDC, and all SPL token Associated Token Accounts (ATAs).
- 🤝 **Deep Mutual Address Scanner**: Automatically cross-references transaction histories between two wallets to discover shared transactions, tokens, and transfer dates.
- 🛡️ **Wallet Security & Drainer Risk Audit**: Diagnostic safety score (0–100%) checking for malicious token approvals, suspicious airdrop voucher scams, and high failure rates.
- 📈 **DEX Swap & PnL Tracker**: Decodes DEX swap instructions across Raydium, Jupiter, Orca, Meteora, and Pump.fun.
- ⛓️ **Multi-Hop "Follow the Money" Tracer**: Traces outbound funds 2–3 hops deep into secondary recipients and exchange hot wallets (Binance, Coinbase, Kraken, Bybit).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (Dark Mode `#0F1012`)
- **Reasoning Engine**: Groq AI (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`)
- **Blockchain Data**: Solana JSON-RPC Mainnet Cluster & Solscan MCP
- **Icons**: Lucide React
- **Language**: TypeScript

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd solscan-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your **Groq API key** and optional **Solscan API key**.

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run tests
```bash
npm test
```

---

## 🧪 Verification & Test Suite

The test suite validates all 15 core workflows:
- Scenario 1: Wallet Load & LOOKUP Queries (SOL & SPL balances)
- Scenario 2: ENRICHMENT Queries (USD Portfolio Valuation & Whale Detection)
- Scenario 3: AGGREGATION Queries (Counterparty Ranking & Flows)
- Scenario 4: Multi-Turn Direction Flipping & Window Expansion
- Scenario 5: Address Labeling, Rate Limits & Transparent Fallbacks
- Scenario 6: Conversational Greetings, Visual Flow Maps & Security Audits

---

## 🛡️ License
ISC
