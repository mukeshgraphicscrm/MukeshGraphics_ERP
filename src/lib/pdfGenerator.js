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
  const brandDark = [33, 37, 41];        // Dark slate / almost black for minimalist look
  const brandAccent = [108, 117, 125];   // Muted grey instead of bright orange
  const brandLight = [255, 255, 255];    // White backgrounds instead of grey
  const textPrimary = [33, 37, 41];      // Dark Grey for text
  const textSecondary = [108, 117, 125]; // Muted Grey
  const borderLight = [222, 226, 230];   // Soft grey borders

  // Helper
  const formatMoney = (amount) => 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // ==========================================
  // 1. TOP HEADER STRIP & LOGO
  // ==========================================
  // Draw a minimal top strip
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageW, 3, 'F');

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
  const tagW = 35;
  const tagH = 8;
  const tagX = pageW - hm - tagW;
  const tagY = 15;
  
  doc.setDrawColor(...brandDark);
  doc.setLineWidth(0.5);
  doc.roundedRect(tagX, tagY, tagW, tagH, 1, 1, 'S');

  doc.setTextColor(...brandDark);
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
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, startY, cardW, 35, 2, 2, 'S');

  // "Billed To" Card Background (Right)
  doc.roundedRect(margin + cardW + 12, startY, cardW, 35, 2, 2, 'S');

  // Card Titles
  doc.setTextColor(...textSecondary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin + 8, startY + 6);
  doc.text("BILLED TO", margin + cardW + 20, startY + 6);

  // Card Content - From (Left)
  doc.setTextColor(...brandDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("MUKESH GRAPHICS", margin + 8, startY + 13);

  doc.setFontSize(10);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  doc.text("Bhavnagar, Gujarat", margin + 8, startY + 19);
  doc.text("GST: 24ANVPB6301P1ZP", margin + 8, startY + 25);
  doc.text("MO: 9512007008 (Amanbhai)", margin + 8, startY + 31);

  // Card Content - To (Right)
  doc.setTextColor(...brandDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(custName.toUpperCase(), margin + cardW + 20, startY + 13);

  doc.setFontSize(10);
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "normal");
  let toY = startY + 19;
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
      fillColor: [248, 249, 250],
      textColor: textPrimary,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
      halign: 'center',
      lineColor: borderLight,
      lineWidth: 0.2,
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
      3: { halign: 'center', cellWidth: 35 },
      4: { halign: 'center', cellWidth: 40 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255], // pure white
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
  
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, bankCardW, 48, 2, 2, 'S');

  doc.setTextColor(...textPrimary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT / BANK DETAILS", margin + 4, yPos + 9);
  
  doc.setFontSize(10);
  let bY = yPos + 18;
  const lX = margin + 4;
  const vX = margin + 28;

  const drawBankRow = (label, value, isBold = false) => {
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(label, lX, bY);
    
    doc.setTextColor(...textPrimary);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(value, vX, bY);
    bY += 8;
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
        data.cell.styles.textColor = textPrimary;
        data.cell.styles.fontSize = 11;
        data.cell.styles.fillColor = [248, 249, 250]; // slight grey tint
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

  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, noteY, pageW - margin * 2, 24, 2, 2, 'S');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textPrimary);
  doc.text("NOTE:", margin + 4, noteY + 7.5);

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textSecondary);
  const noteStr = "This is an estimated bill. An original invoice will be generated upon order completion and delivery of the shipment.";
  const splitNote = doc.splitTextToSize(noteStr, pageW - margin * 2 - 8);
  doc.text(splitNote, margin + 4, noteY + 14);

  // ==========================================
  // 5. FOOTER
  // ==========================================
  const footerY = pageH - 15;

  doc.setFillColor(248, 249, 250);
  doc.rect(0, footerY, pageW, 15, 'F');
  
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(0, footerY, pageW, footerY);

  doc.setTextColor(...textSecondary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, footerY + 9.5);
  doc.text("Generated by Mukesh Graphics ERP", pageW / 2, footerY + 9.5, { align: 'center' });
  doc.text("mukeshgraphics@gmail.com", pageW - margin, footerY + 9.5, { align: 'right' });

  // Save the PDF
  const safeName = (quote.quotationNo || 'Quotation').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`${safeName}.pdf`);
};
