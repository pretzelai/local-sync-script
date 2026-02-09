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
  // ── Top Queries ─────────────────────────────
  {
    id: "avg-stripe-fee",
    name: "Average Stripe Fee",
    description: "Min/max/avg fee in absolute and percentage terms",
    sql: `SELECT 
  COUNT(*) AS transactions,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(fee) / 100.0, 2) AS total_fees,
  ROUND(MIN(fee) / 100.0, 2) AS min_fee,
  ROUND(AVG(fee) / 100.0, 2) AS avg_fee,
  ROUND(MAX(fee) / 100.0, 2) AS max_fee,
  ROUND(MIN(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS min_fee_pct,
  ROUND(AVG(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS avg_fee_pct,
  ROUND(MAX(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS max_fee_pct
FROM stripe.balance_transactions
WHERE type = 'charge' AND amount > 0;`,
  },
  {
    id: "monthly-fees",
    name: "Monthly Stripe Fees",
    description: "Monthly fees with min/max/avg absolute and percentage",
    sql: `SELECT 
  TO_CHAR(TO_TIMESTAMP(created), 'YYYY-MM') AS month,
  COUNT(*) AS txns,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(fee) / 100.0, 2) AS total_fees,
  ROUND(MIN(fee) / 100.0, 2) AS min_fee,
  ROUND(AVG(fee) / 100.0, 2) AS avg_fee,
  ROUND(MAX(fee) / 100.0, 2) AS max_fee,
  ROUND(MIN(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS min_fee_pct,
  ROUND(AVG(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS avg_fee_pct,
  ROUND(MAX(CASE WHEN amount > 0 THEN fee::numeric / amount::numeric * 100 END), 2) AS max_fee_pct
FROM stripe.balance_transactions
WHERE type = 'charge'
GROUP BY month
ORDER BY month DESC;`,
  },
  {
    id: "payment-method-split",
    name: "Payment Method Split",
    description: "Fees by payment method type with min/max/avg absolute and pct",
    sql: `SELECT 
  COALESCE(c.payment_method_details->>'type', 'unknown') AS payment_method,
  COUNT(*) AS charges,
  ROUND(SUM(c.amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(bt.fee) / 100.0, 2) AS total_fees,
  ROUND(MIN(bt.fee) / 100.0, 2) AS min_fee,
  ROUND(AVG(bt.fee) / 100.0, 2) AS avg_fee,
  ROUND(MAX(bt.fee) / 100.0, 2) AS max_fee,
  ROUND(MIN(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS min_fee_pct,
  ROUND(AVG(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS avg_fee_pct,
  ROUND(MAX(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS max_fee_pct
FROM stripe.charges c
JOIN stripe.balance_transactions bt ON bt.source = c.id
WHERE c.status = 'succeeded' AND bt.type = 'charge'
GROUP BY c.payment_method_details->>'type'
ORDER BY total_amount DESC;`,
  },
  {
    id: "card-type-split",
    name: "Card Type Split",
    description: "Breakdown by card brand (Visa, Mastercard, Amex, etc.)",
    sql: `SELECT 
  COALESCE(payment_method_details->'card'->>'brand', 'unknown') AS card_brand,
  COALESCE(payment_method_details->'card'->>'funding', '') AS funding,
  COUNT(*) AS charge_count,
  ROUND(SUM(amount) / 100.0, 2) AS total_amount,
  ROUND(AVG(amount) / 100.0, 2) AS avg_amount,
  ROUND(SUM(amount)::numeric / 
    NULLIF(SUM(SUM(amount)) OVER (), 0) * 100, 1
  ) AS pct_of_volume
FROM stripe.charges
WHERE status = 'succeeded'
  AND payment_method_details->>'type' = 'card'
GROUP BY card_brand, funding
ORDER BY total_amount DESC;`,
  },
  {
    id: "fees-by-card-type",
    name: "Fees by Card Type",
    description: "Fees per card brand with min/max/avg absolute and pct",
    sql: `SELECT 
  COALESCE(c.payment_method_details->'card'->>'brand', 'unknown') AS card_brand,
  COALESCE(c.payment_method_details->'card'->>'funding', '') AS funding,
  COUNT(*) AS charges,
  ROUND(SUM(c.amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(bt.fee) / 100.0, 2) AS total_fees,
  ROUND(MIN(bt.fee) / 100.0, 2) AS min_fee,
  ROUND(AVG(bt.fee) / 100.0, 2) AS avg_fee,
  ROUND(MAX(bt.fee) / 100.0, 2) AS max_fee,
  ROUND(MIN(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS min_fee_pct,
  ROUND(AVG(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS avg_fee_pct,
  ROUND(MAX(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS max_fee_pct
FROM stripe.charges c
JOIN stripe.balance_transactions bt ON bt.source = c.id
WHERE c.status = 'succeeded'
  AND c.payment_method_details->>'type' = 'card'
  AND bt.type = 'charge'
GROUP BY card_brand, funding
ORDER BY total_fees DESC;`,
  },
  {
    id: "fee-components",
    name: "Fee Component Breakdown",
    description: "Processing fees vs currency conversion vs other surcharges",
    sql: `SELECT
  detail->>'description' AS fee_component,
  COUNT(*) AS occurrences,
  ROUND(SUM((detail->>'amount')::numeric) / 100.0, 2) AS total_amount,
  ROUND(AVG((detail->>'amount')::numeric) / 100.0, 2) AS avg_amount,
  ROUND(MIN((detail->>'amount')::numeric) / 100.0, 2) AS min_amount,
  ROUND(MAX((detail->>'amount')::numeric) / 100.0, 2) AS max_amount,
  ROUND(
    SUM((detail->>'amount')::numeric) /
    NULLIF(SUM(SUM((detail->>'amount')::numeric)) OVER (), 0) * 100, 1
  ) AS pct_of_total_fees
FROM stripe.balance_transactions bt,
  jsonb_array_elements(bt.fee_details) AS detail
WHERE bt.type = 'charge'
GROUP BY fee_component
ORDER BY total_amount DESC;`,
  },
  {
    id: "domestic-intl",
    name: "Domestic vs International",
    description: "Fee comparison for domestic vs international cards",
    sql: `SELECT
  CASE
    WHEN c.payment_method_details->'card'->>'country' IS NULL THEN 'unknown'
    WHEN c.payment_method_details->'card'->>'country' = UPPER(LEFT(bt.currency, 2))
      THEN 'domestic'
    ELSE 'international (' || COALESCE(c.payment_method_details->'card'->>'country', '?') || ')'
  END AS card_origin,
  COUNT(*) AS charges,
  ROUND(SUM(c.amount) / 100.0, 2) AS total_amount,
  ROUND(SUM(bt.fee) / 100.0, 2) AS total_fees,
  ROUND(MIN(bt.fee) / 100.0, 2) AS min_fee,
  ROUND(AVG(bt.fee) / 100.0, 2) AS avg_fee,
  ROUND(MAX(bt.fee) / 100.0, 2) AS max_fee,
  ROUND(MIN(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS min_fee_pct,
  ROUND(AVG(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS avg_fee_pct,
  ROUND(MAX(CASE WHEN c.amount > 0 THEN bt.fee::numeric / c.amount::numeric * 100 END), 2) AS max_fee_pct
FROM stripe.charges c
JOIN stripe.balance_transactions bt ON bt.source = c.id
WHERE c.status = 'succeeded'
  AND c.payment_method_details->>'type' = 'card'
  AND bt.type = 'charge'
GROUP BY card_origin
ORDER BY total_fees DESC;`,
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
  // ── Browse Data ───────────────────────────────
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
  // ──────────────────────────────────────────────
  // ADD YOUR CUSTOM QUERIES BELOW
  // They'll appear in the sidebar automatically.
  // ──────────────────────────────────────────────
];
