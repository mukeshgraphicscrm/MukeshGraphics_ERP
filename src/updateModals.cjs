const fs = require('fs');
const files = fs.readdirSync('c:/Internship DZ Infotech/Mukesh Graphics Erp/client/src/components').filter(f => f.endsWith('Modal.jsx') || f.endsWith('Modal.tsx'));

files.forEach(f => {
  const filePath = 'c:/Internship DZ Infotech/Mukesh Graphics Erp/client/src/components/' + f;
  let content = fs.readFileSync(filePath, 'utf8');
  
  let changed = false;
  
  // Pattern 1: standard backdrop
  const pattern1 = /<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black\/50 backdrop-blur-sm">/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>');
    changed = true;
  }
  
  // Pattern 2: simple backdrop
  const pattern2 = /<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, '<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>');
    changed = true;
  }

  // Pattern 3: ViewLeadModal style backdrop
  const pattern3 = /<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black\/50 backdrop-blur-sm">/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, '<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/50 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>');
    changed = true;
  }

  // Pattern 4: No blur backdrop
  const pattern4 = /<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black\/50">/g;
  if (pattern4.test(content)) {
    content = content.replace(pattern4, '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', f);
  }
});
