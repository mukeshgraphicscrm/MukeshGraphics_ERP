import React, { useState, useMemo } from 'react';
import { Calculator, Settings, TableProperties, Download, Printer } from 'lucide-react';
import XLSX from 'xlsx-js-style';

const PANCHING_VALUES = [
  1500, 2000, 2500, 2700, 2900, 3100, 3350, 3600, 3850, 4100, 
  4350, 4600, 4850, 5100, 5350, 5600, 5825, 6050, 6275, 6500
];

const LID_SIZES = [
  { size: '72mm', factor: 50, cartoonCharge: 2.40, rateAddition: (f) => 0 },
  { size: '71mm', factor: 53, cartoonCharge: 2.40, rateAddition: (f) => 0 },
  { size: '61mm', factor: 72, cartoonCharge: 2.22, rateAddition: (f) => 0 },
  { size: '59mm', factor: 76, cartoonCharge: 2.00, rateAddition: (f) => 0 },
  { size: '58mm', factor: 76, cartoonCharge: 2.00, rateAddition: (f) => 2 },
  { size: '54mm', factor: 90, cartoonCharge: 1.88, rateAddition: (f) => f },
  { size: '52 & 51mm', factor: 95, cartoonCharge: 1.76, rateAddition: (f) => f + 1 },
  { size: '47mm', factor: 115, cartoonCharge: 1.58, rateAddition: (f) => f + 2 },
  { size: '45mm', factor: 120, cartoonCharge: 1.50, rateAddition: (f) => f + 3 },
  { size: '43mm', factor: 138, cartoonCharge: 1.33, rateAddition: (f) => f + 4 },
  { size: '41.5mm', factor: 143, cartoonCharge: 1.20, rateAddition: (f) => f + 5 }
];

