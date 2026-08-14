const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const { initializeApp, cert, getApps } = require('firebase-admin/app');

// Initialize Firebase Admin (Only if env vars are present)
if (process.env.FIREBASE_PROJECT_ID) {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn('Firebase Admin not initialized: Missing FIREBASE_PROJECT_ID environment variable.');
}

const { syncContactFormLeads } = require('./leadAutomation');

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mukesh Graphics ERP API is running.' });
});

// Import routers
const createCrudRouter = require('./routes/crud');
const dashboardRouter = require('./routes/dashboard');
const usersRouter = require('./routes/users');

// Dashboard metrics
app.use('/api/dashboard', dashboardRouter);

// Set up static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim()
});

// Configure Multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mukesh-graphics-erp',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});
const upload = multer({ storage: storage });

// File upload endpoint
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err) {
      console.error("Upload error full detail:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      return res.status(500).json({ error: err.message || JSON.stringify(err) });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Cloudinary returns the full URL in req.file.path
    res.json({ url: req.file.path, filename: req.file.originalname });
  });
});

// Module CRUD routes
const collections = [
  'customers', 'leads', 'quotations', 'orders', 'products',
  'artworks', 'productionJobs', 'inventory', 'suppliers',
  'purchaseOrders', 'grn', 'dispatches', 'invoices', 'categories',
  'contact form', 'contact_form'
];

app.use('/api/users', usersRouter);

collections.forEach(collection => {
  app.use(`/api/${collection}`, createCrudRouter(collection));
});

const PORT = process.env.PORT || 5000;

syncContactFormLeads().catch((error) => {
  console.error('Initial contact form sync failed:', error);
});

setInterval(() => {
  syncContactFormLeads().catch((error) => {
    console.error('Scheduled contact form sync failed:', error);
  });
}, 15000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
