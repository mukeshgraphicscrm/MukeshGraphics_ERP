const express = require('express');
const { db } = require('../firebase');
const mockData = require('../mockData');
const { syncContactFormLeads, isContactFormCollection } = require('../leadAutomation');

const addLog = async (collectionName, action, details, req, fullDetails = null) => {
  if (!db || collectionName === 'logs') return;
  try {
    const userName = req.headers['x-user-name'] || 'BHUPAT BHUT';
    const userRole = req.headers['x-user-role'] || 'Administrator';
    
    const logEntry = {
      action,
      module: collectionName,
      details,
      userName,
      userRole,
      createdAt: new Date().toISOString()
    };
    
    if (fullDetails) {
      logEntry.fullDetails = fullDetails;
    }
    
    await db.collection('logs').add(logEntry);
  } catch (e) {
    console.error('Failed to write log', e);
  }
};

const getRecordName = (data) => {
  if (!data) return '';
  return data.name || data.title || data.companyName || data.customerName || data.productName || data.orderNumber || data.invoiceNumber || data.jobName || data.material || data.id || '';
};

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
      let queryRef = db.collection(collectionName);
      
      let hasFilters = false;
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'sort' && key !== 'order' && key !== 'limit') {
          queryRef = queryRef.where(key, '==', value);
          hasFilters = true;
        }
      }

      // If we use where() on one field and orderBy() on a different field, 
      // Firestore requires a composite index. To avoid errors, skip orderBy if filtering.
      if (!hasFilters) {
        const sortField = collectionName === 'application_received' ? 'appliedAt' : 'createdAt';
        queryRef = queryRef.orderBy(sortField, 'desc');
      }

      const snapshot = await queryRef.get();
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
      
      if (collectionName === 'orders' && data.orderNo && data.orderNo.startsWith('ORD-')) {
        try {
          const snapshot = await db.collection(collectionName).get();
          let maxNum = 0;
          snapshot.forEach(doc => {
            const numPart = doc.data().orderNo?.split('-')[1];
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          });
          data.orderNo = `ORD-${String(maxNum + 1).padStart(3, '0')}`;
        } catch (e) {
          console.error("Error auto-incrementing orderNo", e);
        }
      }

      // Prevent duplicate Job Card Numbers in productionJobs
      if (collectionName === 'productionJobs' && data.jobCardNo) {
        const dupCheck = await db.collection(collectionName)
          .where('jobCardNo', '==', String(data.jobCardNo).trim())
          .limit(1)
          .get();
        if (!dupCheck.empty) {
          return res.status(409).json({ error: `Job Card No. "${data.jobCardNo}" already exists. Please use a different number.` });
        }
      }

      const docRef = await db.collection(collectionName).add(data);

      if (isContactFormCollection(collectionName)) {
        await syncContactFormLeads();
      }

      const recordName = getRecordName(data);
      const detailStr = recordName ? `Created "${recordName}" in ${collectionName}` : `Created a new record in ${collectionName}`;
      await addLog(collectionName, 'Create', detailStr, req, data);

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
      delete data.id;        // Prevent updating the ID
      delete data.createdAt; // Prevent overwriting the original creation date
      
      const oldDoc = await db.collection(collectionName).doc(req.params.id).get();
      const oldData = oldDoc.exists ? oldDoc.data() : {};
      
      await db.collection(collectionName).doc(req.params.id).update(data);
      const updatedDoc = await db.collection(collectionName).doc(req.params.id).get();
      const newData = updatedDoc.data();
      
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
      const detailStr = recordName ? `Updated "${recordName}" in ${collectionName}` : `Updated a record in ${collectionName}`;
      await addLog(collectionName, 'Update', detailStr, req, Object.keys(changes).length > 0 ? changes : data);
      
      res.json({ id: updatedDoc.id, ...newData });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE all items (only allowed for logs)
  router.delete('/', async (req, res) => {
    if (collectionName !== 'logs') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!db) {
      mockData[collectionName] = [];
      return res.json({ message: 'All logs deleted successfully' });
    }
    try {
      const snapshot = await db.collection(collectionName).get();
      const batches = [];
      let batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        if (count === 490) {
          batches.push(batch.commit());
          batch = db.batch();
          count = 0;
        }
      });
      
      if (count > 0) {
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      res.json({ message: 'All logs deleted successfully' });
    } catch (error) {
      console.error(`Error deleting all ${collectionName}:`, error);
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
      const doc = await db.collection(collectionName).doc(req.params.id).get();
      const recordName = doc.exists ? getRecordName(doc.data()) : '';
      
      await db.collection(collectionName).doc(req.params.id).delete();
      
      const detailStr = recordName ? `Deleted "${recordName}" from ${collectionName}` : `Deleted a record from ${collectionName}`;
      await addLog(collectionName, 'Delete', detailStr, req, doc.exists ? doc.data() : null);
      
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = createCrudRouter;
