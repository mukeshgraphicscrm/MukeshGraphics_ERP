import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateQuotationPDF = async (quote, customers, products) => {
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
  const logoBase64 = await loadImage('/logo.png');

  // --- Brand Colors ---
  const brandDark = [26, 35, 126];       // Indigo 900 (Deep Professional Blue)
  const brandAccent = [255, 111, 0];     // Amber 900 (Vibrant deep orange)
  const brandLight = [248, 249, 250];    // Very light grey for backgrounds
  const textPrimary = [33, 37, 41];      // Dark Grey for text
  const textSecondary = [108, 117, 125]; // Muted Grey
  const borderLight = [233, 236, 239];   // Soft borders

  // Helper
  const formatMoney = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ==========================================
  // 1. TOP HEADER STRIP & LOGO
  // ==========================================
  // Draw a top accent strip
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageW, 8, 'F');

  doc.setFillColor(...brandAccent);
  doc.rect(0, 8, pageW, 2, 'F');

  const hm = margin - 7; // Reduced margin for header section

  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', hm, 12, 42, 31, '', 'FAST');
  }

  // Company Name next to logo
  const centerX = pageW / 2;

  doc.setTextColor(...brandDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MUKESH GRAPHICS", centerX, 23, { align: 'center' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PRINTING & PACKAGING SOLUTIONS", centerX, 30, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Bhavnagar, Gujarat | MO: 9512007008", centerX, 36, { align: 'center' });
  doc.text("GST: 24ANVPB6301P1ZP", centerX, 41, { align: 'center' });

  // Quote / Estimate Tag
  const tagW = 45;
  const tagH = 10;
  const tagX = pageW - hm - tagW;
  const tagY = 15;
  doc.setFillColor(...brandDark);
  doc.roundedRect(tagX, tagY, tagW, tagH, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  // Centered in the rect
  doc.text("ESTIMATE", tagX + tagW / 2, tagY + 7, { align: 'center' });

  // Date and No
  const dateObj = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Estimate No:`, pageW - hm - 30, 31, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${quote.quotationNo || 'N/A'}`, pageW - hm, 31, { align: 'right' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, pageW - hm - 30, 36, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${dateStr}`, pageW - hm, 36, { align: 'right' });

  // Add a very subtle horizontal separator
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(hm, 52, pageW - hm, 52);

  // ==========================================
  // 2. FROM / TO SECTION (Cards)
  // ==========================================
  const custName = customers[quote.customerId]?.name || quote.customerId || 'Customer';
  const custCity = customers[quote.customerId]?.city || '';
  const custGst = customers[quote.customerId]?.gstNumber || '';
  const custMobile = customers[quote.customerId]?.mobile || '';

  const startY = 58;
  const cardW = (pageW - margin * 2 - 12) / 2;

  // "From" Card Background (Left)
  doc.setFillColor(...brandLight);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, startY, cardW, 35, 2, 2, 'FD');

  // "Billed To" Card Background (Right)
  doc.roundedRect(margin + cardW + 12, startY, cardW, 35, 2, 2, 'FD');

  // Accent lines on cards
  doc.setFillColor(...brandDark);
  doc.rect(margin, startY, 3, 35, 'F');
  doc.setFillColor(...brandAccent);
  doc.rect(margin + cardW + 12, startY, 3, 35, 'F');

  // Card Titles
  doc.setTextColor(...textSecondary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin + 8, startY + 8);
  doc.text("BILLED TO", margin + cardW + 20, startY + 8);

  // Card Content - From (Left)
  doc.setTextColor(...brandDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("MUKESH GRAPHICS", margin + 8, startY + 15);

  doc.setFontSize(10);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  doc.text("Bhavnagar, Gujarat", margin + 8, startY + 21);
  doc.text("GST: 24ANVPB6301P1ZP", margin + 8, startY + 27);
  doc.text("MO: 9512007008 (Amanbhai)", margin + 8, startY + 33);

  // Card Content - To (Right)
  doc.setTextColor(...brandDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(custName.toUpperCase(), margin + cardW + 20, startY + 15);

  doc.setFontSize(10);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  let toY = startY + 21;
  if (custCity) { doc.text(custCity.toUpperCase(), margin + cardW + 20, toY); toY += 6; }
  if (custGst) { doc.text(`GST: ${custGst.toUpperCase()}`, margin + cardW + 20, toY); toY += 6; }
  if (custMobile) { doc.text(`MO: ${custMobile}`, margin + cardW + 20, toY); }

  let yPos = startY + 45;

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
      formatMoney(p),
      formatMoney(amount)
    ]);
  });

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'ITEM DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
    body: tableData,
    theme: 'grid', // Use grid to have vertical lines, then style them
    headStyles: {
      fillColor: brandDark,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
      halign: 'center',
    },
    bodyStyles: {
      textColor: textPrimary,
      fontSize: 9.5,
      cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
      lineColor: borderLight,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 40 },
    },
    alternateRowStyles: {
      fillColor: [252, 253, 254], // extremely subtle grey
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
    ['Courier Charges', '-'],
    ['Transportation', '-'],
    ['GST (18%)', formatMoney(gstAmount)],
    ['Previous Due', '-'],
    ['Advance', '-'],
    ['Net Payable', formatMoney(finalTotal)],
  ];

  // Draw Bank Details on the left side first
  const bankCardW = 110;
  
  doc.setFillColor(...brandLight);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, yPos, bankCardW, 48, 2, 2, 'FD');

  doc.setTextColor(...brandDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT / BANK DETAILS", margin + 4, yPos + 9);
  
  doc.setDrawColor(...brandAccent);
  doc.setLineWidth(1);
  doc.line(margin + 4, yPos + 12, margin + 26, yPos + 12);

  doc.setFontSize(11);
  let bY = yPos + 21;
  const lX = margin + 4;
  const vX = margin + 28;

  const drawBankRow = (label, value, isBold = false) => {
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(label, lX, bY);
    
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(value, vX, bY);
    bY += 7.5;
  };

  drawBankRow("Bank:", "KOTAK MAHINDRA BANK", true);
  drawBankRow("Branch:", "LOKHAND BAZAR");
  drawBankRow("A/c No:", "9426272081", true);
  drawBankRow("IFSC:", "KKBK0003018");

  // Draw Totals Table on the right
  autoTable(doc, {
    startY: yPos - 1.5, // slightly offset to align with the bank box nicely
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 9.5,
      textColor: textPrimary,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
    },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 35, textColor: textSecondary },
      1: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: pageW - margin - 67, right: margin },
    didParseCell: function (data) {
      if (data.row.index === 6) { // Net Payable
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = brandDark;
        data.cell.styles.fontSize = 11;
        data.cell.styles.fillColor = [240, 244, 255]; // slight blue tint
      }
    },
    didDrawCell: (data) => {
      // Add lines for Totals
      doc.setDrawColor(...borderLight);
      doc.setLineWidth(0.3);
      if (data.section === 'body') {
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

  doc.setFillColor(255, 250, 240); // Very light orange/yellow for note
  doc.setDrawColor(255, 230, 204);
  doc.roundedRect(margin, noteY, pageW - margin * 2, 22, 2, 2, 'FD');

  doc.setFillColor(...brandAccent);
  doc.rect(margin, noteY, 3, 22, 'F'); // left accent

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 80, 0);
  doc.text("NOTE:", margin + 8, noteY + 8);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textPrimary);
  const noteStr = "This is an estimated bill. An original invoice will be generated upon order completion and delivery of the shipment.";
  const splitNote = doc.splitTextToSize(noteStr, pageW - margin * 2 - 12);
  doc.text(splitNote, margin + 8, noteY + 14);

  // ==========================================
  // 5. FOOTER
  // ==========================================
  const footerY = pageH - 15;

  doc.setFillColor(...brandDark);
  doc.rect(0, footerY, pageW, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, footerY + 9.5);
  doc.text("Generated by Mukesh Graphics ERP", pageW / 2, footerY + 9.5, { align: 'center' });
  doc.text("mukeshgraphics@gmail.com", pageW - margin, footerY + 9.5, { align: 'right' });

  // Save the PDF
  const safeName = (quote.quotationNo || 'Quotation').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`${safeName}.pdf`);
};
