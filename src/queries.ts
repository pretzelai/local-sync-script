export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
}

/**
 * Pre-installed queries for exploring Stripe data.
 * Add your own queries here — they'll show up in the sidebar automatically.
 */
export const savedQueries: SavedQuery[] = [
  {
    id: "tables",
    name: "All Tables",
    description: "List all Stripe tables with estimated row counts",
    sql: `SELECT 
  schemaname || '.' || relname AS table_name,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'stripe'
ORDER BY n_live_tup DESC;`,
  },
  {
    id: "customers",
    name: "Customers",
    description: "All synced customers",
    sql: `SELECT id, email, name, created, currency
FROM stripe.customers
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "subscriptions",
    name: "Subscriptions",
    description: "All subscriptions with status",
    sql: `SELECT id, customer, status, 
  current_period_start, current_period_end, 
  created, canceled_at
FROM stripe.subscriptions
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "active-subs",
    name: "Active Subscriptions",
    description: "Currently active subscriptions only",
    sql: `SELECT id, customer, status,
  current_period_start, current_period_end, created
FROM stripe.subscriptions
WHERE status = 'active'
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "products",
    name: "Products",
    description: "All products in your catalog",
    sql: `SELECT id, name, active, description, created
FROM stripe.products
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "prices",
    name: "Prices",
    description: "All prices with product info",
    sql: `SELECT id, product, active, currency, 
  unit_amount, recurring, type, created
FROM stripe.prices
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "invoices",
    name: "Invoices",
    description: "Recent invoices",
    sql: `SELECT id, customer, status, currency,
  amount_due, amount_paid, amount_remaining,
  created, due_date
FROM stripe.invoices
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "charges",
    name: "Charges",
    description: "Recent charges",
    sql: `SELECT id, customer, amount, currency,
  status, paid, refunded, created
FROM stripe.charges
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "payment-intents",
    name: "Payment Intents",
    description: "Recent payment intents",
    sql: `SELECT id, customer, amount, currency,
  status, created
FROM stripe.payment_intents
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "payment-methods",
    name: "Payment Methods",
    description: "Stored payment methods",
    sql: `SELECT id, customer, type, created
FROM stripe.payment_methods
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "sync-status",
    name: "Sync Runs",
    description: "Recent sync engine runs",
    sql: `SELECT *
FROM stripe._sync_runs
ORDER BY started_at DESC
LIMIT 20;`,
  },
  // ── Balance Transactions ──────────────────────
  {
    id: "balance-txns",
    name: "Balance Transactions",
    description: "All balance transactions with fees",
    sql: `SELECT id, type, amount, fee, net, currency,
  description, source, created
FROM stripe.balance_transactions
ORDER BY created DESC
LIMIT 200;`,
  },
  {
    id: "balance-txns-by-type",
    name: "Balance Txns by Type",
    description: "Volume and fees grouped by transaction type",
    sql: `SELECT 
  type,
  COUNT(*) AS count,
  SUM(amount) / 100.0 AS total_amount,
  SUM(fee) / 100.0 AS total_fees,
  SUM(net) / 100.0 AS total_net,
  ROUND(AVG(fee) / 100.0, 2) AS avg_fee
FROM stripe.balance_transactions
GROUP BY type
ORDER BY total_fees DESC;`,
  },
  {
    id: "avg-stripe-fee",
    name: "Average Stripe Fee",
    description: "Average fee charged by Stripe per transaction",
    sql: `SELECT 
  COUNT(*) AS total_transactions,
  ROUND(AVG(fee) / 100.0, 2) AS avg_fee,
  ROUND(MIN(fee) / 100.0, 2) AS min_fee,
  ROUND(MAX(fee) / 100.0, 2) AS max_fee,
  ROUND(SUM(fee) / 100.0, 2) AS total_fees,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(
    CASE WHEN SUM(amount) > 0 
      THEN (SUM(fee)::numeric / SUM(amount)::numeric) * 100 
      ELSE 0 
    END, 2
  ) AS fee_pct_of_amount
FROM stripe.balance_transactions
WHERE type = 'charge' AND amount > 0;`,
  },
  {
    id: "monthly-fees",
    name: "Monthly Stripe Fees",
    description: "Fees paid to Stripe broken down by month",
    sql: `SELECT 
  TO_CHAR(TO_TIMESTAMP(created), 'YYYY-MM') AS month,
  COUNT(*) AS transactions,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(fee) / 100.0, 2) AS total_fees,
  ROUND(SUM(net) / 100.0, 2) AS total_net,
  ROUND(AVG(fee) / 100.0, 2) AS avg_fee
FROM stripe.balance_transactions
WHERE type = 'charge'
GROUP BY month
ORDER BY month DESC;`,
  },
  {
    id: "payment-method-split",
    name: "Payment Method Split",
    description: "Breakdown of charges by payment method type",
    sql: `SELECT 
  COALESCE(payment_method_details->>'type', 'unknown') AS payment_method,
  COUNT(*) AS charge_count,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(AVG(amount) / 100.0, 2) AS avg_amount,
  ROUND(SUM(amount)::numeric / 
    NULLIF(SUM(SUM(amount)) OVER (), 0) * 100, 1
  ) AS pct_of_volume
FROM stripe.charges
WHERE status = 'succeeded'
GROUP BY payment_method_details->>'type'
ORDER BY total_amount DESC;`,
  },
  // ──────────────────────────────────────────────
  // ADD YOUR CUSTOM QUERIES BELOW
  // They'll appear in the sidebar automatically.
  // ──────────────────────────────────────────────
];
