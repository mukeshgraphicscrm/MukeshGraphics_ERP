const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('Modal.jsx') || f.endsWith('Modal.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  
  content = content.replace(/<div className="fixed inset-0([^>]*?)"(?!\s*onMouseDown)(?!\s*onClick)(?!\s*onMouseUp)([^>]*)>/g, 
    '<div className="fixed inset-0$1" onMouseDown={(e) => { if (e.target === e.currentTarget && typeof onClose === "function") onClose(); }}$2>'
  );
  
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
});
