import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const generateQuotationPDF = async (quote, customers, products, exportType = 'pdf') => {
  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const doc = new jsPDF();
  const logoBase64 = await loadImage('/Title_Logo.png');

  // --- Brand Colors ---
  const isPrint = exportType === 'print';
  const brandDark = isPrint ? [90, 90, 90] : [26, 35, 126];       // Medium Grey / Indigo 900
  const brandAccent = isPrint ? [140, 140, 140] : [255, 111, 0];     // Light Grey / Amber 900
  const brandLight = [248, 249, 250];    // Very light grey for backgrounds
  const textPrimary = [0, 0, 0];         // Dark Grey for text
  const textSecondary = isPrint ? [0, 0, 0] : [100, 100, 100]; // Muted Grey
  const borderLight = isPrint ? [140, 140, 140] : [230, 230, 230];   // Soft grey borders

  // Helper
  const formatMoney = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRate = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ==========================================
  // 1. TOP HEADER STRIP & LOGO
  // ==========================================
  // Draw a thick dark blue top strip
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageW, 10, 'F');

  // Draw an orange strip just below it
  doc.setFillColor(...brandAccent);
  doc.rect(0, 10, pageW, 3, 'F');

  const hm = margin - 7; // Reduced margin for header section

  // Logo
  if (logoBase64) {
    // Use square dimensions since it's just the logo icon now
    doc.addImage(logoBase64, 'PNG', hm, 15, 22, 22, '', 'FAST');
  }

  // Company Name next to logo
  const centerX = pageW / 2;

  // As per instructions, adjust text placement.
  // The user requested to not have the name under the logo. 
  // Our code puts it in the center. We will keep the center text 
  // but style it nicely with the brand dark blue.
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MUKESH GRAPHICS", centerX, 23, { align: 'center' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PRINTING & PACKAGING SOLUTIONS", centerX, 29, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bhavnagar, Gujarat | MO: 9512007008", centerX, 34, { align: 'center' });
  doc.text("GST: 24ANVPB6301P1ZP", centerX, 39, { align: 'center' });

  // Quote / Estimate Tag
  const tagW = 35;
  const tagH = 8;
  const tagX = pageW - hm - tagW;
  const tagY = 16;

  doc.setFillColor(...brandDark);
  doc.roundedRect(tagX, tagY, tagW, tagH, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  // Centered in the rect
  doc.text("ESTIMATE", tagX + tagW / 2, tagY + 5.5, { align: 'center' });

  // Date and No
  const dateObj = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Estimate No:`, pageW - hm - 25, 31, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${quote.quotationNo || 'N/A'}`, pageW - hm, 31, { align: 'right' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, pageW - hm - 25, 36, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${dateStr}`, pageW - hm, 36, { align: 'right' });

  // Add a very subtle horizontal separator
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(hm, 44, pageW - hm, 44);

  // ==========================================
  // 2. FROM / TO SECTION (Cards)
  // ==========================================
  const custName = customers[quote.customerId]?.name || quote.customerId || 'Customer';
  const custCity = customers[quote.customerId]?.city || '';
  const custGst = customers[quote.customerId]?.gstNumber || '';
  const custMobile = customers[quote.customerId]?.mobile || '';

  const startY = 49;
  const cardW = (pageW - margin * 2 - 12) / 2;

  // "From" Card Background (Left)
  doc.setFillColor(245, 245, 245); // Very light tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, startY, cardW, 35, 2, 2, 'FD');

  // Thick dark blue left border for From card with rounded left corners
  doc.setFillColor(...brandDark);
  doc.roundedRect(margin, startY, 4, 35, 2, 2, 'F');
  doc.rect(margin + 2, startY, 2, 35, 'F');

  // "Billed To" Card Background (Right)
  doc.setFillColor(245, 245, 245); // Very light tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + cardW + 12, startY, cardW, 35, 2, 2, 'FD');

  // Thick orange left border for Billed To card with rounded left corners
  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin + cardW + 12, startY, 4, 35, 2, 2, 'F');
  doc.rect(margin + cardW + 14, startY, 2, 35, 'F');

  // Card Titles
  doc.setTextColor(...textSecondary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin + 10, startY + 7);
  doc.text("BILLED TO", margin + cardW + 22, startY + 7);

  // Card Content - From (Left)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MUKESH GRAPHICS", margin + 10, startY + 14);

  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  doc.text("Bhavnagar, Gujarat", margin + 10, startY + 20);
  doc.text("GST: 24ANVPB6301P1ZP", margin + 10, startY + 25);
  doc.text("MO: 9512007008 (Amanbhai)", margin + 10, startY + 30);

  // Card Content - To (Right)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(custName.toUpperCase(), margin + cardW + 22, startY + 14);

  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  let toY = startY + 20;
  if (custCity) { doc.text(custCity.toUpperCase(), margin + cardW + 22, toY); toY += 5; }
  if (custGst) { doc.text(`GST: ${custGst.toUpperCase()}`, margin + cardW + 22, toY); toY += 5; }
  if (custMobile) { doc.text(`MO: ${custMobile}`, margin + cardW + 22, toY); }

  let yPos = startY + 42;

  // ==========================================
  // 3. ITEMS TABLE
  // ==========================================
  const items = quote.items && quote.items.length > 0 ? quote.items : [
    { productId: quote.productId, specs: quote.specs, qty: quote.qty, price: quote.price }
  ].filter(i => i.productId);

  const tableData = [];
  let subtotal = 0;

  items.forEach((item, index) => {
    const productName = products[item.productId]?.name || item.productId || 'Unknown Product';
    const itemDesc = item.specs ? `${productName}\n${item.specs}` : productName;
    const q = Number(item.qty) || 0;
    const p = Number(item.price) || 0;
    const amount = q * p;
    subtotal += amount;

    tableData.push([
      index + 1,
      itemDesc,
      q.toLocaleString('en-IN'),
      formatRate(p),
      formatMoney(amount)
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'ITEM DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: brandDark, // Dark Blue header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 }, // Reduced padding to prevent wrapping
      halign: 'center',
      lineColor: brandDark,
      lineWidth: 0.1,
    },
    bodyStyles: {
      textColor: textPrimary,
      fontSize: 9.5,
      cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
      lineColor: borderLight,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 }, // Reduced width for # column
      1: { cellWidth: 'auto', halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 35 },
      4: { halign: 'center', cellWidth: 40 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didDrawPage: (data) => {
      yPos = data.cursor.y;
    }
  });

  yPos = doc.lastAutoTable.finalY + 12;

  // ==========================================
  // 4. TOTALS & BANK DETAILS
  // ==========================================
  const gstAmount = subtotal * 0.18;
  const finalTotal = subtotal + gstAmount;

  const totalsData = [
    ['Sub Total', formatMoney(subtotal)],
    ['GST (18%)', formatMoney(gstAmount)],
    ['Courier Charges', '-'],
    ['Advance', '-'],
    ['Net Payable', formatMoney(finalTotal)],
  ];

  // Draw Bank Details on the left side first
  const bankCardW = 92;

  // Highlighting Bank Details box with a light background and prominent text
  doc.setFillColor(240, 240, 240); // Very light blue/grey tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, bankCardW, 48, 2, 2, 'FD'); // Fill and draw border

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT / BANK DETAILS", margin + 4, yPos + 9);

  // Add a small divider line under title
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 4, yPos + 12, margin + bankCardW - 4, yPos + 12);

  doc.setFontSize(10);
  let bY = yPos + 19;
  const lX = margin + 4;
  const vX = margin + 20;

  const drawBankRow = (label, value, isBold = false) => {
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(label, lX, bY);

    doc.setTextColor(0, 0, 0); // Use dark blue for values to highlight them
    doc.setFont("helvetica", isBold ? "bold" : "bold"); // Making all bank details bold for highlighting
    doc.text(value, vX, bY);
    bY += 8;
  };

  drawBankRow("Bank:", "KOTAK MAHINDRA BANK", true);
  drawBankRow("Branch:", "LOKHAND BAZAR", true);
  drawBankRow("A/c No:", "9426272081", true);
  drawBankRow("IFSC:", "KKBK0003018", true);

  // Draw Totals Table on the right
  autoTable(doc, {
    startY: yPos - 1.5,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 9.5,
      textColor: textPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
    },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 35, textColor: textSecondary },
      1: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: pageW - margin - 70, right: margin },
    didParseCell: function (data) {
      if (data.row.index === totalsData.length - 1) { // Net Payable
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = brandDark; // Highlight final amount in blue
        data.cell.styles.fontSize = 11;
        data.cell.styles.fillColor = [240, 244, 255]; // slight blue tint
      }
    },
    didDrawCell: (data) => {
      // Add lines for Totals
      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.3);
      if (data.section === 'body' && data.row.index !== totalsData.length - 1) {
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const totalsFinalY = doc.lastAutoTable.finalY;

  // Notes area below bank details
  let noteY = Math.max(totalsFinalY, yPos + 36) + 12;

  // Guarantee it fits on page, else add page
  if (noteY + 25 > pageH - 15) {
    doc.addPage();
    noteY = margin;
  }

  doc.setFillColor(245, 245, 245); // Very light orange tint for note
  doc.setDrawColor(200, 200, 200); // Soft orange border to match the screenshot
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, noteY, pageW - margin * 2, 22, 2, 2, 'FD');

  // Thick orange left border for Note with rounded left corners
  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin, noteY, 4, 22, 2, 2, 'F');
  doc.rect(margin + 2, noteY, 2, 22, 'F');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0); // Orange text for NOTE:
  doc.text("NOTE:", margin + 8, noteY + 7.5);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textPrimary);
  const noteStr = "This is an estimated bill. An original invoice will be generated upon order completion and delivery of the shipment.";
  const splitNote = doc.splitTextToSize(noteStr, pageW - margin * 2 - 12);
  doc.text(splitNote, margin + 8, noteY + 13.5);

  // ==========================================
  // 5. FOOTER
  // ==========================================
  const footerY = pageH - 12;

  doc.setFillColor(...brandDark); // Dark Blue footer
  doc.rect(0, footerY, pageW, 12, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, footerY + 8.5);
  doc.text("Generated by Mukesh Graphics ERP", pageW / 2, footerY + 8.5, { align: 'center' });
  doc.text("mukeshgraphics@gmail.com", pageW - margin, footerY + 8.5, { align: 'right' });

  // Save the PDF
  const safeName = (quote.quotationNo || 'Quotation').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.setProperties({ title: safeName });

  if (exportType === 'jpg') {
    const pdfOutput = doc.output('arraybuffer');
    const loadingTask = pdfjsLib.getDocument({ data: pdfOutput });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    // Scale for better resolution
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${safeName}.jpg`;
    link.click();
  } else {
    doc.save(`${safeName}.pdf`);
  }
};

