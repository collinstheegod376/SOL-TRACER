# Rebate

Payouts are normal SOL transfers from the vault wallet. There is no on-chain program.

The vault address is `26bu54yw4kXrd3xWMhoin5xay2fxQFdf68sXhE5Cr6MD`. The private key is `keys/vault.json`. It is gitignored. On Vercel, set `VAULT_SECRET_KEY` to the same JSON array and set `REBATE_ADMIN_TOKEN` to the same value as `ADMIN_JWT_SECRET`.

## Workflow

The mint is `TOKEN_MINT` in the site `.env`. Change that value, restart the site, then take a new snapshot.

1. Open the dashboard at http://localhost:3301 and press **Take snapshot**.
   The site reads sells of `TOKEN_MINT` and writes `data/snapshot.json`. That file is the eligibility list. It is not browser localStorage.
2. Commit and push only that file:

```
git add data/snapshot.json
git commit -m "Update rebate eligibility"
git push
```

   After the site redeploys, Claim reads the committed file. A wallet in it is eligible and the amount is shown. Claim says "You will receive it soon." A wallet that is not in the file gets "Not eligible." Claim does not send SOL.
3. Press **Run** on the computer that holds the vault key.
   That starts `python scripts/disburse.py data/run.csv --send` and pays the eligible wallets in the file. The vault keeps 0.0011 SOL. If the vault cannot cover the run, nothing is sent.

This works when the deployment is built from that GitHub commit. The snapshot has wallet addresses and amounts, and no private key. Do not commit `.env`, `keys/`, or `data/payouts.json`. If the GitHub repo is public, the list in `data/snapshot.json` is public too.

The rebate equals the loss in SOL. A bigger loss pays more SOL, until the payment hits $100 or half of the SOL spent buying the token.

Rules: loss at least $5, no minimum hold, no stay-sold requirement, no cooldown. A gain does not cancel a loss. A sell with no matching buy is ignored. Under 0.005 SOL is not paid. USD amounts use the SOL price at the time of the snapshot.

## Local

The site is http://localhost:3000. The dashboard is http://localhost:3301 and talks to the site. `ADMIN_JWT_SECRET` must match `REBATE_ADMIN_TOKEN`.

Each transfer costs the network fee of 0.000005 SOL.

The same transfer can be previewed with `python scripts/disburse.py data/run.csv` and sent with `--send`.

## Vercel

The Claim button calls `/api/rebate` on the same deployment. The build includes `data/snapshot.json`, so eligibility checks work after you push that file. Add `VAULT_SECRET_KEY`, `REBATE_ADMIN_TOKEN`, `TOKEN_MINT`, and `HELIUS_API_KEY` in the Vercel project only if you also take snapshots there. Paying still runs on the computer that has `keys/vault.json`. A claim on the deployed site does not send SOL and does not rewrite the GitHub file.
