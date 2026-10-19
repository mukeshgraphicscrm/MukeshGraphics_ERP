export const getRecordName = (data) => {
  if (!data) return '';
  return data.name || data.title || data.companyName || data.customerName || data.productName || data.orderNumber || data.invoiceNumber || data.jobName || data.material || data.id || '';
};

export const addLog = async (db, collectionName, action, details, req, fullDetails = null) => {
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
    console.error('Failed to write log in serverless function:', e);
  }
};
