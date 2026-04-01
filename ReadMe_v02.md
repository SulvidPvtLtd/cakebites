# Inventory Management System Plan (JaymimiCakes)

## Context
- React Native (Expo) and Supabase
- Target: physical products
- Goal: production-ready inventory management integrated into the current app

## MVP Approach
- Sprint 1 establishes the inventory data model, admin visibility, and manual stock entry.
- Sprint 2+ adds transactions, automation, analytics, and forecasting.

## Sprint 1: Core inventory foundation (MVP)
Goal: Establish product identifiers, locations, and baseline stock visibility.

Features:
- Product identifiers: SKU, barcode or QR, unit cost, track_inventory flag
- Inventory locations (warehouse, pickup points)
- Stock levels per product and location (on_hand, reserved, available)
- Admin inventory screen for location selection and manual stock updates

Database schema updates (Supabase/PostgreSQL):
- `inventory_locations` table (id, name, code, address, is_active, timestamps)
- `inventory_levels` table (product_id, location_id, on_hand, reserved, status)
- `products` add: `sku`, `barcode`, `track_inventory`, `unit_cost`
- RLS: read for authenticated, write for admins

API endpoints or Supabase queries:
- `select * from inventory_locations order by name`
- `select * from inventory_levels where location_id = :id`
- `upsert into inventory_levels` with onConflict product_id,location_id
- `update products set sku=?, barcode=?, track_inventory=?, unit_cost=?`

Frontend components (React Native / Expo):
- Admin tab: Inventory screen
- Location selector chips and create location form
- Product stock cards with on_hand and reserved inputs
- Product create/edit additions for SKU, barcode, unit cost, track inventory toggle

Sample code:
```ts
await supabase
  .from("inventory_levels")
  .upsert(
    { product_id, location_id, on_hand, reserved, status: "available" },
    { onConflict: "product_id,location_id" },
  );
```

Success criteria:
- Admin can add a location
- Admin can set stock for a product at a selected location
- Stock changes are visible immediately after save
- Products display SKU, barcode, and unit cost fields

Test cases:
- Add location with missing name or code shows a validation error
- Save stock with reserved > on_hand shows a validation error
- Switching locations changes visible stock values
- Disable track_inventory and verify stock edit is disabled

## Sprint 2: Stock tracking and transactions
Goal: Track every inventory movement and ensure auditability.

Features:
- Inventory transactions table (receipts, sales, adjustments, returns)
- Stock adjustments from order placement and cancellation
- FIFO or FEFO lot tracking for perishable items
- Audit trails with user and reason
- Admin transaction history list

Database schema updates:
- `inventory_transactions` table with type, quantity, reason, order_id, user_id
- Optional `inventory_lots` table for FIFO or FEFO

API endpoints or Supabase queries:
- Insert transaction and update inventory_levels in a single RPC or transaction
- Fetch transactions by product or location
- Orders webhook updates inventory after payment success

Frontend components:
- Admin stock adjustment modal
- Transaction history list with filters
- Product-level stock history view

Sample code:
```sql
create or replace function public.adjust_inventory(...)
returns void as $$
begin
  -- insert transaction, update inventory_levels in a transaction
end;
$$ language plpgsql;
```

Success criteria:
- Every stock change creates a transaction row
- Adjustments update levels atomically
- Admin can view transaction history

Test cases:
- Adjustment reduces on_hand and logs transaction
- Order cancellation restores reserved stock
- FIFO allocation reduces oldest lot first

## Sprint 3: Automation and alerts
Goal: Prevent stockouts and reduce manual intervention.

Features:
- Reorder points and safety stock per product and location
- Low stock alerts via push or email
- Supplier lead time tracking
- Auto-create purchase order suggestions

Database schema updates:
- `reorder_rules` table (product_id, location_id, reorder_point, safety_stock)
- `suppliers` table and lead_time fields

API endpoints or Supabase queries:
- Scheduled job to scan low stock and create alerts
- RPC to calculate reorder quantity

Frontend components:
- Admin alert list and acknowledgement
- Reorder rule editor

Sample code:
```sql
select product_id from inventory_levels
where on_hand - reserved <= reorder_point;
```

Success criteria:
- Alerts generated for low stock
- Admin can manage reorder rules

Test cases:
- Reduce on_hand below reorder point triggers alert
- Update lead time changes reorder suggestion

## Sprint 4: Analytics and reporting
Goal: Make inventory performance measurable.

Features:
- Inventory turnover, stockout rate, carrying cost
- Daily stock snapshots
- Exportable reports

Database schema updates:
- `inventory_snapshots` table (daily per product and location)
- `inventory_metrics` view or materialized view

API endpoints or Supabase queries:
- Query snapshots by date range
- Aggregate metrics by location and product

Frontend components:
- Admin analytics dashboard
- Filters by location, product, date range

Sample code:
```sql
select product_id, sum(sold_qty) / avg(on_hand) as turnover
from inventory_snapshots;
```

Success criteria:
- Admin can see turnover and stockout trends
- Reports export reliably

Test cases:
- Snapshot job creates daily rows
- Metrics match known fixtures

