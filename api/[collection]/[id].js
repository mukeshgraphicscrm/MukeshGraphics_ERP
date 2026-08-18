import { getDb } from '../lib/firebase.js';
import mockData from '../lib/mockData.js';
import { handleCors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { collection, id } = req.query;

  if (!collection || !id) {
    res.status(400).json({ error: 'Collection name and item ID are required' });
    return;
  }

  const db = getDb();

  try {
    if (req.method === 'GET') {
      if (!db) {
        const item = (mockData[collection] || []).find(i => i.id === id);
        return item ? res.json(item) : res.status(404).json({ error: 'Not found' });
      }

      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.json({ id: doc.id, ...doc.data() });
    }
    else if (req.method === 'PUT') {
      if (!db) {
        const index = (mockData[collection] || []).findIndex(i => i.id === id);
        if (index > -1) {
          mockData[collection][index] = { ...mockData[collection][index], ...req.body, id };
          return res.json(mockData[collection][index]);
        }
        return res.status(404).json({ error: 'Not found' });
      }

      const data = { ...req.body };
      delete data.id;
      await db.collection(collection).doc(id).update(data);
      const updatedDoc = await db.collection(collection).doc(id).get();
      res.json({ id, ...updatedDoc.data() });
    }
    else if (req.method === 'DELETE') {
      if (!db) {
        mockData[collection] = (mockData[collection] || []).filter(i => i.id !== id);
        return res.json({ message: 'Deleted successfully' });
      }

      await db.collection(collection).doc(id).delete();
      res.json({ message: 'Deleted successfully' });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error handling ${collection}/${id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