export const generateInvoicePDF = async (invoice, customers, products, exportType = 'pdf') => {
  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const doc = new jsPDF();
  const logoBase64 = await loadImage('/Title_Logo.png');

  // --- Brand Colors ---
  const isPrint = exportType === 'print';
  const brandDark = isPrint ? [90, 90, 90] : [26, 35, 126];       // Medium Grey / Indigo 900
  const brandAccent = isPrint ? [140, 140, 140] : [255, 111, 0];     // Light Grey / Amber 900
  const brandLight = [248, 249, 250];    // Very light grey for backgrounds
  const textPrimary = [0, 0, 0];         // Dark Grey for text
  const textSecondary = isPrint ? [0, 0, 0] : [100, 100, 100]; // Muted Grey
  const borderLight = isPrint ? [140, 140, 140] : [230, 230, 230];   // Soft grey borders

  // Helper
  const formatMoney = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRate = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ==========================================
  // 1. TOP HEADER STRIP & LOGO
  // ==========================================
  // Draw a thick dark blue top strip
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageW, 10, 'F');

  // Draw an orange strip just below it
  doc.setFillColor(...brandAccent);
  doc.rect(0, 10, pageW, 3, 'F');

  const hm = margin - 7; // Reduced margin for header section

  // Logo
  if (logoBase64) {
    // Use square dimensions since it's just the logo icon now
    doc.addImage(logoBase64, 'PNG', hm, 15, 22, 22, '', 'FAST');
  }

  // Company Name next to logo
  const centerX = pageW / 2;

  // As per instructions, adjust text placement.
  // The user requested to not have the name under the logo. 
  // Our code puts it in the center. We will keep the center text 
  // but style it nicely with the brand dark blue.
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MUKESH GRAPHICS", centerX, 23, { align: 'center' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PRINTING & PACKAGING SOLUTIONS", centerX, 29, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bhavnagar, Gujarat | MO: 9512007008", centerX, 34, { align: 'center' });
  doc.text("GST: 24ANVPB6301P1ZP", centerX, 39, { align: 'center' });

  // Quote / Estimate Tag
  const tagW = 35;
  const tagH = 8;
  const tagX = pageW - hm - tagW;
  const tagY = 16;

  doc.setFillColor(...brandDark);
  doc.roundedRect(tagX, tagY, tagW, tagH, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  // Centered in the rect
  doc.text("FINAL ESTIMATE", tagX + tagW / 2, tagY + 5.5, { align: 'center' });

  // Date and No
  const dateObj = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Estimate No:`, pageW - hm - 25, 31, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoice.invoiceNo || 'N/A'}`, pageW - hm, 31, { align: 'right' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, pageW - hm - 25, 36, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${dateStr}`, pageW - hm, 36, { align: 'right' });

  // Add a very subtle horizontal separator
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(hm, 44, pageW - hm, 44);

  // ==========================================
  // 2. FROM / TO SECTION (Cards)
  // ==========================================
  const custName = customers[invoice.customerId]?.name || invoice.customerId || 'Customer';
  const custCity = customers[invoice.customerId]?.city || '';
  const custGst = customers[invoice.customerId]?.gstNumber || '';
  const custMobile = customers[invoice.customerId]?.mobile || '';

  const startY = 49;
  const cardW = (pageW - margin * 2 - 12) / 2;

  // "From" Card Background (Left)
  doc.setFillColor(245, 245, 245); // Very light tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, startY, cardW, 35, 2, 2, 'FD');

  // Thick dark blue left border for From card with rounded left corners
  doc.setFillColor(...brandDark);
  doc.roundedRect(margin, startY, 4, 35, 2, 2, 'F');
  doc.rect(margin + 2, startY, 2, 35, 'F');

  // "Billed To" Card Background (Right)
  doc.setFillColor(245, 245, 245); // Very light tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + cardW + 12, startY, cardW, 35, 2, 2, 'FD');

  // Thick orange left border for Billed To card with rounded left corners
  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin + cardW + 12, startY, 4, 35, 2, 2, 'F');
  doc.rect(margin + cardW + 14, startY, 2, 35, 'F');

  // Card Titles
  doc.setTextColor(...textSecondary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin + 10, startY + 7);
  doc.text("BILLED TO", margin + cardW + 22, startY + 7);

  // Card Content - From (Left)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MUKESH GRAPHICS", margin + 10, startY + 14);

  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  doc.text("Bhavnagar, Gujarat", margin + 10, startY + 20);
  doc.text("GST: 24ANVPB6301P1ZP", margin + 10, startY + 25);
  doc.text("MO: 9512007008 (Amanbhai)", margin + 10, startY + 30);

  // Card Content - To (Right)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(custName.toUpperCase(), margin + cardW + 22, startY + 14);

  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  let toY = startY + 20;
  if (custCity) { doc.text(custCity.toUpperCase(), margin + cardW + 22, toY); toY += 5; }
  if (custGst) { doc.text(`GST: ${custGst.toUpperCase()}`, margin + cardW + 22, toY); toY += 5; }
  if (custMobile) { doc.text(`MO: ${custMobile}`, margin + cardW + 22, toY); }

  let yPos = startY + 42;

  // ==========================================
  // 3. ITEMS TABLE
  // ==========================================
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { productId: invoice.productId, specs: invoice.specs, qty: invoice.qty, price: invoice.price }
  ].filter(i => i.productId);

  const tableData = [];
  let subtotal = 0;

  items.forEach((item, index) => {
    const productName = products[item.productId]?.name || item.productId || 'Unknown Product';
    const itemDesc = item.specs ? `${productName}\n${item.specs}` : productName;
    const q = Number(item.qty) || 0;
    const p = Number(item.price) || 0;
    const amount = q * p;
    subtotal += amount;

    tableData.push([
      index + 1,
      itemDesc,
      q.toLocaleString('en-IN'),
      formatRate(p),
      formatMoney(amount)
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'ITEM DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: brandDark, // Dark Blue header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 }, // Reduced padding to prevent wrapping
      halign: 'center',
      lineColor: brandDark,
      lineWidth: 0.1,
    },
    bodyStyles: {
      textColor: textPrimary,
      fontSize: 9.5,
      cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
      lineColor: borderLight,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 }, // Reduced width for # column
      1: { cellWidth: 'auto', halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 35 },
      4: { halign: 'center', cellWidth: 40 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didDrawPage: (data) => {
      yPos = data.cursor.y;
    }
  });

  yPos = doc.lastAutoTable.finalY + 12;

  // ==========================================
  // 4. TOTALS & BANK DETAILS
  // ==========================================
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

  // Draw Bank Details on the left side first
  const bankCardW = 92;

  // Highlighting Bank Details box with a light background and prominent text
  doc.setFillColor(240, 240, 240); // Very light blue/grey tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, bankCardW, 48, 2, 2, 'FD'); // Fill and draw border

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT / BANK DETAILS", margin + 4, yPos + 9);

  // Add a small divider line under title
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 4, yPos + 12, margin + bankCardW - 4, yPos + 12);

  doc.setFontSize(10);
  let bY = yPos + 19;
  const lX = margin + 4;
  const vX = margin + 20;

  const drawBankRow = (label, value, isBold = false) => {
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(label, lX, bY);

    doc.setTextColor(0, 0, 0); // Use dark blue for values to highlight them
    doc.setFont("helvetica", isBold ? "bold" : "bold"); // Making all bank details bold for highlighting
    doc.text(value, vX, bY);
    bY += 8;
  };

  drawBankRow("Bank:", "KOTAK MAHINDRA BANK", true);
  drawBankRow("Branch:", "LOKHAND BAZAR", true);
  drawBankRow("A/c No:", "9426272081", true);
  drawBankRow("IFSC:", "KKBK0003018", true);

  // Draw Totals Table on the right
  autoTable(doc, {
    startY: yPos - 1.5,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 9.5,
      textColor: textPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
    },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 35, textColor: textSecondary },
      1: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: pageW - margin - 70, right: margin },
    didParseCell: function (data) {
      if (data.row.index === totalsData.length - 1) { // Net Payable
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = brandDark; // Highlight final amount in blue
        data.cell.styles.fontSize = 11;
        data.cell.styles.fillColor = [240, 244, 255]; // slight blue tint
      }
    },
    didDrawCell: (data) => {
      // Add lines for Totals
      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.3);
      if (data.section === 'body' && data.row.index !== 6) {
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  const totalsFinalY = doc.lastAutoTable.finalY;

  // Notes area below bank details
  let noteY = Math.max(totalsFinalY, yPos + 36) + 12;

  // Guarantee it fits on page, else add page
  if (noteY + 25 > pageH - 15) {
    doc.addPage();
    noteY = margin;
  }

  doc.setFillColor(245, 245, 245); // Very light orange tint for note
  doc.setDrawColor(200, 200, 200); // Soft orange border to match the screenshot
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, noteY, pageW - margin * 2, 22, 2, 2, 'FD');

  // Thick orange left border for Note with rounded left corners
  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin, noteY, 4, 22, 2, 2, 'F');
  doc.rect(margin + 2, noteY, 2, 22, 'F');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0); // Orange text for NOTE:
  doc.text("NOTE:", margin + 8, noteY + 7.5);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textPrimary);
  const noteStr = "This is an estimated bill. An original invoice will be generated upon order completion and delivery of the shipment.";
  const splitNote = doc.splitTextToSize(noteStr, pageW - margin * 2 - 12);
  doc.text(splitNote, margin + 8, noteY + 13.5);

  // ==========================================
  // 5. FOOTER
  // ==========================================
  const footerY = pageH - 12;

  doc.setFillColor(...brandDark); // Dark Blue footer
  doc.rect(0, footerY, pageW, 12, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, footerY + 8.5);
  doc.text("Generated by Mukesh Graphics ERP", pageW / 2, footerY + 8.5, { align: 'center' });
  doc.text("mukeshgraphics@gmail.com", pageW - margin, footerY + 8.5, { align: 'right' });

  // Save the PDF
  const safeName = (invoice.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.setProperties({ title: safeName });

  if (exportType === 'jpg') {
    const pdfOutput = doc.output('arraybuffer');
    const loadingTask = pdfjsLib.getDocument({ data: pdfOutput });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    // Scale for better resolution
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${safeName}.jpg`;
    link.click();
  } else {
    doc.save(`${safeName}.pdf`);
  }
};



