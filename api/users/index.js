import { getDb, getAuth } from '../lib/firebase.js';
import mockData from '../lib/mockData.js';
import { handleCors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const db = getDb();
  const auth = getAuth();

  try {
    if (req.method === 'GET') {
      if (!db) {
        return res.json(mockData.users || []);
      }

      const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      res.json(items);
    }
    else if (req.method === 'POST') {
      if (!db || !auth) {
        const data = { id: `MOCK-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
        if (!mockData.users) mockData.users = [];
        mockData.users.push(data);
        return res.status(201).json(data);
      }

      const { email, password, name, mobile, designation } = req.body;

      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      const data = {
        email,
        name,
        mobile,
        designation,
        createdAt: new Date().toISOString()
      };

      await db.collection('users').doc(userRecord.uid).set(data);
      res.status(201).json({ id: userRecord.uid, ...data });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in users endpoint:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
