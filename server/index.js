const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

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
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin initialized successfully.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn('Firebase Admin not initialized: Missing FIREBASE_PROJECT_ID environment variable.');
}

const { listenContactFormLeads } = require('./leadAutomation');

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for general documents
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = `uploads/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });

    const encodedName = encodeURIComponent(fileName);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedName}?alt=media`;

    res.json({ url: publicUrl, filename: req.file.originalname, size: req.file.size });
  } catch (err) {
    console.error("Upload error full detail:", err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// Module CRUD routes
const collections = [
  'customers', 'leads', 'quotations', 'orders', 'products',
  'artworks', 'productionJobs', 'inventory', 'suppliers',
  'purchaseOrders', 'grn', 'dispatches', 'invoices', 'categories',
  'contact form', 'contact_form', 'notifications', 'settings', 'job_posted',
  'application_received', 'custom_package', 'logs', 'tasks'
];

app.use('/api/users', usersRouter);

collections.forEach(collection => {
  app.use(`/api/${collection}`, createCrudRouter(collection));
});

const PORT = process.env.PORT || 5000;

listenContactFormLeads();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
