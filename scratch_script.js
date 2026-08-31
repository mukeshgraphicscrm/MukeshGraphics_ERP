const fs = require('fs');
const file = 'src/lib/pdfGenerator.js';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('export const generateQuotationPDF = async (quote, customers, products) => {');
const endIdx = content.indexOf('export const generatePurchaseOrderPDF');

let funcContent = content.substring(startIdx, endIdx);

// Replace quote with invoice
funcContent = funcContent.replace(/export const generateQuotationPDF = async \(quote, customers, products\) => \{/g, 'export const generateInvoicePDF = async (invoice, customers, products) => {');
funcContent = funcContent.replace(/\bquote\b/g, 'invoice');
funcContent = funcContent.replace(/\bquotationNo\b/g, 'invoiceNo');
funcContent = funcContent.replace(/ESTIMATE/g, 'FINAL ESTIMATE');

// Update totals logic
const totalsReplacement = `
  const gstAmount = subtotal * 0.18;
  const finalTotal = subtotal + gstAmount;
  const advance = Number(invoice.advancePaymentAmount) || 0;
  const netPayable = finalTotal - advance;

  const totalsData = [
    ['Sub Total', formatMoney(subtotal)],
    ['GST (18%)', formatMoney(gstAmount)],
    ['Grand Total', formatMoney(finalTotal)],
  ];
  if (advance > 0) {
    totalsData.push(['Advance Received', formatMoney(advance)]);
    totalsData.push(['Remaining Amount', formatMoney(netPayable)]);
  } else {
    totalsData.push(['Remaining Amount', formatMoney(netPayable)]);
  }
`;

funcContent = funcContent.replace(/const gstAmount = subtotal \* 0\.18;[\s\S]*?\];/m, totalsReplacement.trim());

// Update highlighting index for totals
funcContent = funcContent.replace(/if \(data\.row\.index === 6\) \{ \/\/ Net Payable/g, 'if (data.row.index === totalsData.length - 1) { // Net Payable');

// Update filename save
funcContent = funcContent.replace(/Quotation/g, 'Invoice');
funcContent = funcContent.replace(/InvoiceNo/g, 'invoiceNo');

// Append to file
const newContent = content.slice(0, endIdx) + funcContent + '\n\n' + content.slice(endIdx);
fs.writeFileSync(file, newContent);
console.log('Appended generateInvoicePDF successfully.');
