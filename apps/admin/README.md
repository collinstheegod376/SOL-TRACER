# Rebate admin

```powershell
cd apps\admin
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:3301. The site must already be running at `SITE_URL` (http://127.0.0.1:3000). `ADMIN_JWT_SECRET` must match the site's `REBATE_ADMIN_TOKEN`. The browser never sees the vault key.

Take snapshot calculates who sold the token at a loss and saves `data/snapshot.json`. Claim on the site reads that list. Run starts `scripts/disburse.py` for wallets that claimed.
