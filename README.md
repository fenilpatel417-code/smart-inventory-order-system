# Smart Inventory and Order Management System

A production-ready, full-stack MERN (MongoDB, Express.js, React 18, Node.js) web application engineered for small businesses, shops, wholesalers, and retail distributors.

---

## 🌟 Key Features

### 1. Inventory & Catalog Management
- **Full Product CRUD**: Manage SKU, name, category, supplier, retail price, cost price, stock quantity, and reorder levels.
- **Stock Adjustments & Audit Trails**: Adjust stock upwards or downwards with mandatory audit reasons, automatically logged into immutable `StockMovement` records.
- **Search, Filter & Sort**: Search across product names and SKUs using MongoDB text indexing. Filter by category, supplier, and stock status (`In Stock`, `Low Stock`, `Out of Stock`).
- **CSV Data Exchange**: Export full inventory records to CSV and bulk-import products via CSV upload.

### 2. Role-Based Access Control (RBAC)
- **Admin**: Complete system access. Manages users, roles, categories, suppliers, orders, inventory valuation, financial KPIs, and executive reports.
- **Staff**: Operational access. Can view products, place customer orders, record stock adjustments, and receive purchase orders. Blocked from viewing revenue/profits, deleting records, or managing staff accounts.
- **Dual-Token Authentication**: Stateless short-lived JWT access tokens paired with rotating `httpOnly` refresh tokens, secured against XSS and CSRF.

### 3. Atomic Order Fulfillment & Stock Safety
- **Order Processing Pipeline**: Step-by-step workflow: `Pending -> Confirmed -> Packed -> Shipped -> Delivered` (or `Cancelled`).
- **Atomic Transactions**: Stock deduction is applied atomically upon confirmation and restored atomically upon cancellation via MongoDB sessions/transactions, guaranteeing no negative stock or double deductions.
- **Visual Order Tracking**: Interactive step-by-step order progression timeline with event timestamps and status history notes.
- **PDF Invoices**: Dynamically generate and download professional PDF tax invoices per order using PDFKit.

### 4. Supplier Management & Purchase Orders
- **Supplier Directory**: Manage vendor details, email contacts, phone numbers, and physical addresses.
- **Procurement Workflow**: Issue Purchase Orders (`PO-...`) with multiple line items directly to suppliers.
- **1-Click Low-Stock POs**: Generate pre-filled purchase orders directly from low-stock dashboard alert items.
- **Automated Inventory Intake**: Marking a PO as `Received` automatically updates product quantities and logs audit movements.

### 5. Low-Stock Intelligence & Background Jobs
- **Threshold Detection**: Flags any item whose quantity falls at or below its configurable `reorderLevel`.
- **In-App Notifications**: Real-time notification center with unread counters and 1-click "Mark All as Read".
- **Daily Automated Cron Job**: Powered by `node-cron`, runs daily stock scans and automatically generates admin digest alerts and email notifications (via Nodemailer).

### 6. Sales Analytics & Executive Reports
- **Real-Time KPIs**: Total Revenue, Gross Profit, Profit Margins, Orders This Month, Pending Orders, and Low Stock counts.
- **Visual Dashboards**: Powered by Recharts:
  - 30-Day Revenue & Profit Area Chart
  - Sales by Category Donut Chart
  - Top 5 Best-Selling Products Bar Chart
  - Order Status Distribution Pie Chart
- **Exportable Reports**: Date-filtered Sales, Inventory Valuation (Cost vs Retail), Low-Stock Audit, and Supplier Purchasing reports with instant CSV and PDF downloads.

### 7. Interactive API Documentation
- Full OpenAPI 3.0 specification served directly at `/api-docs` via Swagger UI.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Database** | MongoDB 6.0+, Mongoose ODM 8.5 (Indexes, Text Search, Aggregations, Sessions) |
| **Backend** | Node.js 20+, Express.js 4.19 (MVC Architecture: Routes, Controllers, Services, Validators) |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4, Heroicons, Recharts, Axios |
| **Auth & Security** | JWT (Access + httpOnly Refresh Token), bcryptjs, Helmet, CORS, Mongo-Sanitize, Rate-Limiting |
| **Tooling & Extras** | PDFKit (PDF Invoices & Reports), json2csv (Data Exports), Nodemailer, node-cron, Multer, Swagger UI |
| **Testing** | Jest 29, Supertest 7 (30 end-to-end integration tests across 5 suites) |

