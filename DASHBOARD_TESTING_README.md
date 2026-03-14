## Dashboard Testing Scenarios

This guide explains how to reliably recreate two dashboard testing setups:

- **Scenario A**: Demo admin with **rich seeded data** (for showcasing features)
- **Scenario B**: Clean admin on **empty transactional data** (for output screening)

Both scenarios use the same codebase and dashboards; only the database contents differ.

---

## Prerequisites

- PostgreSQL running and accessible with the connection string in `.env`
- Backend dependencies installed:

```bash
cd server
npm install
```

---

## Common Step – Create Admin Test Accounts

We maintain **two admin accounts** via `server/setup_test_admin.js`:

- **Demo Admin (seeded data)**
  - Email: `admin@example.com`
  - Password: `admin123`
- **Clean Admin (empty DB)**
  - Email: `cleanadmin@example.com`
  - Password: `admin123`

To (re)create both admins after migrations:

```bash
cd server
node setup_test_admin.js
```

You can safely run this script multiple times; it will update existing rows if they already exist.

---

## Scenario A – Demo Admin with Seeded Dashboard Data

Use this when you want the dashboard to be **fully populated** with realistic metrics.

1. **Apply schema** (if not already done)

   Run `server/database/schema.sql` against your PostgreSQL database (e.g. via psql or your DB tool).

2. **Seed rich dashboard data**

   ```bash
   cd server
   node seed_dashboard.js
   ```

   This script populates:
   - `categories`, `products`, `warehouses`, `suppliers`
   - `inventory`
   - `receipts`, `deliveries`, `transfers`, `stock_adjustments`
   - `stock_ledger` (for dashboard activity and counts)

3. **Create/refresh admin accounts**

   ```bash
   cd server
   node setup_test_admin.js
   ```

4. **Start the app and login as Demo Admin**

   - Start backend (from `server`):
     ```bash
     npm run dev
     ```
   - Start frontend (from `client`):
     ```bash
     cd client
     npm install
     npm run dev
     ```
   - Login with:
     - Email: `admin@example.com`
     - Password: `admin123`

   The **dashboard will show populated stats** driven by the seeded data.

---

## Scenario B – Clean Admin on Empty Transactional Data

Use this when you want the dashboard to start **empty** so you can create data during output screening and watch it sync live.

1. **Start from a clean database**

   Use a fresh database or truncate the main transactional tables:

   ```sql
   TRUNCATE TABLE
     stock_ledger,
     stock_adjustments,
     receipts,
     deliveries,
     transfers,
     inventory,
     supplier_products,
     suppliers,
     products,
     categories,
     warehouse_assignments,
     warehouses,
     users
   RESTART IDENTITY CASCADE;
   ```

2. **Re-apply schema**

   Run `server/database/schema.sql` again on the clean database to ensure all columns and constraints are present.

3. **Do NOT run any seeders**

   - **Skip** `server/database/seed.sql`
   - **Skip** `server/seed_dashboard.js`

   This keeps the transactional data empty so the dashboard starts at zero.

4. **Create/refresh admin accounts**

   ```bash
   cd server
   node setup_test_admin.js
   ```

5. **Start the app and login as Clean Admin**

   - Backend (from `server`):
     ```bash
     npm run dev
     ```
   - Frontend (from `client`):
     ```bash
     cd client
     npm install
     npm run dev
     ```
   - Login with:
     - Email: `cleanadmin@example.com`
     - Password: `admin123`

   The **dashboard will show zeros/empty counts**. As you create receipts, deliveries, transfers, etc., you can verify that all dashboard metrics update correctly from live data.

---

## Quick Reference

- **Demo Admin (seeded data)**  
  - Prep: `schema.sql` + `node seed_dashboard.js` + `node setup_test_admin.js`  
  - Login: `admin@example.com` / `admin123`

- **Clean Admin (empty data)**  
  - Prep: Clean DB → `schema.sql` → `node setup_test_admin.js` (no seed scripts)  
  - Login: `cleanadmin@example.com` / `admin123`

