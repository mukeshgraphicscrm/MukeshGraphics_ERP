import multer from 'multer';
import { handleCors } from './lib/cors.js';
import { getStorage } from './lib/firebase.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for general documents
});

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    upload.single('file')(req, res, async function (err) {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: err.message || 'Upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const storage = getStorage();
      if (!storage) {
         return res.status(500).json({ error: 'Firebase Storage is not initialized' });
      }

      const bucket = storage.bucket();
      const fileName = `uploads/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);
      
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype }
      });
      
      const encodedName = encodeURIComponent(fileName);
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedName}?alt=media`;

      res.json({
        url: publicUrl,
        filename: req.file.originalname,
        size: req.file.size
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