const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only ';
  return str.trim();
};

const getAmountInWords = (amount) => {
  if (!amount || isNaN(amount)) return '';
  const numStr = parseFloat(amount).toFixed(2);
  const [rupees, paise] = numStr.split('.');
  let res = numberToWords(parseInt(rupees, 10));
  if (parseInt(paise, 10) > 0) {
    res = res.replace('Only', '').trim() + ' and ' + numberToWords(parseInt(paise, 10)).replace('Only', 'Paise Only').trim();
  }
  return res;
};

export const generatePurchaseOrderPDF = async (po, suppliers, exportType = 'pdf') => {
  const isPrint = exportType === 'print';
  const loadImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const doc = new jsPDF();
  const logoBase64 = await loadImage('/Title_Logo.png');

  // --- Brand Colors ---
  const brandDark = isPrint ? [140, 140, 140] : [26, 35, 126];       // Grey / Indigo 900
  const brandAccent = isPrint ? [140, 140, 140] : [255, 111, 0];     // Grey / Amber 900
  const brandGold = isPrint ? [160, 160, 160] : [255, 179, 0];       // Grey / Gold highlights
  const textPrimary = [0, 0, 0];         // Dark Grey for text
  const textSecondary = isPrint ? [0, 0, 0] : [100, 100, 100]; // Muted Grey
  const borderLight = isPrint ? [140, 140, 140] : [230, 230, 230];   // Soft grey borders

  const formatNum = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formatAmt = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRate = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const yOffset = isPrint ? -11 : 0;

  // ==========================================
  // 1. TOP HEADER STRIP & LOGO
  // ==========================================
  if (isPrint) {
    doc.setFillColor(...brandDark);
    doc.rect(0, 0, pageW, 2, 'F');
  } else {
    doc.setFillColor(...brandDark);
    doc.rect(0, 0, pageW, 10, 'F');

    doc.setFillColor(...brandAccent);
    doc.rect(0, 10, pageW, 3, 'F');
  }

  const hm = margin - 7;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', hm, 20 + yOffset, 15, 15, '', 'FAST');
  }

  const centerX = pageW / 2;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MUKESH GRAPHICS", centerX, 25 + yOffset, { align: 'center' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PLOT NO. 58, VISHWAKARMA INDUSTRIAL ESTATE,", centerX, 31 + yOffset, { align: 'center' });
  doc.text("NEAR CHITRA GIDC, BHAVNAGAR - 364004", centerX, 36 + yOffset, { align: 'center' });

  // Quote / Estimate Tag
  const tagW = 45;
  const tagH = 8;
  const tagX = pageW - hm - tagW;
  const tagY = 17 + yOffset;

  doc.setFillColor(...brandDark);
  doc.roundedRect(tagX, tagY, tagW, tagH, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PURCHASE ORDER", tagX + tagW / 2, tagY + 5.5, { align: 'center' });

  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(hm, 42 + yOffset, pageW - hm, 42 + yOffset);

  // ==========================================
  // 2. FROM / TO SECTION (Cards)
  // ==========================================
  const supplier = suppliers[po.supplierId] || {};
  const supplierName = supplier.name || po.supplierId || 'Supplier';
  const supplierCity = supplier.city || '';
  const supplierGst = supplier.gstNumber || '';
  const placeOfSupply = supplierCity ? supplierCity.toUpperCase() : '';

  const startY = 48 + yOffset;
  const cardW = (pageW - margin * 2 - 12) / 2;

  // "From" Card Background (Left) - Supplier Details
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, startY, cardW, 40, 2, 2, 'FD');

  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin, startY, 4, 40, 2, 2, 'F');
  doc.rect(margin + 2, startY, 2, 40, 'F');

  // "PO Details" Card Background (Right)
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + cardW + 12, startY, cardW, 40, 2, 2, 'FD');

  doc.setFillColor(...brandDark);
  doc.roundedRect(margin + cardW + 12, startY, 4, 40, 2, 2, 'F');
  doc.rect(margin + cardW + 14, startY, 2, 40, 'F');

  // SUPPLIER DETAILS (Left) — text moved up 2pt for visual balance
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const supplierLabel = `M/s. : ${supplierName.toUpperCase()}`;
  const supplierLines = doc.splitTextToSize(supplierLabel, cardW - 14);
  doc.text(supplierLines, margin + 10, startY + 6);

  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  let toY = startY + 6 + (supplierLines.length * 4) + 2; // Dynamic Y based on name length
  if (supplierCity) { doc.text(supplierCity.toUpperCase(), margin + 10, toY); toY += 6; }
  doc.text(`Place of Supply : ${placeOfSupply}`, margin + 10, toY); toY += 6;
  doc.text(`GSTIN No. : ${supplierGst.toUpperCase()}`, margin + 10, toY);

  // PO DETAILS (Right) — text moved up 2pt for visual balance
  const dateObj = po.createdAt ? new Date(po.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const rMargin = margin + cardW + 22;
  doc.setFontSize(9);
  doc.setTextColor(...textPrimary);

  doc.setFont("helvetica", "bold");
  doc.text("Order No.", rMargin, startY + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${po.poNo || 'N/A'}`, rMargin + 25, startY + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Date", rMargin, startY + 12);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${dateStr}`, rMargin + 25, startY + 12);

  let rightY = startY + 18;

  if (po.deliveryDate) {
    const dDate = new Date(po.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFont("helvetica", "bold");
    doc.text("DEL. DATE", rMargin, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${dDate}`, rMargin + 25, rightY);
    rightY += 6;
  }
  if (po.deliveryPlace) {
    doc.setFont("helvetica", "bold");
    doc.text("DEL. PLACE", rMargin, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${po.deliveryPlace.substring(0, 18).toUpperCase()}`, rMargin + 25, rightY);
    rightY += 6;
  }

  if (po.jobNo) {
    doc.setFont("helvetica", "bold");
    doc.text("JOB NO", rMargin, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${po.jobNo}`, rMargin + 25, rightY);
    rightY += 6;
  }

  if (po.jobName) {
    doc.setFont("helvetica", "bold");
    doc.text("JOB NAME", rMargin, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${po.jobName.substring(0, 18).toUpperCase()}`, rMargin + 25, rightY);
    rightY += 6;
  }

  if (po.modifiedBy && rightY <= startY + 36) {
    doc.setFont("helvetica", "bold");
    doc.text("MODIFY BY", rMargin, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${po.modifiedBy.toUpperCase()}`, rMargin + 25, rightY);
  }
  let yPos = startY + 43;

  // ==========================================
  // 3. ITEMS TABLE
  // ==========================================
  const gstPercent = po.invoiceType === 'GST' ? 18 : 0;

  const productsToIterate = po.products && po.products.length > 0 ? po.products : [{
    material: po.material, length: po.length, width: po.width, gsm: po.gsm,
    sheetPkt: po.sheetPkt, quantity: po.quantity, weight: po.weight,
    netWeight: po.netWeight, rate: po.rate, amount: po.amount, hsn: po.hsn
  }];

  let totalQty = 0;
  let totalNetWt = 0;
  let totalAmount = 0;

  const tableData = productsToIterate.map((p, index) => {
    const qty = Number(p.quantity) || 0;
    const rate = Number(p.rate) || 0;
    const netWt = Number(p.netWeight) || 0;
    const itemAmt = Number(p.amount) || (qty * rate);
    const l = Number(p.length) || 0;
    const w = Number(p.width) || 0;

    totalQty += qty;
    totalNetWt += netWt;
    totalAmount += itemAmt;

    const sizeStr = (l > 0 && w > 0) ? `${formatNum(l)} X ${formatNum(w)}` : '-';
    const gsmStr = p.gsm ? formatNum(p.gsm) : '-';
    const pktStr = p.sheetPkt ? formatNum(p.sheetPkt) : '-';

    return [
      String(index + 1),
      p.material ? p.material.toUpperCase() : '',
      p.hsn || '-',
      sizeStr,
      gsmStr,
      pktStr,
      formatNum(qty),
      formatNum(netWt),
      formatRate(rate),
      `${gstPercent}.00`,
      formatAmt(itemAmt)
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      'S.No',
      'Product Name',
      'HSN',
      'Size\n(L x W)',
      'GSM',
      'Sheet\nperPKT',
      'Qty',
      'Net\nWeight',
      'Rate',
      'GST %',
      'Amount'
    ]],
    body: tableData,
    foot: [[
      '', '', '', '', '', 'Sub Total',
      formatNum(totalQty),
      formatNum(totalNetWt),
      '', '',
      formatAmt(totalAmount)
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: brandDark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 1, right: 1 },
      halign: 'center',
      valign: 'middle',
      lineColor: [100, 100, 100],
      lineWidth: 0.5,
    },
    bodyStyles: {
      textColor: textPrimary,
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
      lineColor: borderLight,
      lineWidth: 0.5,
      valign: 'middle',
    },
    footStyles: {
      fillColor: [235, 235, 235],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: borderLight,
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 12 },
      10: { halign: 'right', cellWidth: 22 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didDrawPage: (data) => {
      yPos = data.cursor.y;
    },
    willDrawCell: (data) => {
      if (data.section === 'foot') {
        if (data.column.index === 5) {
          data.cell.styles.halign = 'right';
        }
      }
    }
  });

  const tableFinalY = doc.lastAutoTable.finalY;

  // ==========================================
  // 4. FOOTER CALCULATIONS
  // ==========================================
  const gstAmount = po.invoiceType === 'GST' ? (totalAmount * 0.18) : 0;
  const freightUnitRate = Number(po.freightAmount) || 0;
  // Freight total = unit rate × total net weight
  const freightTotal = freightUnitRate * totalNetWt;
  const rawTotal = totalAmount + gstAmount + freightTotal;
  const grandTotal = Math.round(rawTotal);
  const roundOff = grandTotal - rawTotal;

  let footerY = tableFinalY + 5;

  const vLineX = pageW - margin - 70;

  // Pre-calculate text wrapping to determine exact required height
  let allNotes = [];
  productsToIterate.forEach((p, idx) => {
    if (p.notes && p.notes.trim()) {
      allNotes.push(`${idx + 1}. ${p.notes.trim()}`);
    }
  });
  if (po.notes && po.notes.trim()) {
    allNotes.push(`PO NOTE: ${po.notes.trim()}`);
  }
  const noteText = allNotes.join('\n\n').replace(/\n{3,}/g, '\n\n').toUpperCase().trim();
  const splitNote = doc.splitTextToSize(noteText, vLineX - margin - 15);

  // Calculate exact line height used by jsPDF to prevent extra gaps
  const lineHeightMm = doc.getFontSize() * doc.getLineHeightFactor() * 25.4 / 72;
  const noteHeight = splitNote.length > 0 && noteText ? (splitNote.length - 1) * lineHeightMm + 2 : 2;

  const terms = [
    "1. PLEASE MENTION THE P.O. NO. & DATE ON ALL YOUR INVOICE & CHALLANS.",
    "2. THE MATERIAL SHOULD BE DELIVERED AT SHIPPING ADDRESS BY 6 PM TAXES EXTRA AS APPLICABLE.",
    "3. WE RESERVE THE RIGHT TO AMEND/CANCEL THIS P.O.",
    "   ALL DISPUTES SUBJECT TO BHAVNAGAR GUJARAT JURISDICTION.",
    "4. ONLY SINGLE DELIVERY WILL BE ACCEPTED AGAINST EACH ORDER ITEM.",
    "   NO EXCESS QUANTITY WILL BE ACCEPTED."
  ];
  const termLineHeightMm = 7 * 1.15 * 25.4 / 72;
  let termsTotalHeight = 0;
  terms.forEach(term => {
    const wrappedTerm = doc.splitTextToSize(term, vLineX - margin - 4);
    termsTotalHeight += (wrappedTerm.length * termLineHeightMm) + 1;
  });

  let rightLines = 2;
  if (po.invoiceType === 'GST') rightLines += 2;
  if (Number(po.freightAmount) > 0) rightLines += 1;
  const requiredRightHeight = 6 + (rightLines * 6) + 12;

  // 31mm static gaps + tight bottom padding
  const requiredLeftHeight = 31 + noteHeight + termsTotalHeight + 2;
  const gridHeight = Math.max(requiredRightHeight, requiredLeftHeight);

  // Ensure enough space for dynamic footer
  if (footerY + gridHeight + 10 > pageH - margin) {
    doc.addPage();
    footerY = margin + 10;
  }

  // Draw Bottom Grid
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.rect(margin, footerY, pageW - margin * 2, gridHeight);
  // Vertical line separating left (words/terms) and right (calculations)
  doc.line(vLineX, footerY, vLineX, footerY + gridHeight);

  // --- Left Side (Words & Terms) ---
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  let leftY = footerY + 5;
  doc.text(`Total GST : ${getAmountInWords(gstAmount)}`, margin + 2, leftY);
  leftY += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Bill Amount : ${getAmountInWords(grandTotal)}`, margin + 2, leftY);
  leftY += 6;

  doc.setDrawColor(...borderLight);
  doc.line(margin, leftY, vLineX, leftY);
  leftY += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Note :", margin + 2, leftY);
  doc.setFont("helvetica", "normal");

  doc.text(splitNote, margin + 12, leftY);

  leftY += noteHeight;
  doc.line(margin, leftY, vLineX, leftY);
  leftY += 5; // Restored spacing above Terms & Condition

  doc.setFont("helvetica", "bold");
  doc.text("Terms & Condition :", margin + 2, leftY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  let termY = leftY + 4;
  terms.forEach(term => {
    const wrappedTerm = doc.splitTextToSize(term, vLineX - margin - 4);
    doc.text(wrappedTerm, margin + 2, termY);
    termY += (wrappedTerm.length * termLineHeightMm) + 1;
  });

  // --- Right Side (Calculations) ---
  const calcX1 = vLineX + 2; // Label
  const calcX2 = pageW - margin - 2; // Value (right align)
  let calcY = footerY + 6;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Taxable Amount", calcX1, calcY);
  doc.text(formatAmt(totalAmount), calcX2, calcY, { align: 'right' });
  calcY += 6;

  doc.setFont("helvetica", "normal");
  if (po.invoiceType === 'GST') {
    const halfGst = gstAmount / 2;
    doc.text("CGST 9.00%", calcX1, calcY);
    doc.text(formatAmt(halfGst), calcX2, calcY, { align: 'right' });
    calcY += 6;
    doc.text("SGST 9.00%", calcX1, calcY);
    doc.text(formatAmt(halfGst), calcX2, calcY, { align: 'right' });
    calcY += 6;
  }

  if (freightTotal > 0) {
    doc.text(`Freight (${formatAmt(freightUnitRate)} x ${formatNum(totalNetWt)} Kg)`, calcX1, calcY);
    doc.text(formatAmt(freightTotal), calcX2, calcY, { align: 'right' });
    calcY += 6;
  }

  doc.text("Round Off", calcX1, calcY);
  doc.text(formatAmt(roundOff), calcX2, calcY, { align: 'right' });

  // Grand Total Line
  const gtY = footerY + gridHeight - 8;
  doc.setDrawColor(...brandAccent);
  doc.setLineWidth(0.5);
  doc.line(vLineX, gtY - 3, pageW - margin, gtY - 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Grand Total", calcX1, gtY + 1);
  doc.text(formatAmt(grandTotal), calcX2, gtY + 1, { align: 'right' });

  // Signature Box (Below grid on right)
  const sigY = footerY + gridHeight + 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("For, MUKESH GRAPHICS", pageW - margin - 2, sigY, { align: 'right' });

  doc.setFont("helvetica", "italic");
  doc.setTextColor(...textSecondary);
  doc.text("(Authorized Signatory)", pageW - margin - 2, sigY + 12, { align: 'right' });


  // ==========================================
  // 5. BOTTOM BRAND STRIP
  // ==========================================
  const bottomY = pageH - 12;

  doc.setFillColor(...brandDark);
  doc.rect(0, bottomY, pageW, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Generated by Mukesh Graphics ERP", margin, bottomY + 7.5);
  doc.text("mukeshgraphics@gmail.com", pageW - margin, bottomY + 7.5, { align: 'right' });

  // Save the PDF
  const safeName = (po.poNo || 'PO').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.setProperties({ title: safeName });

  if (exportType === 'jpg') {
    const pdfOutput = doc.output('arraybuffer');
    const loadingTask = pdfjsLib.getDocument({ data: pdfOutput });
    const pdfDocument = await loadingTask.promise;
    const page = await pdfDocument.getPage(1);

    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${safeName}.jpg`;
    link.click();
  } else if (exportType === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(`${safeName}.pdf`);
  }
};
