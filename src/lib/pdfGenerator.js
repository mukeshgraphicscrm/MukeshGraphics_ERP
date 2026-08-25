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
  const logoBase64 = await loadImage('/Title_Logo.png');

  // --- Brand Colors ---
  const brandDark = [30, 58, 138];       // Dark Blue (for headers, footer, tags)
  const brandAccent = [249, 115, 22];    // Orange (for top strip, accents)
  const brandLight = [255, 255, 255];    // White
  const textPrimary = [33, 37, 41];      // Dark Grey for normal text
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
    doc.addImage(logoBase64, 'PNG', hm, 20, 28, 28, '', 'FAST');
  }

  // Company Name next to logo
  const centerX = pageW / 2;

  // As per instructions, adjust text placement.
  // The user requested to not have the name under the logo. 
  // Our code puts it in the center. We will keep the center text 
  // but style it nicely with the brand dark blue.
  doc.setTextColor(...brandDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MUKESH GRAPHICS", centerX, 31, { align: 'center' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PRINTING & PACKAGING SOLUTIONS", centerX, 37, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bhavnagar, Gujarat | MO: 9512007008", centerX, 42, { align: 'center' });
  doc.text("GST: 24ANVPB6301P1ZP", centerX, 47, { align: 'center' });

  // Quote / Estimate Tag
  const tagW = 35;
  const tagH = 8;
  const tagX = pageW - hm - tagW;
  const tagY = 23;

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
  doc.text(`Estimate No:`, pageW - hm - 25, 39, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${quote.quotationNo || 'N/A'}`, pageW - hm, 39, { align: 'right' });

  doc.setTextColor(...textSecondary);
  doc.setFont("helvetica", "bold");
  doc.text(`Date:`, pageW - hm - 25, 44, { align: 'right' });
  doc.setTextColor(...textPrimary);
  doc.setFont("helvetica", "bold");
  doc.text(`${dateStr}`, pageW - hm, 44, { align: 'right' });

  // Add a very subtle horizontal separator
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.line(hm, 54, pageW - hm, 54);

  // ==========================================
  // 2. FROM / TO SECTION (Cards)
  // ==========================================
  const custName = customers[quote.customerId]?.name || quote.customerId || 'Customer';
  const custCity = customers[quote.customerId]?.city || '';
  const custGst = customers[quote.customerId]?.gstNumber || '';
  const custMobile = customers[quote.customerId]?.mobile || '';

  const startY = 60;
  const cardW = (pageW - margin * 2 - 12) / 2;

  // "From" Card Background (Left)
  doc.setFillColor(252, 253, 255); // Very light tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, startY, cardW, 35, 2, 2, 'FD');

  // Thick dark blue left border for From card with rounded left corners
  doc.setFillColor(...brandDark);
  doc.roundedRect(margin, startY, 4, 35, 2, 2, 'F');
  doc.rect(margin + 2, startY, 2, 35, 'F');

  // "Billed To" Card Background (Right)
  doc.setFillColor(252, 253, 255); // Very light tint
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
  doc.setTextColor(...brandDark);
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
  doc.setTextColor(...brandDark);
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
      formatMoney(p),
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
    ['Courier Charges', '-'],
    ['Transportation', '-'],
    ['GST (18%)', formatMoney(gstAmount)],
    ['Previous Due', '-'],
    ['Advance', '-'],
    ['Net Payable', formatMoney(finalTotal)],
  ];

  // Draw Bank Details on the left side first
  const bankCardW = 92;

  // Highlighting Bank Details box with a light background and prominent text
  doc.setFillColor(248, 250, 252); // Very light blue/grey tint
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, bankCardW, 48, 2, 2, 'FD'); // Fill and draw border

  doc.setTextColor(...brandDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT / BANK DETAILS", margin + 4, yPos + 9);

  // Add a small divider line under title
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, yPos + 12, margin + bankCardW - 4, yPos + 12);

  doc.setFontSize(10);
  let bY = yPos + 19;
  const lX = margin + 4;
  const vX = margin + 20;

  const drawBankRow = (label, value, isBold = false) => {
    doc.setTextColor(...textSecondary);
    doc.setFont("helvetica", "normal");
    doc.text(label, lX, bY);

    doc.setTextColor(...brandDark); // Use dark blue for values to highlight them
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
      if (data.row.index === 6) { // Net Payable
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

  doc.setFillColor(255, 250, 245); // Very light orange tint for note
  doc.setDrawColor(253, 216, 181); // Soft orange border to match the screenshot
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, noteY, pageW - margin * 2, 22, 2, 2, 'FD');

  // Thick orange left border for Note with rounded left corners
  doc.setFillColor(...brandAccent);
  doc.roundedRect(margin, noteY, 4, 22, 2, 2, 'F');
  doc.rect(margin + 2, noteY, 2, 22, 'F');

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...brandAccent); // Orange text for NOTE:
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
  doc.save(`${safeName}.pdf`);
};
