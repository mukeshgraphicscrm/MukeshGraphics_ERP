import { getDb } from '../lib/firebase.js';
import mockData from '../lib/mockData.js';
import { handleCors } from '../lib/cors.js';

const isContactFormCollection = (collectionName = '') => {
  const normalized = String(collectionName).toLowerCase().replace(/\s+/g, '_');
  return ['contact_form', 'contact form', 'contactform', 'contactforms'].includes(normalized) ||
    normalized === 'contact_form';
};

const syncContactFormLeads = async (db) => {
  if (!db) return;

  try {
    // Check both possible collection names used by external integrations
    const collectionsToSync = ['contact_form', 'contact form'];
    
    for (const collName of collectionsToSync) {
      const contactForms = await db.collection(collName).get();
      
      // Process documents sequentially to avoid race conditions
      for (const doc of contactForms.docs) {
        const form = doc.data();
        
        // Skip if this contact form has already been converted to a lead
        if (form.autoLeadCreated === true) continue;
        
        const company = String(form.company || form.companyName || form.organization || form.name || 'Unknown').trim();
        const contactPerson = String(form.name || form.contactPerson || form.fullName || 'Unknown').trim();
        
        const newLead = {
          company,
          contactPerson,
          city: String(form.city || '').trim(),
          state: String(form.state || '').trim(),
          leadSource: 'Website',
          products: String(form.requirements || form.message || form.notes || form.service || '').trim(),
          email: String(form.email || '').trim(),
          mobile: String(form.phone || form.mobile || '').trim(),
          stage: 'New Inquiry',
          createdAt: form.createdAt || new Date().toISOString(),
        };

        // 1. Create the lead in the leads collection
        const leadRef = await db.collection('leads').add(newLead);
        
        // 2. Mark the contact form as processed so it doesn't get duplicated
        await db.collection(collName).doc(doc.id).update({
          autoLeadCreated: true,
          leadId: leadRef.id
        });
      }
    }
  } catch (error) {
    console.error('Error syncing contact form leads:', error);
  }
};

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const { collection } = req.query;

  if (!collection) {
    res.status(400).json({ error: 'Collection name is required' });
    return;
  }

  const db = getDb();

  try {
    if (req.method === 'GET') {
      if (!db) {
        return res.json(mockData[collection] || []);
      }

      // Automatically sync external contact forms to leads when the leads page is loaded
      if (collection === 'leads') {
        await syncContactFormLeads(db);
      }

      const snapshot = await db.collection(collection).orderBy('createdAt', 'desc').get();
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      res.json(items);
    }
    else if (req.method === 'POST') {
      if (!db) {
        const data = { id: `MOCK-${Date.now()}`, ...req.body, createdAt: new Date().toISOString() };
        if (!mockData[collection]) mockData[collection] = [];
        mockData[collection].push(data);
        return res.status(201).json(data);
      }

      const data = { ...req.body, createdAt: new Date().toISOString() };
      let finalData = { ...data };

      // If it's a contact form, we create a lead immediately and mark it as processed
      if (isContactFormCollection(collection)) {
        const company = String(data.company || data.companyName || data.organization || data.name || 'Unknown').trim();
        const contactPerson = String(data.name || data.contactPerson || data.fullName || 'Unknown').trim();
        
        const newLead = {
          company,
          contactPerson,
          city: String(data.city || '').trim(),
          state: String(data.state || '').trim(),
          leadSource: 'Website',
          products: String(data.requirements || data.message || data.notes || data.service || '').trim(),
          email: String(data.email || '').trim(),
          mobile: String(data.phone || data.mobile || '').trim(),
          stage: 'New Inquiry',
          createdAt: data.createdAt,
        };
        
        const leadRef = await db.collection('leads').add(newLead);
        
        finalData = {
          ...finalData,
          autoLeadCreated: true,
          leadId: leadRef.id
        };
      }

      const docRef = await db.collection(collection).add(finalData);

      // Trigger a background sweep just in case there are missed ones from external direct DB writes
      if (collection === 'leads' || isContactFormCollection(collection)) {
        syncContactFormLeads(db).catch(console.error);
      }

      res.status(201).json({ id: docRef.id, ...finalData });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error in ${collection}:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
