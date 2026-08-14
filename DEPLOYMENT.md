# Mukesh Graphics ERP - Vercel Deployment Guide

## Project Structure Overview

This is a full-stack application consolidated into a single repository for Vercel deployment:

```
root/
├── api/                    # Serverless API functions (Vercel Functions)
│   ├── lib/               # Shared utilities
│   │   ├── firebase.js    # Firebase Admin SDK initialization
│   │   ├── cors.js        # CORS middleware
│   │   └── mockData.js    # Mock data for fallback
│   ├── [collection]/      # Dynamic collection routes
│   │   ├── index.js       # GET all, POST
│   │   └── [id].js        # GET single, PUT, DELETE
│   ├── dashboard/         # Dashboard routes
│   ├── users/             # User management routes
│   ├── health.js          # Health check endpoint
│   └── upload.js          # File upload endpoint
├── src/                   # React frontend
├── public/                # Static assets
├── package.json          # Root dependencies
├── vercel.json           # Vercel configuration
├── vite.config.js        # Vite build configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── index.html            # HTML entry point
```

## Before Deployment

### 1. Set Up Environment Variables

Create a `.env` file in the root directory with your Firebase and Cloudinary credentials:

```env
# Firebase Admin SDK Configuration (Required for API)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@projectname.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client Configuration (Required for Frontend)
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Cloudinary Configuration (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# API Configuration
VITE_API_BASE_URL=/api
NODE_ENV=production
```

### 2. Dependencies

All dependencies are already configured in `package.json`. Install locally:

```bash
npm install
```

### 3. Local Development

For local development with separate frontend and backend:

**Terminal 1 - Frontend:**
```bash
npm run dev
```
This will start Vite dev server on `http://localhost:5173`

**Terminal 2 - Backend (if needed):**
Create a separate server directory and run Express locally for testing.

## Deployment to Vercel

### Step 1: Prepare Your Repository

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: Consolidated ERP system for Vercel"
```

2. Push to GitHub/GitLab/Bitbucket:
```bash
git push -u origin main
```

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy from your project directory
vercel
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up / Log in
3. Click "New Project"
4. Import your Git repository
5. Configure project settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variables (found in project settings)

### Step 3: Configure Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

**Production Environment:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `VITE_API_BASE_URL=/api`
- `NODE_ENV=production`

### Step 4: Deploy!

Once environment variables are set, Vercel will automatically deploy. Your API will be available at:
- Frontend: `https://your-domain.vercel.app`
- API: `https://your-domain.vercel.app/api`

## API Endpoints

All API endpoints are now serverless functions:

### Collections (Dynamic)
- `GET /api/:collection` - Get all items
- `POST /api/:collection` - Create new item
- `GET /api/:collection/:id` - Get single item
- `PUT /api/:collection/:id` - Update item
- `DELETE /api/:collection/:id` - Delete item

### Dashboard
- `GET /api/dashboard/kpi` - Get dashboard KPI data

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### File Upload
- `POST /api/upload` - Upload file to Cloudinary

### Health Check
- `GET /api/health` - Check API status

## Troubleshooting

### Issue: API calls returning 404
- Ensure `VITE_API_BASE_URL=/api` is set in environment
- Check that API routes are defined in the `api/` folder
- Verify Firebase credentials are set

### Issue: Uploads not working
- Verify Cloudinary credentials are correct
- Check that `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set

### Issue: Firebase connection failing
- Ensure `FIREBASE_PRIVATE_KEY` is properly formatted with escaped newlines (`\n`)
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project
- Check that `FIREBASE_CLIENT_EMAIL` is from your service account

### Issue: Build failing
- Check that all dependencies are correctly listed in `package.json`
- Ensure `src/` folder contains all necessary React components
- Verify `vite.config.js` is correctly configured

## Performance Optimization

1. **Image Optimization**: Cloudinary automatically optimizes uploaded images
2. **Caching**: Vercel CDN caches static assets automatically
3. **Database Indexing**: Ensure Firestore has proper indexes for frequently queried fields
4. **API Response Compression**: Enabled by default on Vercel

## Security Considerations

1. **Never commit `.env` files** - Use Vercel Environment Variables instead
2. **Rotate API keys** regularly
3. **Enable Firebase Security Rules** to protect your database
4. **Use HTTPS only** (automatic on Vercel)
5. **Implement rate limiting** if needed for public endpoints

## Monitoring

Monitor your deployment with:
- Vercel Analytics and Monitoring
- Vercel Function Logs (in project dashboard)
- Cloudinary Analytics (for uploads)
- Firebase Console (for database usage)

## Support

For issues related to:
- **Vercel**: https://vercel.com/support
- **Firebase**: https://firebase.google.com/support
- **Cloudinary**: https://cloudinary.com/contact

---

**Last Updated**: 2024
**Status**: Production Ready ✅
