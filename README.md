# Mukesh Graphics ERP

A modern, full-stack Enterprise Resource Planning (ERP) dashboard tailored for B2B printing and packaging operations. This system provides a unified interface for managing customers, orders, inventory, production, artworks, and more.

**🚀 NOW OPTIMIZED FOR VERCEL DEPLOYMENT** - Single repository structure with serverless API functions and static frontend hosting.

## 🚀 Features

- **Real-time Dashboard**: Interactive KPI metrics and visually rich charts (Orders, Revenue, Dispatches).
- **Customer & Supplier Directory**: Manage B2B clients, outstanding ledgers, and suppliers.
- **Comprehensive Modules**: Scalable backend and frontend architecture for:
  - **Quotations & Orders**: Seamlessly convert quotes to live orders.
  - **Products & Materials**: Maintain a catalog of custom packaging products and raw materials.
  - **Purchase & GRN**: Create and track purchase orders with suppliers.
  - **Production Jobs**: Track jobs through prepress, printing, and post-press.
  - **Dispatch**: Manage logistics, vehicles, drivers, and tracking statuses.
  - **Accounts & Payments**: Issue invoices, track GST, handle overdue payments, and customer ledgers.
- **Clean UI**: A pixel-perfect, premium dashboard interface heavily optimized for desktop workflows.

## 💻 Tech Stack

**Frontend (Client):**
- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) (Icons)
- [Recharts](https://recharts.org/) (Data Visualization)
- [SheetJS / xlsx](https://sheetjs.com/) (Excel Exporting)

**Backend (Server) - Now Serverless:**
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) (converted to serverless handlers)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) (Firestore Database)
- [Cloudinary](https://cloudinary.com/) (Image Hosting & Optimization)

---

## 📦 Project Structure (Vercel-Ready)

```
project-root/
├── api/                          # 🔵 Vercel Serverless Functions
│   ├── lib/
│   │   ├── firebase.js          # Firebase Admin SDK initialization
│   │   ├── cors.js              # CORS middleware
│   │   └── mockData.js          # Fallback mock data
│   ├── [collection]/            # Dynamic collection endpoints
│   │   ├── index.js             # GET all, POST new
│   │   └── [id].js              # GET one, PUT, DELETE
│   ├── dashboard/               # Dashboard endpoints
│   ├── users/                   # User management
│   ├── health.js                # Health check
│   └── upload.js                # File upload handler
├── src/                         # 🔴 React Frontend
│   ├── components/
│   ├── pages/
│   ├── lib/
│   │   └── api.js              # API client
│   ├── contexts/
│   ├── App.jsx
│   └── main.jsx
├── public/                      # Static assets
├── package.json                 # Unified dependencies
├── vercel.json                  # Vercel configuration
├── vite.config.js              # Build configuration
├── index.html                   # HTML entry point
└── ...config files
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Firebase project with Firestore
- Cloudinary account (for image uploads)

### 2. Clone & Install
```bash
git clone <repository-url>
cd Mukesh_Graphics_Erp
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your Firebase and Cloudinary credentials
```

### 4. Local Development
```bash
npm run dev
```
Opens at `http://localhost:5173`

### 5. Deploy to Vercel
See [QUICKSTART.md](./QUICKSTART.md) or [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[FILE_GUIDE.md](./FILE_GUIDE.md)** - Complete file guide and what to read