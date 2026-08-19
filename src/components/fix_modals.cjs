const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.').filter(f => f.endsWith('Modal.jsx') || f.endsWith('Modal.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;
  
  // Step 1: Ensure the modal container has `flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden`
  // We'll target `<div className="bg-white rounded-` which is the start of all these modal wrappers.
  content = content.replace(/<div className="bg-white rounded-([^"]+)"/g, (match, classes) => {
    // Remove existing height and overflow classes to standardize
    let newClasses = classes
        .replace(/max-h-\[[^\]]+\]/g, '')
        .replace(/md:max-h-\[[^\]]+\]/g, '')
        .replace(/my-8/g, '')
        .replace(/my-4/g, '')
        .replace(/sm:my-8/g, '')
        .replace(/overflow-visible/g, '')
        .replace(/overflow-hidden/g, '')
        .replace(/flex flex-col/g, '')
        .replace(/shrink-0/g, '')
        .replace(/\s+/g, ' ')
        .trim();
        
    // Also remove single `flex` if it was part of `flex flex-col` but didn't match
    // wait, `w-full max-w-2xl` etc should remain.
    // Let's add the standard flex-col and max-h classes. We use calc(100dvh-4rem) for mobile to ensure top/bottom spacing.
    newClasses += ' flex flex-col max-h-[calc(100dvh-4rem)] md:max-h-[90vh] overflow-hidden';
    
    // clean up multiple spaces
    newClasses = newClasses.replace(/\s+/g, ' ');
    
    return `<div className="bg-white rounded-${newClasses}"`;
  });

  // Step 2: Ensure the modal header doesn't shrink when form is scrollable
  // The header usually starts with `<div className="flex justify-between items-center px-6 py-4` or similar
  content = content.replace(/<div className="(flex justify-between items-center px-6 py-4[^"]*)"/g, (match, classes) => {
    if (!classes.includes('shrink-0')) {
      return `<div className="${classes} shrink-0"`;
    }
    return match;
  });

  // Step 3: Ensure the inner form/div (content) is scrollable (`flex-1 overflow-y-auto`)
  // Look for `<form ... className="p-6"` or similar
  content = content.replace(/className="p-6"/g, 'className="p-6 flex-1 overflow-y-auto custom-scrollbar"');
  content = content.replace(/className="p-6 text-center"/g, 'className="p-6 text-center flex-1 overflow-y-auto custom-scrollbar"');
  
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed styles for', f);
  }
});
