const express = require('express');
const { db, auth } = require('../firebase');
const mockData = require('../mockData');

const router = express.Router();

// GET all users
router.get('/', async (req, res) => {
  if (!db) {
    return res.json(mockData.users || []);
  }
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    res.json(items);
  } catch (error) {
    console.error(`Error fetching users:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single user
router.get('/:id', async (req, res) => {
  if (!db) {
    const item = (mockData.users || []).find(i => i.id === req.params.id);
    return res.json(item || null);
  }
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) {
      return res.json(null);
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error(`Error fetching user by ID:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new user
router.post('/', async (req, res) => {
  if (!db || !auth) {
    const data = { id: `MOCK-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
    if (!mockData.users) mockData.users = [];
    mockData.users.push(data);
    return res.status(201).json(data);
  }
  try {
    const { email, password, name, mobile, designation } = req.body;
    
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Save user data to Firestore (without password)
    const data = { 
      email, 
      name, 
      mobile, 
      designation, 
      createdAt: new Date().toISOString() 
    };
    
    await db.collection('users').doc(userRecord.uid).set(data);
    
    res.status(201).json({ id: userRecord.uid, ...data });
  } catch (error) {
    console.error(`Error creating user:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  if (!db) {
    const index = (mockData.users || []).findIndex(i => i.id === req.params.id);
    if (index > -1) {
      const { password, ...rest } = req.body;
      mockData.users[index] = { ...mockData.users[index], ...rest, id: req.params.id };
      return res.json(mockData.users[index]);
    }
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const data = { ...req.body };
    const newPassword = data.password;
    delete data.id; 
    delete data.password; // Don't save password to Firestore
    
    // Update in Firestore
    await db.collection('users').doc(req.params.id).update(data);
    
    // Update in Auth if email, name, or password changed
    if (auth && (data.email || data.name || newPassword)) {
      const updateParams = {};
      if (data.email) updateParams.email = data.email;
      if (data.name) updateParams.displayName = data.name;
      if (newPassword) updateParams.password = newPassword;
      try {
        await auth.updateUser(req.params.id, updateParams);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          console.warn(`User ${req.params.id} not found in Auth, skipping Auth update.`);
        } else {
          throw authError;
        }
      }
    }
    
    res.json({ id: req.params.id, ...data });
  } catch (error) {
    console.error(`Error updating user:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  if (!db || !auth) {
    mockData.users = (mockData.users || []).filter(i => i.id !== req.params.id);
    return res.json({ message: 'Deleted successfully' });
  }
  try {
    // Delete from Firebase Auth (ignore if not found)
    try {
      await auth.deleteUser(req.params.id);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.warn(`User ${req.params.id} not found in Auth, but proceeding to delete from Firestore.`);
      } else {
        throw authError; // Re-throw other errors
      }
    }
    
    // Delete from Firestore
    await db.collection('users').doc(req.params.id).delete();
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error(`Error deleting user:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
