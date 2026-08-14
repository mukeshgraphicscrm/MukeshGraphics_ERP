const express = require('express');
const { db } = require('../firebase');
const mockData = require('../mockData');
const { syncContactFormLeads, isContactFormCollection } = require('../leadAutomation');

// Factory function to create basic CRUD routes for a given collection
const createCrudRouter = (collectionName) => {
  const router = express.Router();

  // GET all items
  router.get('/', async (req, res) => {
    if (!db) {
      // Fallback to mock data
      return res.json(mockData[collectionName] || []);
    }
    try {
      const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      res.json(items);
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET single item
  router.get('/:id', async (req, res) => {
    if (!db) {
      const item = (mockData[collectionName] || []).find(i => i.id === req.params.id);
      return item ? res.json(item) : res.status(404).json({ error: 'Not found' });
    }
    try {
      const doc = await db.collection(collectionName).doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      console.error(`Error fetching ${collectionName} by ID:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST new item
  router.post('/', async (req, res) => {
    if (!db) {
      const data = { id: `MOCK-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
      if (!mockData[collectionName]) mockData[collectionName] = [];
      mockData[collectionName].push(data);
      return res.status(201).json(data);
    }
    try {
      const data = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection(collectionName).add(data);

      if (isContactFormCollection(collectionName)) {
        await syncContactFormLeads();
      }

      res.status(201).json({ id: docRef.id, ...data });
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT update item
  router.put('/:id', async (req, res) => {
    if (!db) {
      const index = (mockData[collectionName] || []).findIndex(i => i.id === req.params.id);
      if (index > -1) {
        mockData[collectionName][index] = { ...mockData[collectionName][index], ...req.body, id: req.params.id };
        return res.json(mockData[collectionName][index]);
      }
      return res.status(404).json({ error: 'Not found' });
    }
    try {
      const data = req.body;
      delete data.id; // Prevent updating the ID
      await db.collection(collectionName).doc(req.params.id).update(data);
      res.json({ id: req.params.id, ...data });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE item
  router.delete('/:id', async (req, res) => {
    if (!db) {
      mockData[collectionName] = (mockData[collectionName] || []).filter(i => i.id !== req.params.id);
      return res.json({ message: 'Deleted successfully' });
    }
    try {
      await db.collection(collectionName).doc(req.params.id).delete();
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = createCrudRouter;
