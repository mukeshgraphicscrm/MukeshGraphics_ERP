import { getDb, getAuth } from '../lib/firebase.js';
import mockData from '../lib/mockData.js';
import { handleCors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  const db = getDb();
  const auth = getAuth();

  try {
    if (req.method === 'GET') {
      if (!db) {
        const item = (mockData.users || []).find(i => i.id === id);
        return res.json(item || null);
      }

      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) {
        return res.json(null);
      }
      res.json({ id: doc.id, ...doc.data() });
    }
    else if (req.method === 'PUT') {
      if (!db) {
        const index = (mockData.users || []).findIndex(i => i.id === id);
        if (index > -1) {
          const { password, ...rest } = req.body;
          mockData.users[index] = { ...mockData.users[index], ...rest, id };
          return res.json(mockData.users[index]);
        }
        return res.status(404).json({ error: 'Not found' });
      }

      const data = { ...req.body };
      const newPassword = data.password;
      delete data.id;
      delete data.password;

      await db.collection('users').doc(id).update(data);

      if (auth && (data.email || data.name || newPassword)) {
        const updateParams = {};
        if (data.email) updateParams.email = data.email;
        if (data.name) updateParams.displayName = data.name;
        if (newPassword) updateParams.password = newPassword;
        try {
          await auth.updateUser(id, updateParams);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.warn(`User ${id} not found in Auth, skipping Auth update.`);
          } else {
            throw authError;
          }
        }
      }

      res.json({ id, ...data });
    }
    else if (req.method === 'DELETE') {
      if (!db || !auth) {
        mockData.users = (mockData.users || []).filter(i => i.id !== id);
        return res.json({ message: 'Deleted successfully' });
      }

      try {
        await auth.deleteUser(id);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          console.warn(`User ${id} not found in Auth, proceeding to delete from Firestore.`);
        } else {
          throw authError;
        }
      }

      await db.collection('users').doc(id).delete();
      res.json({ message: 'Deleted successfully' });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error handling user ${id}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
