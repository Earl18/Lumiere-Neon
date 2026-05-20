# Lumiere Neon

Lumiere Neon is a full-stack inventory, warehouse, supplier, and accounting website built for Lumiere Corporation. It manages product inventory across multiple warehouses, supplier restocks, stock transfers, customer sales, internal document signing, receivables, payables, and payout workflows in one system.

The website is designed around real operational flows:
- inbound supplier restocks for `Warehouse A`
- inter-warehouse transfer requests between managers
- outbound customer sales from warehouse stock
- document-backed approvals for purchase orders and transfer orders
- supplier disbursements and customer collection tracking
- supplier payout methods and packing list generation

## Website Overview

Lumiere Neon combines operations, warehouse control, supply-chain visibility, and accounting support in a single dark-themed web dashboard.

Core areas of the website:
- `Role Dashboards`: separate dashboard experiences for Super Admin, Manager, Accountant, and Supplier
- `Inventory`: product catalog, warehouse stock, category views, stock health, and pricing
- `Order Logs`: inbound, transfer, and outbound operational records
- `Supply Network`: supplier registration, product-to-supplier mapping, and supplier quotes
- `Expenses`: accounts payable, disbursement history, accounts receivable, and collection history
- `Payment Methods`: supplier-side payout method management
- `Personnel`: role-based staff and manager administration

## Main Workflows

### 1. Supplier Restocks
- Managers or the Super Admin create inbound orders to `Warehouse A`
- The system generates a purchase order document
- The warehouse manager signs first
- The Super Admin / CEO signs second
- The supplier completes the final signature through the supplier flow
- Once completed, the order can be received into inventory
- The payable becomes available in accounting for disbursement

### 2. Stock Transfers
- Managers create transfer requests between warehouses
- The requesting warehouse manager signs first
- The source warehouse manager signs second
- After both signatures, the transfer becomes ready for receiving
- The transfer modal supports the signed transfer document and transfer packing list flow

### 3. Customer Sales
- Managers or the Super Admin create outbound orders from warehouse stock
- Stock is validated before the sale is created
- Pending sales can download a packing list from the order details modal
- Once `Deliver` is confirmed, the sale auto-prints a receipt and switches the document action to downloadable order receipt
- Only completed sales can be collected in the receivables ledger

### 4. Accounting and Settlement
- Delivered inbound supplier orders appear as accounts payable
- Outbound sales appear as accounts receivable
- Supplier disbursements support:
  - supplier primary payout method selection
  - Xendit checkout/disbursement flows
  - escrow simulation mode
  - disbursement refresh/retry/release actions
- Customer receivables support collection recording after sale completion

### 5. Supplier Payment Methods
- Suppliers can store bank or e-wallet payout methods
- A primary payment method can be selected
- The accounting disbursement flow follows the supplier's primary saved method

## Features

### Inventory and Warehousing
- Multi-warehouse stock tracking
- Product categories and product details
- Low-stock awareness
- Warehouse-level stock totals
- Selling price and supplier pricing support
- Warehouse seeding on backend startup

### Dashboards
- Separate Super Admin dashboard and inventory workspace
- Separate Manager dashboard and inventory workspace
- Supplier dashboard with operational queue, payout summary, and action list
- Accountant dashboard with payable, receivable, disbursement, and collection summaries
- Role-scoped activity and KPI views instead of one shared landing page

### Orders and Logs
- Inbound, outbound, and transfer order creation
- Role-aware order visibility
- Operational status tracking
- Delivery and cancellation handling
- Manager and Super Admin logs visibility

### Documents
- Purchase order generation
- Transfer order generation
- Packing list generation for pending outbound customer sales
- Printable and downloadable order receipts for delivered customer sales
- Packing list generation for signed stock transfers
- Re-downloadable generated documents after template updates

### Signing and Approval
- Warehouse manager purchase-order signing
- CEO / Super Admin purchase-order approval
- Supplier purchase-order signing
- Requesting and source warehouse signatures for transfer orders
- Signature image storage support

### Accounting
- Accounts payable ledger
- Accounts receivable ledger
- Disbursement history
- Collection history
- Completed-only collection rule for customer sales
- Supplier payout method summary in accounting records

### Security and Access Control
- JWT authentication
- Role-based route and UI protection
- Separate experiences for:
  - `SuperAdmin`
  - `Manager`
  - `Accountant`
  - `Staff`
  - `Supplier`

## User Roles

### Super Admin
- Full platform access
- Dedicated executive dashboard plus separate inventory workspace
- Can manage products, suppliers, warehouses, and personnel
- Can approve purchase orders as the company owner / CEO
- Can create orders and review reports
- Can participate in accounting flows