## Sprint 5: Advanced features (forecasting, supplier optimization)
Goal: Forecast demand and optimize suppliers.

Features:
- Demand forecasting (historical plus simulated data)
- Supplier performance scoring (lead time accuracy, fill rate)
- Multi-location transfer recommendations
- Advanced barcode scanning support

Database schema updates:
- `demand_forecasts` table
- `supplier_scores` table
- `inventory_transfers` table

API endpoints or Supabase queries:
- Forecast generation job (Edge function or cron)
- Transfer recommendation RPC

Frontend components:
- Forecast chart per product
- Supplier scorecards
- Transfer planning UI

Sample code:
```ts
const forecast = movingAverage(salesHistory, 7);
```

Success criteria:
- Forecast generated for top products
- Supplier scorecards updated monthly

Test cases:
- Forecast output changes with new sales data
- Transfer suggestion decreases stockout risk

## Folder structure improvements
- `src/api/inventory` for inventory-specific hooks and queries
- `src/app/(admin)/inventory` for admin inventory screens
- `src/components/inventory` for reusable inventory UI cards
- `src/lib/inventory` for calculations (available = on_hand - reserved, reorder math)

## State management recommendation
- Keep server state in React Query (already in use)
- Use Zustand for local UI state (filters, draft adjustments, offline queue)
- Keep cart and auth in existing providers

## Supabase auth and roles
- Use `profiles.group` for role checks (admin vs user)
- RLS policies: read for authenticated, write for admin only
- Use `is_admin()` Postgres function for centralized policy checks

## Mobile performance and offline
- Cache inventory queries with React Query stale times
- Add optimistic updates for stock edits
- Use local persistence for offline drafts
- Batch writes when reconnecting

## High-level architecture diagram
```
[Mobile App (Expo)]
  |-- React Query + Zustand
  |-- Admin Inventory UI
  |-- Customer Ordering UI
        |
        v
[Supabase]
  |-- Auth (profiles, roles)
  |-- Postgres (products, inventory_*, orders)
  |-- Storage (product images)
  |-- Edge Functions (payments, scheduled jobs)
```

## Prioritized roadmap for production deployment
1. Data model freeze and migration review
2. Complete Sprint 1 UI and admin training
3. Add inventory transactions (Sprint 2)
4. Harden RLS and audit trails
5. Add monitoring, logs, and error tracking
6. Implement analytics dashboard (Sprint 4)
7. Load test inventory queries
8. Production release with staged rollout

## Risks and mitigations
- Risk: Inventory data drift from manual edits. Mitigation: enforce transaction-based adjustments and audit logs.
- Risk: Offline edits overwrite online changes. Mitigation: add versioning and conflict resolution rules.
- Risk: Performance issues with large catalogs. Mitigation: paginate inventory views and add indexes.
- Risk: Supplier lead time inaccuracies. Mitigation: track actual vs expected lead times and update rules.
- Risk: Incomplete RLS policies. Mitigation: centralize `is_admin()` checks and test with non-admin users.

## Implementation log (Sprint 1)
- Database schema: added inventory tables and product identifiers in `supabase/migrations/20260325120000_add_inventory_foundation.sql`
- Types: updated Supabase types in `src/database.types.ts`
- API hooks: added inventory hooks in `src/api/inventory.ts`
- Admin UI: added inventory screen `src/app/(admin)/inventory.tsx`
- Navigation: added Inventory tab in `src/app/(admin)/_layout.tsx`
- Product editor: added SKU, barcode, unit cost, and track inventory controls in `src/app/(admin)/menu/create.tsx`
- Product mutations: updated insert and update payloads in `src/api/products/index.ts`

## Implementation log (Sprint 2)
- Database schema: added inventory transactions table + `adjust_inventory` RPC in `supabase/migrations/20260325130000_add_inventory_transactions.sql`
- Database schema: added fulfilment location reference in `supabase/migrations/20260325140000_add_fulfillment_location_to_delivery_settings.sql`
- Types: updated Supabase types in `src/database.types.ts`
- API hooks: added transaction queries and adjustment RPC in `src/api/inventory.ts`
- Admin UI: inventory adjustments now log transactions, include adjustment notes, and show recent transactions in `src/app/(admin)/inventory.tsx`
- Order integration: payment edge functions now reserve stock on successful order creation, and cancellation RPC restocks inventory
- Admin settings: delivery settings now include fulfilment location selection (admin-only) and orders reserve stock from that location

## Implementation log (Sprint 3)
- Database schema: added suppliers, reorder rules, inventory alerts, and alert RPCs in `supabase/migrations/20260325150000_add_reorder_rules_and_alerts.sql`
- Types: ensured Supabase types include suppliers, reorder rules, and inventory alerts in `src/database.types.ts`
- API hooks: added suppliers, reorder rules, and alerts hooks plus alert RPCs in `src/api/inventory.ts`
- Admin UI: added supplier management, reorder rule editing, and inventory alert lists in `src/app/(admin)/inventory.tsx`
- Web UI: added a web-specific admin inventory screen in `src/app/(admin)/inventory.web.tsx`
