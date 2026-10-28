# Server scripts

Run these on the EC2 box from the repo root (`~/DestinyOne2`).

| Script | What it does |
| --- | --- |
| `deploy.sh` | Pull, install, restart the backend, build and publish the frontend. Options: `--migrate`, `--backend-only`, `--frontend-only` |
| `backup-db.sh` | Gzipped MySQL dump into `~/backups/destinyone`, keeps 14 days |
| `cleanup-disk.sh` | Frees disk space (logs, caches, old builds) |

## First time

```bash
chmod +x scripts/ops/*.sh
bash scripts/ops/cleanup-disk.sh
bash scripts/ops/backup-db.sh        # test one backup by hand
```

## Daily backup at 03:00 server time

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * bash $HOME/DestinyOne2/scripts/ops/backup-db.sh >> $HOME/backups/backup.log 2>&1") | crontab -
```

Copy backups off the server now and then (they live on the same disk as the database).

## Restore a backup

```bash
gunzip -c ~/backups/destinyone/<file>.sql.gz | mysql -u <user> -p <database>
```

## Gift delivery (manual fulfilment)

Env on the server (`backend/.env`): `STRIPE_WEBHOOK_SECRET`, `GIFT_ADDRESS_KEY` (`openssl rand -hex 32`), `GIFT_OPS_KEY` (`openssl rand -hex 24`).
Stripe webhook endpoint: `https://api.destinyone.co/webhooks/stripe` (events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`).

```bash
KEY=your-ops-key; API=https://api.destinyone.co
# what has to be delivered (paid orders, with the recipient address)
curl -s -H "X-Ops-Key: $KEY" "$API/ops/gifts/orders?status=merchant_preparing"
# move an order: courier_assigned | picked_up | delivered | failed | cancelled
curl -s -X POST -H "X-Ops-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"status":"delivered"}' "$API/ops/gifts/orders/ORDER_ID/status"
# failed/cancelled after payment refunds the customer automatically
```