export default function LidRate() {
  const [params, setParams] = useState({
    jobSizeL: 18.2,
    jobSizeW: 24.25,
    quality: 'FBB',
    paperGsm: 230,
    rate: 102,
    fright: 2,
    smallLidFactor: 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.e ? e.target : e; // in case of direct value passing
    setParams(prev => ({
      ...prev,
      [name]: name === 'quality' ? value : (value === '' ? '' : Number(value))
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: name === 'quality' ? value : (value === '' ? '' : Number(value))
    }));
  }

  // Calculate Base Values
  const paperWt = useMemo(() => {
    const l = Number(params.jobSizeL) || 0;
    const w = Number(params.jobSizeW) || 0;
    const gsm = Number(params.paperGsm) || 0;
    return (l * w * gsm) / 1550;
  }, [params.jobSizeL, params.jobSizeW, params.paperGsm]);

  const baseAmount = useMemo(() => {
    const r = Number(params.rate) || 0;
    return (r * paperWt) / 1000;
  }, [params.rate, paperWt]);

  // Calculate Main Table
  const mainTable = useMemo(() => {
    const rows = [];
    const frightParam = Number(params.fright) || 0;
    const smallLidParam = Number(params.smallLidFactor) || 0;

    for (let i = 0; i < 20; i++) {
      const k = i + 1; 
      const qty = k * 1000;
      const amount = qty * baseAmount;
      
      let printing = 3000;
      if (qty > 3000) {
        printing = 3000 + 450 * (k - 3);
      }
      
      const panching = PANCHING_VALUES[i];
      const lidPacking = 250 * k * smallLidParam;
      const fright = 65 * k * frightParam; // 65 is hardcoded in Excel
      
      const totalAmount = amount + printing + panching + lidPacking + fright;
      const pr = 0.35 - (k - 1) * 0.01;
      const finalRate = totalAmount * (1 + pr);
      
      rows.push({
        qty,
        amount,
        printing,
        panching,
        lidPacking,
        fright,
        totalAmount,
        pr,
        finalRate
      });
    }
    return rows;
  }, [baseAmount, params.fright, params.smallLidFactor]);

  // Utility to format currency
  const fmt = (num) => {
    if (isNaN(num)) return '0.00';
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const fmtInt = (num) => {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const handleExport = () => {
    const ws = {};
    ws['!merges'] = [];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 29, c: 31 } });

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

    const borderAll = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    const bgYellow = { fgColor: { rgb: "FFF2CC" } };
    const bgGray = { fgColor: { rgb: "D9D9D9" } };
    const bgDarkGray = { fgColor: { rgb: "595959" } };
    const bgTitleGray = { fgColor: { rgb: "808080" } };
    const bgRed = { fgColor: { rgb: "FF0000" } };
    const bgOrange = { fgColor: { rgb: "F4B084" } };
    const bgLightGray = { fgColor: { rgb: "E7E6E6" } };

    const styleLabel = { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
    const styleValue = { border: borderAll, alignment: { horizontal: "center", vertical: "center" } };
    const styleHeader = { fill: bgGray, border: borderAll, font: { bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
    const styleData = { border: borderAll, alignment: { horizontal: "right", vertical: "center" } };

    // Set column widths
    ws['!cols'] = [];
    for(let i=0; i<=31; i++) ws['!cols'].push({ wch: 9 });
    ws['!cols'][0] = { wch: 10 };
    ws['!cols'][9] = { wch: 2 }; // Empty separator column J

    // Left block
    addMergedCell({ r: 0, c: 1 }, { r: 0, c: 2 }, "INCH", { fill: { fgColor: { rgb: "FFC000" } }, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });
    
    setCell(1, 0, "JOB SIZE", styleLabel);
    setCell(1, 1, params.jobSizeL, styleValue);
    setCell(1, 2, params.jobSizeW, styleValue);
    
    setCell(2, 0, "QUALITY", styleLabel);
    setCell(2, 1, params.quality, styleValue);
    
    setCell(3, 0, "PAPER GMS", styleLabel);
    setCell(3, 1, params.paperGsm, styleValue);
    
    setCell(4, 0, "RATE", styleLabel);
    setCell(4, 1, params.rate, { fill: bgRed, border: borderAll, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center" } });
    
    setCell(5, 0, "PAPER Wt.", styleLabel);
    setCell(5, 1, Number(paperWt.toFixed(2)), { ...styleValue, font: { color: { rgb: "00B050" } } });
    setCell(5, 2, "FRIGHT", styleHeader);
    addMergedCell({ r: 4, c: 4 }, { r: 4, c: 5 }, "FOR SMALL LID", { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } });
    
    setCell(6, 0, "AMOUNT", styleLabel);
    setCell(6, 1, Number(baseAmount.toFixed(2)), styleValue);
    setCell(6, 2, params.fright, { fill: bgOrange, border: borderAll, alignment: { horizontal: "center", vertical: "center" } });
    setCell(6, 4, params.smallLidFactor, { fill: bgGray, border: borderAll, font: { bold: true, color: { rgb: "FF0000" } }, alignment: { horizontal: "center", vertical: "center" } });
    setCell(6, 5, "", styleValue);

    // Main table headers
    const headersLeft = ["QTY.", "AMOUNT", "PRINTING", "PANCHING", "LID PAKING", "FRIGHT", "AMOUNT", "PR", "FINAL RATE"];
    headersLeft.forEach((h, i) => setCell(7, i, h, styleHeader));
    
    // Right block
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    addMergedCell({ r: 1, c: 10 }, { r: 4, c: 31 }, `FBB LID RATE ${dateStr}`, { fill: bgTitleGray, border: borderAll, font: { bold: true, sz: 16 }, alignment: { horizontal: "center", vertical: "center" } });

    LID_SIZES.forEach((lid, idx) => {
      const col = 10 + idx * 2;
      addMergedCell({ r: 5, c: col }, { r: 5, c: col + 1 }, lid.size, { fill: bgDarkGray, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderAll, alignment: { horizontal: "center", vertical: "center" } });
      
      setCell(6, col, lid.factor, { fill: bgLightGray, border: borderAll, alignment: { horizontal: "center", vertical: "center" } });
      const addVal = lid.rateAddition(Number(params.smallLidFactor) || 0);
      setCell(6, col + 1, `${addVal}   ${lid.size}`, { fill: bgLightGray, border: borderAll, alignment: { horizontal: "center", vertical: "center" } });
      
      setCell(7, col, "RATE", styleHeader);
      setCell(7, col + 1, "QTY.", styleHeader);
    });

    // Data rows
    mainTable.forEach((row, i) => {
      const r = 8 + i;
      setCell(r, 0, row.qty, styleData);
      setCell(r, 1, Math.round(row.amount), styleData);
      setCell(r, 2, Math.round(row.printing), styleData);
      setCell(r, 3, Math.round(row.panching), styleData);
      setCell(r, 4, Math.round(row.lidPacking), styleData);
      setCell(r, 5, Math.round(row.fright), styleData);
      setCell(r, 6, Math.round(row.totalAmount), styleData);
      
      const prStyle = (i === 0) ? { fill: bgOrange, border: borderAll, font: { bold: true }, alignment: { horizontal: "right", vertical: "center" } } : styleData;
      setCell(r, 7, row.pr, prStyle);
      
      setCell(r, 8, Math.round(row.finalRate), styleData);

      LID_SIZES.forEach((lid, idx) => {
        const col = 10 + idx * 2;
        const lidQty = lid.factor * row.qty;
        const lidRate = (row.finalRate / lidQty) * 1000 + lid.rateAddition(Number(params.smallLidFactor) || 0);
        
        setCell(r, col, Math.round(lidRate), styleData);
        setCell(r, col + 1, lidQty, styleData);
      });
    });

    // Bottom cartoon charge
    addMergedCell({ r: 28, c: 7 }, { r: 29, c: 8 }, "CARTOON CHARGE\nPER 1000", styleHeader);
    LID_SIZES.forEach((lid, idx) => {
      const col = 10 + idx * 2;
      addMergedCell({ r: 28, c: col }, { r: 29, c: col + 1 }, Number(lid.cartoonCharge.toFixed(2)), styleHeader);
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LidRate");
    XLSX.writeFile(wb, `Lid_Rate_${dateStr}.xlsx`);
  };

  return (
    <div id="lid-rate-content" className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-gray-50/50 p-2 sm:p-0 rounded-2xl sm:rounded-none">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Lid Rate Calculator
            </h1>
          </div>
          <p className="text-gray-500 ml-4 text-sm font-medium print:hidden">Real-time computation for FBB Lid Rates</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm font-semibold text-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b2f63] text-white rounded-lg hover:bg-[#12224d] transition-colors shadow-sm font-semibold text-sm"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Top Configuration & Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Parameters */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:break-inside-avoid print:border-gray-300">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Job Parameters</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Size (L)</label>
              <input type="number" step="0.01" name="jobSizeL" value={params.jobSizeL} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Size (W)</label>
              <input type="number" step="0.01" name="jobSizeW" value={params.jobSizeW} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quality</label>
              <input type="text" name="quality" value={params.quality} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paper GSM</label>
              <input type="number" name="paperGsm" value={params.paperGsm} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
            
            <div className="col-span-2 sm:col-span-1 space-y-1 bg-orange-50/50 p-3 -m-3 rounded-lg border border-orange-100/50">
              <label className="text-xs font-bold text-orange-600 uppercase tracking-wider">Base Rate</label>
              <input type="number" name="rate" value={params.rate} onChange={handleInputChange} className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-extrabold text-orange-700 bg-white shadow-inner" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fright</label>
              <input type="number" step="0.1" name="fright" value={params.fright} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">For Small Lid</label>
              <input type="number" step="0.1" name="smallLidFactor" value={params.smallLidFactor} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900" />
            </div>
          </div>
        </div>

        {/* Calculated Totals */}
        <div className="lg:col-span-4 grid grid-rows-2 gap-4 print:break-inside-avoid">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-5 shadow-md flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="w-16 h-16 text-white" /></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 relative z-10">Paper Wt.</p>
            <p className="text-4xl font-extrabold text-white tracking-tight relative z-10">{fmt(paperWt)}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl border border-indigo-500 p-5 shadow-md flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="w-16 h-16 text-white" /></div>
            <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1 relative z-10">Base Amount (per 1k)</p>
            <p className="text-4xl font-extrabold text-white tracking-tight relative z-10">₹{fmt(baseAmount)}</p>
          </div>
        </div>
      </div>

      {/* Main Calculation Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:border-gray-300">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Main Calculation</h2>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2.5 py-1 rounded-full">UP TO 20K QTY</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase tracking-wider bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 bg-gray-100/50 sticky left-0 shadow-[1px_0_0_0_#e5e7eb]">QTY.</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Printing</th>
                <th className="px-4 py-3 text-right">Panching</th>
                <th className="px-4 py-3 text-right">Lid Paking</th>
                <th className="px-4 py-3 text-right">Fright</th>
                <th className="px-4 py-3 text-right bg-blue-50/50 text-blue-800">Total Amount</th>
                <th className="px-4 py-3 text-right text-orange-600">PR</th>
                <th className="px-4 py-3 text-right bg-green-50/80 text-green-800 font-extrabold">Final Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mainTable.map((row) => (
                <tr key={row.qty} className="hover:bg-blue-50/30 transition-colors print:break-inside-avoid">
                  <td className="px-4 py-2.5 font-bold text-gray-900 bg-white sticky left-0 shadow-[1px_0_0_0_#e5e7eb] print:shadow-none print:border-r print:border-gray-200">{fmtInt(row.qty)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-600">{fmtInt(row.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtInt(row.printing)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtInt(row.panching)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtInt(row.lidPacking)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtInt(row.fright)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-700 bg-blue-50/20">{fmtInt(row.totalAmount)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{row.pr.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-green-700 bg-green-50/30">₹{fmtInt(row.finalRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lid Size Matrix */}
      {[LID_SIZES.slice(0, 6), LID_SIZES.slice(6)].map((lidSizesChunk, chunkIdx) => (
        <div key={chunkIdx} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:border-gray-300">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-teal-600" />
              Lid Size Matrix <span className="text-gray-500 font-medium text-sm ml-2">{chunkIdx === 0 ? '(72mm to 54mm)' : '(52&51mm to 41.5mm)'}</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase tracking-wider text-gray-600 font-bold border-b border-gray-200">
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 bg-gray-200 sticky left-0 shadow-[1px_0_0_0_#d1d5db] z-20">Size</th>
                  {lidSizesChunk.map(lid => (
                    <th key={lid.size} colSpan={2} className="px-3 py-2 text-center border-l border-gray-300 first:border-l-0 text-slate-800">
                      {lid.size} <span className="text-gray-400 block text-[9px] mt-0.5">F: {lid.factor}</span>
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 bg-gray-100 sticky left-0 shadow-[1px_0_0_0_#e5e7eb] z-20 text-gray-500">Base QTY</th>
                  {lidSizesChunk.map((lid, idx) => (
                    <React.Fragment key={idx}>
                      <th className="px-3 py-2 text-right border-l border-gray-200 text-teal-700 w-24">RATE</th>
                      <th className="px-3 py-2 text-right text-gray-500 w-24">QTY</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mainTable.map((row) => (
                  <tr key={row.qty} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                    <td className="px-3 py-1.5 font-bold text-slate-700 bg-white sticky left-0 shadow-[1px_0_0_0_#e5e7eb] z-10 print:shadow-none print:border-r print:border-gray-200">{fmtInt(row.qty)}</td>
                    {lidSizesChunk.map((lid, idx) => {
                      const lidQty = lid.factor * row.qty;
                      const lidRate = (row.finalRate / lidQty) * 1000 + lid.rateAddition(Number(params.smallLidFactor) || 0);
                      return (
                        <React.Fragment key={idx}>
                          <td className="px-3 py-1.5 text-right font-bold text-teal-700 border-l border-gray-100 bg-teal-50/20">{fmtInt(lidRate)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-600 text-xs">{fmtInt(lidQty)}</td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100/80 font-semibold text-gray-700">
                <tr>
                  <td className="px-3 py-3 sticky left-0 bg-gray-200 shadow-[1px_0_0_0_#d1d5db] z-20 text-[11px] uppercase tracking-wider">
                    Cartoon Charge<br/><span className="text-[9px] text-gray-500">Per 1000</span>
                  </td>
                  {lidSizesChunk.map((lid, idx) => (
                    <td key={idx} colSpan={2} className="px-3 py-3 text-center border-l border-gray-300 first:border-l-0 text-slate-800 bg-slate-200/50">
                      {lid.cartoonCharge.toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
      
    </div>
  );
}