### Manager
- Dedicated warehouse operations dashboard plus separate inventory workspace
- Can manage operational flows for assigned warehouses
- Can create inbound, transfer, and outbound orders
- Can sign warehouse documents assigned to their warehouse
- Can receive completed restocks and transfers

### Accountant
- Can access accounting ledgers
- Can collect completed customer sales
- Can process payable disbursements

### Staff
- Read-focused access to inventory and logs
- No privileged accounting or admin actions

### Supplier
- Can access their own supplier dashboard and supplier product view
- Can review and sign purchase orders
- Can manage payout methods for disbursements
- Can monitor recent inbound activity and supplier-side order status

## Tech Stack

- Frontend:
  - React
  - Vite
  - React Router
  - Lucide React
- Backend:
  - Node.js
  - Express
  - Mongoose
- Database:
  - MongoDB Atlas
- Documents and file generation:
  - `python-docx`
  - `adm-zip`
  - `@xmldom/xmldom`
- Integrations:
  - Xendit
  - Brevo
  - Supabase Storage

## Project Structure

```text
Inventory System/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- models/
|   |-- routes/
|   |-- scripts/
|   |-- storage/
|   |-- templates/
|   |-- utils/
|   `-- server.js
|-- frontend/
|   |-- src/
|   `-- package.json
|-- scripts/
|   |-- start.js
|   `-- migrate-mongodb.js
|-- .env.example
|-- package.json
`-- README.md
```

## Local Development

Install dependencies from the project root:

```powershell
npm install
```

Run the website locally:

```powershell
npm run dev
```

That starts:
- backend on `http://localhost:5000`
- frontend on Vite's local port, usually `http://localhost:5173`

Build the frontend:

```powershell
npm run build
```

## Environment Variables

Create a root `.env` file based on `.env.example`.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
VITE_API_BASE_URL=http://localhost:5000/api
FRONTEND_BASE_URL=http://localhost:5173
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Lumiere Corporation
XENDIT_SECRET_KEY=your_xendit_test_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_publishable_key
SUPABASE_SIGNATURE_BUCKET=signatures
PYTHON_BIN=python3
```

### Important Notes
- The backend reads the root `.env`
- `VITE_API_BASE_URL` is for the frontend build
- Render should use `PYTHON_BIN=python3`
- Vercel should set `VITE_API_BASE_URL` in project environment variables

## Deployment

### Backend on Render

Recommended setup:
- `Language`: Node
- `Root Directory`: leave blank if using the root `package.json`
- `Build Command`:

```bash
npm install && pip install -r backend/requirements.txt
```

- `Start Command`:

```bash
npm --prefix backend start
```

- `Health Check Path`:

```text
/healthz
```

### Frontend on Vercel

Recommended setup:
- `Root Directory`: `frontend`
- `Build Command`: `npm run build`
- `Output Directory`: `dist`
- `Install Command`: `npm install`

Frontend environment variable:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api
```

Backend environment variable example:

```env
FRONTEND_BASE_URL=https://your-vercel-url.vercel.app
```

### Role Dashboard Notes

Current dashboard routing in the frontend:
- `SuperAdmin`: `Dashboard` and `Inventory` are separate tabs
- `Manager`: `Dashboard` and `Inventory` are separate tabs
- `Accountant`: `Dashboard` is the `inventory` route for accounting summary access
- `Supplier`: `Dashboard` is the `inventory` route for supplier workspace access

## MongoDB Migration

The project includes a MongoDB migration utility:

```powershell
npm run migrate:mongodb
```

It uses:
- `SOURCE_MONGO_URI` or current `MONGO_URI`
- `TARGET_MONGO_URI` or `NEW_MONGO_URI`
- optional `TARGET_DB_NAME`

Example:

```powershell
$env:TARGET_MONGO_URI="mongodb+srv://user:password@cluster.mongodb.net/test?retryWrites=true&w=majority"
$env:TARGET_DB_NAME="test"
npm run migrate:mongodb
```

## File and Document Storage

The backend serves generated files through:

- `/files`

Generated assets can include:
- purchase orders
- transfer orders
- packing lists
- signature images

## API Summary

Main API groups:
- `/api/products`
- `/api/orders`
- `/api/purchase-orders`
- `/api/transfer-orders`
- `/api/suppliers`
- `/api/warehouses`
- `/api/users`

Health endpoint:
- `/healthz`

## Repositories

GitHub repositories used during development:
- [Earl18/Lumiere-Neon](https://github.com/Earl18/Lumiere-Neon)
- [angelooodev/inventory-supply-chain](https://github.com/angelooodev/inventory-supply-chain)