---

## 🏗️ Project Architecture

```
smart-inventory/
├── server/
│   ├── src/
│   │   ├── config/          # MongoDB connection, Swagger YAML
│   │   ├── controllers/     # Route request handlers
│   │   ├── jobs/            # node-cron stock checker scheduler
│   │   ├── middleware/      # verifyToken, authorize, errorHandler, rateLimiter, validate
│   │   ├── models/          # 9 Mongoose schemas (User, Product, Order, PO, etc.)
│   │   ├── routes/          # Express API route groups (/api/v1/*)
│   │   ├── services/        # Business logic & MongoDB aggregation pipelines
│   │   ├── utils/           # JWT helper, email, pdfGenerator, transaction runner
│   │   ├── validators/      # express-validator schemas
│   │   ├── app.js           # Express app setup and middleware pipeline
│   │   └── server.js        # Server listener and shutdown handlers
│   ├── tests/               # 5 Jest integration test suites
│   ├── seed.js              # Comprehensive demo database seeder
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/             # Axios instance with interceptors and refresh queuing
│   │   ├── components/      # UI components (Navbar, Sidebar, Modals, ProtectedRoute)
│   │   ├── context/         # AuthContext & ThemeContext
│   │   ├── layouts/         # DashboardLayout with collapsible navigation
│   │   ├── pages/           # Dashboard, Products, Orders, Reports, Suppliers, etc.
│   │   └── App.jsx          # Route declarations
│   ├── index.html
│   ├── vite.config.js       # Vite configuration with API reverse proxy
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **MongoDB**: v6.0 or higher running locally at `mongodb://127.0.0.1:27017` (or MongoDB Atlas connection string)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd server

# Install dependencies
npm install

# Configure environment variables (a pre-configured .env is provided)
cp .env.example .env

# Seed database with realistic demo data (35+ products, 5 suppliers, 10 customers, 48 orders)
npm run seed

# Run automated tests
npm test

# Start the server (runs on http://localhost:5000)
npm run dev
```

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd client

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start development server (runs on http://localhost:5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Admin** | `admin@smartinventory.com` | `Admin123!` | Full access: User management, Financial KPIs, Executive Reports, Record deletions |
| **Staff** | `staff@smartinventory.com` | `Staff123!` | Operational access: Products, Orders, Stock Adjustments, PO receiving |

*Quick login buttons are available directly on the login page for instant 1-click access.*

---

## 📡 REST API Reference

All API routes are prefixed under `/api/v1`. Interactive documentation is available at `http://localhost:5000/api-docs`.

### Authentication & Users
- `POST /api/v1/auth/login` - User login (returns access token & sets refresh cookie)
- `POST /api/v1/auth/refresh-token` - Rotate refresh token & issue new access token
- `POST /api/v1/auth/logout` - Clear refresh cookie and invalidate session
- `GET /api/v1/auth/me` - Get current authenticated user profile
- `PUT /api/v1/auth/profile` - Update profile information
- `PUT /api/v1/auth/change-password` - Change account password
- `GET /api/v1/users` - List all users (Admin only)
- `POST /api/v1/users` - Create new user account (Admin only)
- `PUT /api/v1/users/:id` - Update user role or active status (Admin only)

### Products & Inventory
- `GET /api/v1/products` - Filter, search, sort, and paginate product catalog
- `POST /api/v1/products` - Create new product (Admin only)
- `GET /api/v1/products/:id` - Get single product details
- `PUT /api/v1/products/:id` - Update product information (Admin only)
- `DELETE /api/v1/products/:id` - Delete product (Admin only)
- `POST /api/v1/products/:id/adjust-stock` - Adjust quantity and record StockMovement (Admin & Staff)
- `GET /api/v1/products/export/csv` - Download catalog as CSV
- `POST /api/v1/products/import/csv` - Upload and bulk import products from CSV

