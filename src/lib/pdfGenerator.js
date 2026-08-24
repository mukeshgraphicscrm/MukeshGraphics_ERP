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

  // Brand Colors (from tailwind config)
  const primaryColor = [30, 42, 74]; // #1E2A4A
  const accentColor = [212, 165, 116]; // #D4A574
  const lightGray = [245, 245, 245];

  // Helper for formatting Indian currency
  const formatMoney = (amount) => {
    return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- HEADER SECTION ---

  // Title "ESTIMATE"
  doc.setTextColor(...primaryColor); // Use premium blue for title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 6, 38, 28);
  }

  // Center title
  doc.text("ESTIMATE", pageWidth / 2, 26, { align: 'center' });

  // Add premium accent line below the header area
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

  // --- COMPANY & CUSTOMER INFO TABLE ---

  const custName = customers[quote.customerId]?.name || quote.customerId || 'Customer';
  const custCity = customers[quote.customerId]?.city || '';
  const custGst = customers[quote.customerId]?.gstNumber || '';
  const custMobile = customers[quote.customerId]?.mobile || '';

  const companyDetails = "MUKESH GRAPHICS\nBhavnagar, Gujarat.\nGST: 24ANVPB6301P1ZP\nMO: 9512007008 (Amanbhai)";
  let customerDetails = custName.toUpperCase();
  if (custCity) customerDetails += `\n${custCity.toUpperCase()}`;
  if (custGst) customerDetails += `\nGST: ${custGst.toUpperCase()}`;
  if (custMobile) customerDetails += `\nMO: ${custMobile}`;

  autoTable(doc, {
    startY: 48,
    head: [['From:', 'To:']],
    body: [[companyDetails, customerDetails]],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) / 2 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 },
    },
    margin: { left: margin, right: margin }
  });

  let yPos = doc.lastAutoTable.finalY + 10;

  // --- ITEMS TABLE SECTION ---

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

  // --- TOTALS SECTION TABLE ---

  yPos = doc.lastAutoTable.finalY + 10;

  // Calculate GST (assuming 18%)
  const gstAmount = subtotal * 0.18;
  const finalTotal = subtotal + gstAmount;

  const totalsData = [
    ['Total', formatMoney(subtotal)],
    ['+ Courier charges', '-'],
    ['+ Transportation', '-'],
    ['+ 18 % GST', formatMoney(gstAmount)],
    ['+ Previous Due', '-'],
    ['TOTAL', formatMoney(finalTotal)],
    ['- Advance', '-'],
    ['TOTAL AMOUNT', formatMoney(finalTotal)],
  ];

  autoTable(doc, {
    startY: yPos,
    body: totalsData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      textColor: [0, 0, 0],
      cellPadding: 4,
    },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', fillColor: [250, 250, 250] },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: pageWidth - 120, right: margin }, // align to right
    didParseCell: function (data) {
      if (data.row.index === 5 || data.row.index === 7) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.index === 7) {
          data.cell.styles.textColor = [220, 38, 38]; // Red color for final amount
        } else {
          data.cell.styles.textColor = primaryColor;
        }
      }
    }
  });

  yPos = doc.lastAutoTable.finalY;

  // --- FOOTER NOTE ---
  const pageBottom = pageHeight - 30;
  yPos = Math.max(yPos + 15, pageBottom - 20); // ensure it's not overlapping totals

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
