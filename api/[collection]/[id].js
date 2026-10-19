import { getDb } from '../lib/firebase.js';
import mockData from '../lib/mockData.js';
import { handleCors } from '../lib/cors.js';
import { addLog, getRecordName } from '../lib/logger.js';

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

      const oldDoc = await db.collection(collection).doc(id).get();
      const oldData = oldDoc.exists ? oldDoc.data() : {};

      const data = { ...req.body };
      delete data.id;
      delete data.createdAt; // Prevent overwriting original creation date
      await db.collection(collection).doc(id).update(data);
      const updatedDoc = await db.collection(collection).doc(id).get();
      const newData = updatedDoc.data();

      if (collection !== 'logs') {
        const changes = {};
        for (const key in data) {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(data[key])) {
            changes[key] = {
              from: oldData[key] !== undefined ? oldData[key] : '',
              to: data[key] !== undefined ? data[key] : ''
            };
          }
        }
        const recordName = getRecordName(newData);
        const detailStr = recordName ? `Updated "${recordName}" in ${collection}` : `Updated a record in ${collection}`;
        await addLog(db, collection, 'Update', detailStr, req, Object.keys(changes).length > 0 ? changes : data);
      }

      res.json({ id, ...newData });
    }
    else if (req.method === 'DELETE') {
      if (!db) {
        mockData[collection] = (mockData[collection] || []).filter(i => i.id !== id);
        return res.json({ message: 'Deleted successfully' });
      }

      const doc = await db.collection(collection).doc(id).get();
      const recordName = doc.exists ? getRecordName(doc.data()) : '';

      await db.collection(collection).doc(id).delete();

      if (collection !== 'logs') {
        const detailStr = recordName ? `Deleted "${recordName}" from ${collection}` : `Deleted a record from ${collection}`;
        await addLog(db, collection, 'Delete', detailStr, req, doc.exists ? doc.data() : null);
      }

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