### Categories & Suppliers
- `GET /api/v1/categories` - List categories with active product counts
- `POST /api/v1/categories` - Create new product category (Admin only)
- `PUT /api/v1/categories/:id` - Edit category (Admin only)
- `DELETE /api/v1/categories/:id` - Delete category (Admin only)
- `GET /api/v1/suppliers` - List suppliers
- `POST /api/v1/suppliers` - Register new supplier (Admin only)
- `GET /api/v1/suppliers/:id` - Supplier profile with linked products & purchase orders
- `PUT /api/v1/suppliers/:id` - Update supplier details (Admin only)
- `DELETE /api/v1/suppliers/:id` - Delete supplier (Admin only)

### Orders & Customers
- `GET /api/v1/orders` - List customer orders with status filters and pagination
- `POST /api/v1/orders` - Place new customer order with line items & stock verification
- `GET /api/v1/orders/:id` - Order details with status history timeline
- `PUT /api/v1/orders/:id/status` - Transition status (Pending -> Confirmed -> Packed -> Shipped -> Delivered / Cancelled)
- `GET /api/v1/orders/:id/invoice` - Stream downloadable PDF tax invoice
- `GET /api/v1/customers` - List customers with order metrics
- `POST /api/v1/customers` - Create customer record
- `GET /api/v1/customers/:id` - Customer profile with lifetime spend and order history

### Procurement & Alerts
- `GET /api/v1/purchase-orders` - List purchase orders
- `POST /api/v1/purchase-orders` - Issue purchase order to supplier
- `GET /api/v1/purchase-orders/:id` - View purchase order line items
- `PUT /api/v1/purchase-orders/:id/receive` - Mark received and auto-increment product inventory
- `GET /api/v1/stock-movements` - View immutable stock audit log
- `GET /api/v1/notifications` - Retrieve in-app alerts and unread count
- `PUT /api/v1/notifications/mark-read` - Mark all notifications as read

### Analytics & Reports
- `GET /api/v1/dashboard/kpis` - Revenue, Profit, Margins, Orders, and Stock Counts
- `GET /api/v1/dashboard/charts` - 30-day sales trend, category share, and top products
- `GET /api/v1/dashboard/low-stock` - Low stock and out-of-stock items needing attention
- `GET /api/v1/reports/sales` - Sales report by date range (JSON / CSV / PDF)
- `GET /api/v1/reports/inventory-valuation` - Valuation report comparing cost vs retail (JSON / CSV / PDF)
- `GET /api/v1/reports/low-stock` - Low-stock risk audit (JSON / CSV / PDF)
- `GET /api/v1/reports/suppliers` - Vendor spend and procurement performance (JSON / CSV / PDF)

---

## 🧪 Test Suite

The test suite covers authentication, RBAC boundaries, atomic order confirmation/cancellation, purchase order stock intake, and aggregation reporting.

```bash
cd server
npm test
```

### Verified Test Results:
- **`tests/auth.test.js`**: Registration, login, JWT issuance, profile access, and Staff 403 checks.
- **`tests/inventory.test.js`**: Category/Supplier creation, product CRUD, duplicate SKU rejection, manual stock adjustments, CSV streaming, and staff deletion prevention.
- **`tests/orders.test.js`**: Customer creation, order auto-calculation, atomic stock deduction, transition validation, cancellation stock restoration, and PDF invoice generation.
- **`tests/purchaseOrdersAndAlerts.test.js`**: PO placement, PO receipt with automatic inventory intake, notifications API, and `stockCheckerJob` threshold alert scanning.
- **`tests/analyticsAndReports.test.js`**: Admin financial KPIs vs Staff redacted KPIs, Recharts data aggregation pipelines, sales reporting, and inventory valuation calculations.

---

## 🛡️ Security & Integrity Highlights

1. **Atomic Transactions**: All order confirmation and cancellation flows execute in managed transactions, preventing race conditions or inconsistent inventory.
2. **Double Index Guard**: SKU uniqueness is enforced at both application validation and MongoDB index levels.
3. **Defense in Depth**: Every protected route enforces JWT authentication followed by role authorization. Financial and managerial endpoints are strictly prohibited to staff at both API and UI layers.
4. **Sanitization & Protection**: Input sanitization prevents NoSQL query injection; helmet applies secure HTTP headers; express-rate-limit prevents brute force attacks on authentication routes.

---

## 📄 License
ISC License. Built for small businesses, shops, and wholesalers.
