# Quick Start Guide

## Project Status: Ready for Vercel Deployment ✅

Your Mukesh Graphics ERP project has been consolidated into a single folder structure optimized for Vercel deployment.

## What Changed?

### ✅ Consolidated Structure
- **Moved**: Server code → `api/` folder (Vercel Serverless Functions)
- **Kept**: React frontend at root (`src/`, `public/`)
- **Merged**: All dependencies into single `package.json`
- **Created**: Vercel configuration (`vercel.json`)

### ✅ New Files Created
```
api/
├── lib/
│   ├── firebase.js      # Firebase initialization
│   ├── cors.js          # CORS handling
│   └── mockData.js      # Mock data
├── [collection]/        # Dynamic API routes
├── dashboard/           # Dashboard endpoints
├── users/              # User management
├── health.js           # Health check
└── upload.js           # File upload handler
```

### ✅ Configuration Files
- `vercel.json` - Vercel deployment config
- `vite.config.js` - Build configuration
- `tailwind.config.js` - Styling
- `postcss.config.js` - PostCSS config
- `.env.example` - Environment variables template
- `.env.local` - Local development variables
- `DEPLOYMENT.md` - Full deployment guide

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Local Environment
Copy `.env.example` to `.env` and add your credentials:
```bash
cp .env.example .env
# Edit .env with your Firebase and Cloudinary keys
```

### 3. Run Locally
```bash
npm run dev
```
This will start Vite on `http://localhost:5173`

## Deploy to Vercel

### Option 1: Via CLI
```bash
npm i -g vercel  # Install Vercel CLI once
vercel           # Deploy from project root
```

### Option 2: Via GitHub
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Add environment variables in Vercel dashboard
5. Deploy!

### Required Environment Variables (in Vercel)
Set these in Vercel Project Settings → Environment Variables:

**Firebase (Admin SDK - for API)**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**Firebase (Client - for Frontend)**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Cloudinary (Image Upload)**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**API Configuration**
- `VITE_API_BASE_URL=/api` (Important!)
- `NODE_ENV=production`

## API Routes

All API endpoints are now serverless functions at `/api`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/:collection` | GET | Get all items |
| `/api/:collection` | POST | Create item |
| `/api/:collection/:id` | GET | Get single item |
| `/api/:collection/:id` | PUT | Update item |
| `/api/:collection/:id` | DELETE | Delete item |
| `/api/dashboard/kpi` | GET | Dashboard metrics |
| `/api/users` | GET/POST | User management |
| `/api/upload` | POST | Upload files |
| `/api/health` | GET | API status |

## Performance Benefits

✅ **Reduced Load Time**: API and frontend on same domain (no CORS delay)  
✅ **Auto Scaling**: Vercel handles traffic spikes automatically  
✅ **Global CDN**: Assets cached at edge locations worldwide  
✅ **Zero Downtime**: Automatic deployments with rollback  
✅ **Free HTTPS**: SSL/TLS by default  

## Troubleshooting

**API returning 404?**
- Check `VITE_API_BASE_URL=/api` in environment
- Verify API files are in `api/` folder

**Image uploads failing?**
- Verify Cloudinary credentials are correct
- Check file size limits (max 10MB)

**Frontend not loading?**
- Check build output: `npm run build`
- Verify `index.html` exists at root

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Next Steps

1. ✅ Set up environment variables
2. ✅ Test locally: `npm run dev`
3. ✅ Build: `npm run build`
4. ✅ Deploy to Vercel
5. ✅ Monitor at vercel.com/dashboard

**Your project is now ready for production deployment!** 🚀

---

Need help? Check [DEPLOYMENT.md](./DEPLOYMENT.md) for complete documentation.
