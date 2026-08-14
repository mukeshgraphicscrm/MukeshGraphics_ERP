const { db } = require('./firebase');

const CONTACT_FORM_COLLECTIONS = ['contact_form', 'contact form', 'contactForm', 'contactforms'];

const isContactFormCollection = (collectionName = '') =>
  CONTACT_FORM_COLLECTIONS.includes(collectionName) ||
  String(collectionName).toLowerCase().replace(/\s+/g, '_') === 'contact_form' ||
  String(collectionName).toLowerCase() === 'contact form';

const cleanString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const buildLeadPayloadFromContactForm = (data = {}) => {
  const company = cleanString(data.company || data.companyName || data.organization || data.businessName);
  const contactPerson = cleanString(data.name || data.contactPerson || data.contact_person || data.fullName);
  const city = cleanString(data.city || data.location || data.addressCity || '');
  const state = cleanString(data.state || data.region || data.stateName || '');
  const requirements = cleanString(
    data.requirements ||
    data.message ||
    data.notes ||
    data.productDetails ||
    data.product ||
    data.enquiry ||
    ''
  );

  return {
    company: company || 'Unknown Company',
    contactPerson: contactPerson || 'Unknown Contact',
    city,
    state,
    leadSource: 'Website',
    products: requirements,
    employee: '',
    stage: 'New Inquiry',
    lostReason: '',
    followUps: requirements ? [{ date: '', time: '', notes: requirements }] : [],
    email: cleanString(data.email || ''),
    phone: cleanString(data.phone || data.mobile || ''),
    createdAt: data.createdAt || new Date().toISOString(),
    sourceCollection: 'contact_form',
  };
};

const syncContactFormLeads = async () => {
  if (!db) return;

  const seen = new Set();

  for (const collectionName of CONTACT_FORM_COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).get();

      for (const doc of snapshot.docs) {
        const key = `${collectionName}:${doc.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const data = doc.data() || {};
        const alreadyMarked = Boolean(data.autoLeadCreated || data.leadId);

        if (alreadyMarked) continue;

        const leadPayload = buildLeadPayloadFromContactForm(data);

        const existingLeadSnapshot = await db.collection('leads')
          .where('company', '==', leadPayload.company)
          .where('contactPerson', '==', leadPayload.contactPerson)
          .limit(1)
          .get();

        if (!existingLeadSnapshot.empty) {
          const existingLeadDoc = existingLeadSnapshot.docs[0];
          await doc.ref.update({
            autoLeadCreated: true,
            leadId: existingLeadDoc.id,
            leadSource: 'Website',
            stage: 'New Inquiry',
          });
          continue;
        }

        const leadRef = await db.collection('leads').add({
          ...leadPayload,
          createdAt: new Date().toISOString(),
        });

        await doc.ref.update({
          autoLeadCreated: true,
          leadId: leadRef.id,
          leadSource: 'Website',
          stage: 'New Inquiry',
        });
      }
    } catch (error) {
      console.error(`Error syncing contact form collection: ${collectionName}`, error);
    }
  }
};

module.exports = {
  CONTACT_FORM_COLLECTIONS,
  isContactFormCollection,
  buildLeadPayloadFromContactForm,
  syncContactFormLeads,
};
