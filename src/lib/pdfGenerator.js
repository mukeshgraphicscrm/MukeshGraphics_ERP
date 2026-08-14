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

  // Load Logo
  const logoBase64 = await loadImage('/logo.png');

  // Brand Colors
  const primaryColor = [27, 47, 99]; // #1b2f63
  const accentColor = [232, 163, 61]; // #E8A33D
  const grayText = [80, 80, 80];
  const lightGray = [240, 240, 240];

  // Helper for formatting Indian currency
  const formatMoney = (amount) => {
    return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- HEADER SECTION ---

  // Background for top header (Removed blue fill so logo text is visible on white)
  // We'll use a clean white header with premium colored typography instead.

  // Title "ESTIMATE"
  doc.setTextColor(...primaryColor); // Use premium blue for title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 6, 38, 28);
  }
  
  // Center title
  doc.text("ESTIMATE", pageWidth / 2, 26, { align: 'center' });

  // Add premium gold accent line below the header area
  doc.setFillColor(...accentColor);
  doc.rect(0, 40, pageWidth, 2, 'F');

  // Quote details on top right
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Ensure date is formatted nicely. If quote doesn't have a date, use today's date
  const dateObj = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.text(`Quotation No: ${quote.quotationNo || 'N/A'}`, pageWidth - margin, 20, { align: 'right' });
  doc.text(`Date: ${dateStr}`, pageWidth - margin, 27, { align: 'right' });

  // --- COMPANY & CUSTOMER INFO ---

  // Company Info (From)
  let yPos = 55;
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("From:", margin, yPos);

  yPos += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("MUKESH GRAPHICS", margin, yPos);

  yPos += 5;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Bhavnagar, Gujarat.", margin, yPos);
  yPos += 5;
  doc.text("GST: 24ANVPB6301P1ZP", margin, yPos);
  yPos += 5;
  doc.text("MO: 9512007008 (Amanbhai)", margin, yPos);

  // Customer Info (To)
  const custName = customers[quote.customerId]?.name || quote.customerId || 'Customer';
  const custCity = customers[quote.customerId]?.city || '';
  const custGst = customers[quote.customerId]?.gstNumber || '';
  const custMobile = customers[quote.customerId]?.mobile || '';

  let rightY = 55;
  const rightX = pageWidth / 2 + 10;

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("To:", rightX, rightY);

  rightY += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(custName.toUpperCase(), rightX, rightY);

  rightY += 5;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (custCity) {
    doc.text(custCity.toUpperCase(), rightX, rightY);
    rightY += 5;
  }
  if (custGst) {
    doc.text(`GST: ${custGst.toUpperCase()}`, rightX, rightY);
    rightY += 5;
  }
  if (custMobile) {
    doc.text(`MO: ${custMobile}`, rightX, rightY);
    rightY += 5;
  }

  // --- TABLE SECTION ---

  yPos = Math.max(yPos, rightY) + 15;

  // Prepare table data
  const tableData = [];
  let subtotal = 0;

  // Handle both single-item and multi-item structures
  const items = quote.items && quote.items.length > 0 ? quote.items : [
    {
      productId: quote.productId,
      specs: quote.specs,
      qty: quote.qty,
      price: quote.price
    }
  ].filter(i => i.productId);

  items.forEach((item, index) => {
    const productName = products[item.productId]?.name || item.productId || 'Unknown Product';
    // Format specs to be multi-line if needed, or just append
    const itemDesc = item.specs ? `${productName}\n(${item.specs})` : productName;
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
    head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 40 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    didDrawPage: (data) => {
      // In case table breaks into multiple pages, we keep track of Y position
      yPos = data.cursor.y;
    }
  });

  // --- TOTALS SECTION ---

  yPos = doc.lastAutoTable.finalY + 5;

  // Calculate GST (assuming 18%)
  const gstAmount = subtotal * 0.18;
  const finalTotal = subtotal + gstAmount;

  const totalsX = pageWidth - margin;
  const labelX = totalsX - 45;

  // Add totals background
  doc.setFillColor(250, 250, 250);
  doc.rect(labelX - 45, yPos - 3, totalsX - (labelX - 45) + margin, 52, 'F');

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // 1. Total
  yPos += 5;
  doc.text("Total", labelX, yPos, { align: 'right' });
  doc.text(formatMoney(subtotal), totalsX, yPos, { align: 'right' });

  // 2. + Courier charges
  yPos += 6;
  doc.text("+ Courier charges", labelX, yPos, { align: 'right' });
  doc.text("-", totalsX, yPos, { align: 'right' });

  // 3. + Transportation :
  yPos += 6;
  doc.text("+ Transportation :", labelX, yPos, { align: 'right' });
  doc.text("-", totalsX, yPos, { align: 'right' });

  // 4. + 18 % GST
  yPos += 6;
  doc.text("+ 18 % GST", labelX, yPos, { align: 'right' });
  doc.text(formatMoney(gstAmount), totalsX, yPos, { align: 'right' });

  // 5. + Previous Due
  yPos += 6;
  doc.text("+ Previous Due", labelX, yPos, { align: 'right' });
  doc.text("-", totalsX, yPos, { align: 'right' });

  // 6. TOTAL (highlighted)
  yPos += 2;
  doc.setFillColor(230, 230, 235);
  doc.rect(labelX - 40, yPos, totalsX - (labelX - 40), 7, 'F');
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("TOTAL", labelX, yPos, { align: 'right' });
  doc.text(formatMoney(finalTotal), totalsX, yPos, { align: 'right' });

  // 7. - Advance :
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("- Advance :", labelX, yPos, { align: 'right' });
  doc.text("-", totalsX, yPos, { align: 'right' });

  // 8. TOTAL AMOUNT (red/colored)
  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38); // Red color
  doc.text("TOTAL AMOUNT", labelX, yPos, { align: 'right' });
  doc.text(formatMoney(finalTotal), totalsX, yPos, { align: 'right' });

  // --- FOOTER NOTE ---
  const pageBottom = pageHeight - 30;
  yPos = Math.max(yPos + 20, pageBottom - 20); // ensure it's not overlapping totals

  doc.setFillColor(255, 248, 204); // subtle highlight yellow
  doc.rect(margin, yPos, pageWidth - margin * 2, 20, 'F');

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40); // darker text for bold
  const noteText = "Note: This is your estimated bill. An original bill will be generated from this estimate after completion of your order and delivery of your shipment.";

  // split text to fit
  const splitNote = doc.splitTextToSize(noteText, pageWidth - margin * 2 - 10);
  doc.text(splitNote, margin + 5, yPos + 8);

  // Footer branding
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by Mukesh Graphics ERP", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  const safeName = (quote.quotationNo || 'Quotation').replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`${safeName}.pdf`);
};
