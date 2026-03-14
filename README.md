# CoreInventory-IMS

A full-stack Inventory Management System built for accurate stock tracking, receipt and delivery processing, and role-based operational control.

## Aim

Build a reliable digital system that replaces manual inventory handling with structured, auditable, and real-time workflows.

## Objectives

1. Centralize product, warehouse, supplier, and inventory data.
2. Streamline inbound receipts and outbound deliveries with validation.
3. Maintain consistent stock records through controlled operations.
4. Enforce role-based access to protect sensitive actions.
5. Provide dashboard visibility for operations and stock movement.

## Key Functionalities

### Authentication and Access Control

- Login and secure token-based authentication.
- Role-based access controls for protected modules and actions.
- Unauthorized access prevention for sensitive endpoints.

### Dashboard and Stock

- Operational overview dashboard.
- Stock visibility across warehouses.
- Monitoring of inventory state and movement context.

### Operations

- Receipt workflow: create, validate, and generate.
- Delivery workflow: create, validate, and generate.
- Unit-price-aware line validation and total calculations.

### Master Data and Warehouse Setup

- Product and category support.
- Supplier and supplier-product pricing structure.
- Warehouse and location management.

### Ledger and Data Reliability

- Stock ledger support for operation traceability.
- Migration-backed schema evolution.
- Seed and setup paths for local reproducible environments.

## Team Contributions

| Contributor | Role and Contribution |
| --- | --- |
| Anmol Ramchandani | Team lead. Led the team and specifically worked on the components of dashboard and stock. |
| Siddhi Rinkalkumar Panchal | DBMS expert. Worked on database schema and ER diagram. |
| Kunjan Patel | Worked on UI and developed components specifically for operations and delivery lines. |
| Aliza Saiyed | Created role-based access component and ensured unauthorized access is blocked. |

## Project Structure

- client/ - React + Vite frontend
- server/ - Node.js + Express API + PostgreSQL backend

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+
- pgAdmin (recommended for DB setup)

## Environment Setup

Create this file:

- server/.env

Use this template:

```env
JWT_SECRET=replace_with_a_strong_secret

DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coreinventory

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

Notes:

- If email testing is not required, SMTP values can be placeholders.
- Database values must match your local PostgreSQL instance.

## Install Dependencies

From project root:

```bash
npm.cmd --prefix server install
npm.cmd --prefix client install
```

On Windows, prefer npm.cmd instead of npm.

## Database Setup in pgAdmin

### 1) Create Database

1. Connect to PostgreSQL in pgAdmin.
2. Create database named coreinventory.

### 2) Run Schema

Execute:

- server/database/schema.sql

### 3) Run Seed

Execute:

- server/database/seed.sql

### 4) Run Migrations (in this exact order)

1. server/database/add_status_columns.sql
2. server/database/receipt_schema_update.sql
3. server/database/update_receipt_trigger.sql
4. server/database/delivery_schema_update.sql
5. server/database/update_delivery_trigger.sql
6. server/database/add_ledger_idempotency.sql
7. server/database/add_outbox_inbox.sql

### 5) Verify Database

Run:

```sql
SELECT
  to_regclass('public.receipts') AS receipts,
  to_regclass('public.deliveries') AS deliveries,
  to_regclass('public.supplier_products') AS supplier_products,
  (SELECT COUNT(*) FROM warehouses) AS warehouses_count,
  (SELECT COUNT(*) FROM suppliers) AS suppliers_count,
  (SELECT COUNT(*) FROM supplier_products) AS supplier_products_count;
```

Expected:

- All to_regclass values are not null.
- warehouses_count, suppliers_count, supplier_products_count are greater than 0.

## Create Admin Users

From project root:

```bash
node server/setup_test_admin.js
```

This creates or updates:

- admin@example.com / admin123
- cleanadmin@example.com / admin123

## Run Application

Start backend:

```bash
npm.cmd --prefix server run dev
```

Start frontend in another terminal:

```bash
npm.cmd --prefix client run dev
```

Login with an admin account and test receipt and delivery flows.

## Quick Functional Check

1. Receipt flow: Validate, then Generate.
2. Delivery flow: Validate, then Generate.
3. Confirm unit prices and totals are populated correctly.

## Troubleshooting

### Database is being accessed by other users

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'coreinventory'
  AND pid <> pg_backend_pid();
```

### DROP DATABASE cannot run inside a transaction block

- Use Auto-commit ON in pgAdmin Query Tool.
- Run DROP DATABASE as a single standalone statement.

### Validate returns server error

Usually indicates partial schema or migration execution.

Fix sequence:

1. Re-run schema.sql.
2. Re-run seed.sql.
3. Re-run migration files in the order listed above.

