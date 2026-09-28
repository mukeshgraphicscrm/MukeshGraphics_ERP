const fs = require('fs');
const filePath = 'src/pages/SingleVariant.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /  const handleExport = \(\) => \{[\s\S]*?\n  \};\n\n  return/m;

const newHandleExport = `  const handleExport = () => {
    const ws = {};
    ws['!merges'] = [];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 35, c: 8 } });

    const setCell = (r, c, val, style = {}) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      ws[cellRef] = { v: val, s: style, t: typeof val === 'number' ? 'n' : 's' };
    };

    const addMergedCell = (s, e, value, style) => {
      for (let R = s.r; R <= e.r; ++R) {
        for (let C = s.c; C <= e.c; ++C) {
          if (R === s.r && C === s.c) {
            setCell(R, C, value, style);
          } else {
            setCell(R, C, "", style);
          }
        }
      }
      ws['!merges'].push({ s, e });
    };

    const borderAll = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

    const bgOrange = { fgColor: { rgb: "ED7D31" } };
    const bgYellow = { fgColor: { rgb: "FFC000" } };
    const bgLightBlue = { fgColor: { rgb: "9BC2E6" } };
    const bgLightYellow = { fgColor: { rgb: "FFE699" } };
    const bgBrightBlue = { fgColor: { rgb: "00B0F0" } };

    const styleHeader = { fill: bgOrange, border: borderAll, font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } };
    const styleLabel = { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const styleValue = { fill: bgLightBlue, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const styleRate = { fill: bgLightYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const styleAmount = { fill: bgBrightBlue, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const styleWhiteValue = { border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };

    let r = 1;
    addMergedCell({ r, c: 1 }, { r, c: 6 }, "NORMAL BOX RATE", styleHeader);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PAPER", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.quality, styleValue);
    setCell(r, 5, "UPS", styleLabel);
    setCell(r, 6, "BOX QTY.", styleLabel);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "JOB SIZE", styleLabel);
    setCell(r, 3, params.jobSizeL, styleValue);
    setCell(r, 4, params.jobSizeW, styleValue);
    setCell(r, 5, params.ups, styleRate);
    setCell(r, 6, calc.boxQty, styleWhiteValue);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "GMS", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.gsm, styleValue);
    addMergedCell({ r, c: 5 }, { r: r + 3, c: 5 }, params.rate, styleRate);
    setCell(r, 6, "", styleWhiteValue);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "QTY.", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.qty, styleValue);
    setCell(r, 6, "", styleWhiteValue);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "FRIGHT", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.fright, styleValue);
    addMergedCell({ r, c: 6 }, { r: r + 1, c: 6 }, calc.paperAmount, styleAmount);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PAPER Wt.", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, Math.round(calc.paperWt * 10)/10, styleValue);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PRINTING COPY", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.qty, styleValue);
    setCell(r, 5, params.printingBaseRate, styleLabel);
    addMergedCell({ r, c: 6 }, { r: r + 1, c: 6 }, calc.printingAmount, styleAmount);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "EXTRA", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, calc.extraQty, styleValue);
    setCell(r, 5, params.extraPrintRate, styleRate);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "LAMINATION", styleLabel);
    setCell(r, 3, params.jobSizeL, styleValue);
    setCell(r, 4, params.jobSizeW, styleValue);
    setCell(r, 5, params.laminationRate, styleRate);
    setCell(r, 6, calc.laminationAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "DRIPOFF", styleLabel);
    setCell(r, 3, params.jobSizeL * params.jobSizeW, styleValue);
    setCell(r, 4, (params.jobSizeL * params.jobSizeW * params.qty) / 100, styleValue);
    setCell(r, 5, params.dripoffRate, styleRate);
    setCell(r, 6, calc.dripoffAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PANCHING", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, params.qty, styleValue);
    setCell(r, 5, params.panchingRate, styleRate);
    setCell(r, 6, calc.panchingAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "FOILS", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, calc.boxQty, styleValue);
    setCell(r, 5, params.foilsRate, styleRate);
    setCell(r, 6, calc.foilsAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PESTING BOX", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, calc.boxQty, styleValue);
    setCell(r, 5, params.pestingBoxRate, styleRate);
    setCell(r, 6, calc.pestingBoxAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PAKING", styleLabel);
    setCell(r, 3, params.pakingQty, styleValue);
    setCell(r, 4, params.pakingQty > 0 ? (calc.boxQty / params.pakingQty) : 0, styleValue);
    setCell(r, 5, params.pakingRate, styleRate);
    setCell(r, 6, calc.pakingAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "TRANSPORT", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, "", styleValue);
    setCell(r, 5, "", styleRate);
    setCell(r, 6, "", styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "DIE CHARGE", styleLabel);
    setCell(r, 3, "UPS", styleValue);
    setCell(r, 4, params.ups, styleValue);
    setCell(r, 5, params.dieChargeRate, styleRate);
    setCell(r, 6, calc.dieChargeAmount, styleAmount);

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 3 }, "PESTING + PAKING : 100+20", { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } });

    r += 1;
    addMergedCell({ r, c: 1 }, { r, c: 4 }, "TOTAL", styleLabel);
    addMergedCell({ r, c: 5 }, { r, c: 6 }, calc.totalAmount, styleAmount);

    r += 2;
    addMergedCell({ r, c: 1 }, { r, c: 2 }, "PR", styleLabel);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, "TOTAL", styleLabel);
    addMergedCell({ r, c: 5 }, { r, c: 6 }, "PER BOX", styleLabel);

    r += 1;
    setCell(r, 1, params.prPercent, styleValue);
    setCell(r, 2, calc.prAmount, styleValue);
    addMergedCell({ r, c: 3 }, { r, c: 4 }, calc.finalTotalAmount, styleValue);
    addMergedCell({ r, c: 5 }, { r, c: 6 }, calc.perBoxRate, styleValue);

    ws['!cols'] = [
      { wch: 2 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SingleVariant");
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\\//g, '-');
    XLSX.writeFile(wb, \`Single_Variant_\${dateStr}.xlsx\`);
  };

  return`;

content = content.replace(regex, newHandleExport);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed export styling');
