import React, { useState, useMemo } from 'react';
import { Calculator, Settings, TableProperties, Download, Printer } from 'lucide-react';
import XLSX from 'xlsx-js-style';

const InputField = ({ label, name, type = "number", step = "1", width = "full", value, onChange }) => (
  <div className={`space-y-1 w-${width}`}>
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      step={step} 
      name={name} 
      value={value} 
      onChange={onChange} 
      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-gray-900 text-sm bg-white shadow-sm" 
    />
  </div>
);

export default function SingleVariant() {
  const [params, setParams] = useState({
    quality: 'FBB',
    jobSizeL: 18,
    jobSizeW: 23,
    ups: 9,
    gsm: 300,
    qty: 5000,
    rate: 85,
    fright: 600,
    printingBaseRate: 3500,
    extraPrintRate: 500,
    laminationRate: 0.4,
    dripoffRate: 0,
    panchingRate: 600,
    foilsRate: 0,
    pestingBoxRate: 150,
    pakingQty: 2500,
    pakingRate: 60,
    dieChargeRate: 500,
    prPercent: 25
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: name === 'quality' ? value : (value === '' ? '' : Number(value))
    }));
  };

  const calc = useMemo(() => {
    const p = {};
    Object.keys(params).forEach(k => {
      p[k] = k === 'quality' ? params[k] : Number(params[k]) || 0;
    });

    const boxQty = p.qty * p.ups;
    const paperWt = (p.jobSizeL * p.jobSizeW * p.gsm * p.qty) / 1550000;
    const paperAmount = (paperWt * p.rate) + p.fright;
    
    let extraQty = p.qty - 3000;
    const printingAmount = (extraQty * p.extraPrintRate / 1000) + p.printingBaseRate;
    
    const laminationAmount = (p.jobSizeL * p.jobSizeW * p.qty * p.laminationRate) / 100;
    
    const dripoffAmount = (p.jobSizeL * p.jobSizeW * p.qty / 100) * p.dripoffRate;
    
    const panchingAmount = (p.qty * p.panchingRate) / 1000;
    
    const foilsAmount = (boxQty * p.foilsRate) / 1000;
    
    const pestingBoxAmount = (boxQty * p.pestingBoxRate) / 1000;
    
    const pakingAmount = p.pakingQty > 0 ? (boxQty / p.pakingQty) * p.pakingRate : 0;
    
    const dieChargeAmount = p.ups * p.dieChargeRate;
    
    // As per Excel sheet F30, pakingAmount is not included in this Total sum.
    const totalAmount = paperAmount + printingAmount + laminationAmount + dripoffAmount + 
                        panchingAmount + foilsAmount + pestingBoxAmount + dieChargeAmount;
    
    const prAmount = (totalAmount * p.prPercent) / 100;
    
    const finalTotalAmount = totalAmount + prAmount;
    
    const perBoxRate = boxQty > 0 ? finalTotalAmount / boxQty : 0;

    return {
      boxQty,
      paperWt,
      paperAmount,
      printingAmount,
      laminationAmount,
      dripoffAmount,
      panchingAmount,
      foilsAmount,
      pestingBoxAmount,
      pakingAmount,
      dieChargeAmount,
      totalAmount,
      prAmount,
      finalTotalAmount,
      perBoxRate,
      extraQty
    };
  }, [params]);

  const fmt = (num) => {
    if (isNaN(num)) return '0.000';
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  };

  const fmtInt = (num) => {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const handleExport = () => {
    const ws = {};
    ws['!merges'] = [];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 40, c: 8 } });

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

    const bgYellow = { fgColor: { rgb: "FFFF00" } };
    const bgGreen = { fgColor: { rgb: "00B050" } };
    const bgBlue = { fgColor: { rgb: "00B0F0" } };
    const styleLabel = { border: borderAll, font: { bold: true }, alignment: { horizontal: "left", vertical: "center" } };
    const styleValue = { border: borderAll, alignment: { horizontal: "center", vertical: "center" } };
    
    // Title
    addMergedCell({ r: 1, c: 1 }, { r: 1, c: 6 }, "NORMAL BOX RATE", { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } });

    // Headers
    setCell(3, 1, "PAPER", styleLabel);
    setCell(3, 3, params.quality, { font: { bold: true, color: { rgb: "FF0000" } }, alignment: { horizontal: "center" } });
    setCell(3, 5, "UPS", styleLabel);
    setCell(3, 6, "BOX QTY.", styleLabel);

    setCell(4, 1, "JOB SIZE", styleLabel);
    setCell(4, 3, params.jobSizeL, styleValue);
    setCell(4, 4, params.jobSizeW, styleValue);
    setCell(4, 5, params.ups, styleValue);
    setCell(4, 6, calc.boxQty, { font: { bold: true, color: { rgb: "FF0000" } }, alignment: { horizontal: "center" } });

    setCell(5, 1, "GMS", styleLabel);
    setCell(5, 3, params.gsm, styleValue);
    setCell(5, 5, params.rate, styleValue); // Rate

    setCell(6, 1, "QTY.", styleLabel);
    setCell(6, 3, params.qty, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(7, 1, "FRIGHT", styleLabel);
    setCell(7, 3, params.fright, styleValue);
    setCell(7, 6, calc.paperAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(8, 1, "PAPER Wt.", styleLabel);
    setCell(8, 3, calc.paperWt, styleValue);

    setCell(10, 1, "PRINTING COPY", styleLabel);
    setCell(10, 3, params.qty, styleValue);
    setCell(10, 5, params.printingBaseRate, styleValue);
    setCell(10, 6, calc.printingAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(11, 1, "EXTRA", styleLabel);
    setCell(11, 3, calc.extraQty, styleValue);
    setCell(11, 5, params.extraPrintRate, styleValue);

    setCell(13, 1, "LAMINATION", styleLabel);
    setCell(13, 3, params.jobSizeL, styleValue);
    setCell(13, 4, params.jobSizeW, styleValue);
    setCell(13, 5, params.laminationRate, styleValue);
    setCell(13, 6, calc.laminationAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(15, 1, "DRIPOFF", styleLabel);
    setCell(15, 3, params.jobSizeL * params.jobSizeW, styleValue);
    setCell(15, 4, (params.jobSizeL * params.jobSizeW * params.qty) / 100, styleValue);
    setCell(15, 5, params.dripoffRate, styleValue);
    setCell(15, 6, calc.dripoffAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(17, 1, "PANCHING", styleLabel);
    setCell(17, 3, params.qty, styleValue);
    setCell(17, 5, params.panchingRate, styleValue);
    setCell(17, 6, calc.panchingAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(19, 1, "FOILS", styleLabel);
    setCell(19, 3, calc.boxQty, styleValue);
    setCell(19, 5, params.foilsRate, styleValue);
    setCell(19, 6, calc.foilsAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(21, 1, "PESTING BOX", styleLabel);
    setCell(21, 3, calc.boxQty, styleValue);
    setCell(21, 5, params.pestingBoxRate, styleValue);
    setCell(21, 6, calc.pestingBoxAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(23, 1, "PAKING", styleLabel);
    setCell(23, 3, params.pakingQty, styleValue);
    setCell(23, 4, params.pakingQty > 0 ? (calc.boxQty / params.pakingQty) : 0, styleValue);
    setCell(23, 5, params.pakingRate, styleValue);
    setCell(23, 6, calc.pakingAmount, styleValue);

    setCell(25, 1, "TRANSPORT", styleLabel);

    setCell(27, 1, "DIE CHARGE", styleLabel);
    setCell(27, 3, "UPS", styleValue);
    setCell(27, 4, params.ups, styleValue);
    setCell(27, 5, params.dieChargeRate, styleValue);
    setCell(27, 6, calc.dieChargeAmount, { fill: bgYellow, border: borderAll, font: { bold: true }, alignment: { horizontal: "center" } });

    setCell(29, 1, "TOTAL", { ...styleLabel, font: { bold: true, sz: 14 } });
    setCell(29, 5, calc.totalAmount, { fill: bgBlue, font: { bold: true, color: { rgb: "FFFFFF" } }, border: borderAll, alignment: { horizontal: "center" } });

    setCell(31, 1, "PR", styleLabel);
    setCell(31, 3, "TOTAL", styleLabel);
    setCell(31, 5, "PER BOX", styleLabel);

    setCell(32, 1, params.prPercent, styleValue);
    setCell(32, 2, calc.prAmount, styleValue);
    setCell(32, 3, calc.finalTotalAmount, { fill: bgGreen, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, border: borderAll, alignment: { horizontal: "center" } });
    setCell(32, 5, calc.perBoxRate, { fill: bgGreen, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, border: borderAll, alignment: { horizontal: "center" } });

    ws['!cols'] = [
      { wch: 2 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SingleVariant");
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    XLSX.writeFile(wb, `Single_Variant_${dateStr}.xlsx`);
  };


  return (
    <div id="single-variant-content" className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-gray-50/50 p-2 sm:p-0 rounded-2xl sm:rounded-none">
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hidden { display: none !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 1rem !important; }
        }
      `}</style>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Single Variant Calculator
            </h1>
          </div>
          <p className="text-gray-500 ml-4 text-sm font-medium print-hidden">Real-time box rate computation</p>
        </div>
        <div className="flex gap-3 print-hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
        
        {/* Left Side: Inputs */}
        <div className="lg:col-span-6 space-y-6 print:mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
              <Settings className="w-4 h-4 text-teal-600" />
              <h2 className="font-bold text-gray-900 text-sm">Job Parameters</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              <InputField label="Paper Quality" name="quality" type="text" value={params.quality} onChange={handleInputChange} />
              <InputField label="Job Size (L)" name="jobSizeL" step="0.01" value={params.jobSizeL} onChange={handleInputChange} />
              <InputField label="Job Size (W)" name="jobSizeW" step="0.01" value={params.jobSizeW} onChange={handleInputChange} />
              <InputField label="UPS" name="ups" value={params.ups} onChange={handleInputChange} />
              <InputField label="GSM" name="gsm" value={params.gsm} onChange={handleInputChange} />
              <InputField label="Sheet QTY" name="qty" value={params.qty} onChange={handleInputChange} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900 text-sm">Rates & Charges</h2>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InputField label="Paper Rate/Kg" name="rate" step="0.01" value={params.rate} onChange={handleInputChange} />
              <InputField label="Fright" name="fright" step="0.01" value={params.fright} onChange={handleInputChange} />
              <InputField label="PR (%)" name="prPercent" step="0.01" value={params.prPercent} onChange={handleInputChange} />
              
              <InputField label="Base Print Rate" name="printingBaseRate" value={params.printingBaseRate} onChange={handleInputChange} />
              <InputField label="Extra Print/1K" name="extraPrintRate" value={params.extraPrintRate} onChange={handleInputChange} />
              <InputField label="Lamination Rate" name="laminationRate" step="0.01" value={params.laminationRate} onChange={handleInputChange} />
              
              <InputField label="Dripoff Rate" name="dripoffRate" step="0.01" value={params.dripoffRate} onChange={handleInputChange} />
              <InputField label="Panching / 1K" name="panchingRate" value={params.panchingRate} onChange={handleInputChange} />
              <InputField label="Foils / 1K Box" name="foilsRate" value={params.foilsRate} onChange={handleInputChange} />
              
              <InputField label="Pesting / 1K Box" name="pestingBoxRate" value={params.pestingBoxRate} onChange={handleInputChange} />
              <InputField label="Paking QTY/Pack" name="pakingQty" value={params.pakingQty} onChange={handleInputChange} />
              <InputField label="Paking Rate/Pack" name="pakingRate" value={params.pakingRate} onChange={handleInputChange} />
              
              <InputField label="Die Charge/UPS" name="dieChargeRate" value={params.dieChargeRate} onChange={handleInputChange} />
            </div>
          </div>
        </div>

        {/* Right Side: Output Details */}
        <div className="lg:col-span-6 print:break-before-page">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center justify-between">
              <h2 className="font-bold text-teal-900 text-lg">Calculation Summary</h2>
              <div className="text-right">
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Box Qty</span>
                <span className="text-xl font-extrabold text-teal-700">{fmtInt(calc.boxQty)}</span>
              </div>
            </div>
            
            <div className="flex-1 p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700 w-1/2">Paper (Wt: {fmt(calc.paperWt)} Kg)</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.paperAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Printing (Base + {calc.extraQty} Extra)</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.printingAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Lamination</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.laminationAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Dripoff</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.dripoffAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Panching</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.panchingAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Foils</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.foilsAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Pesting Box</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.pestingBoxAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Paking <span className="text-xs text-gray-400 font-normal">(Not in Total)</span></td>
                    <td className="px-5 py-3 text-right font-bold text-gray-500">₹{fmt(calc.pakingAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-700">Die Charge</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">₹{fmt(calc.dieChargeAmount)}</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="px-5 py-3 font-bold text-blue-900 text-base">TOTAL</td>
                    <td className="px-5 py-3 text-right font-extrabold text-blue-700 text-lg">₹{fmt(calc.totalAmount)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-orange-600">PR ({params.prPercent}%)</td>
                    <td className="px-5 py-3 text-right font-bold text-orange-600">₹{fmt(calc.prAmount)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-emerald-50">
                  <tr>
                    <td className="px-5 py-4 font-bold text-emerald-900 text-lg">FINAL TOTAL</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-700 text-2xl">₹{fmt(calc.finalTotalAmount)}</td>
                  </tr>
                  <tr className="border-t border-emerald-100 bg-emerald-100/50">
                    <td className="px-5 py-3 font-bold text-emerald-900">PER BOX RATE</td>
                    <td className="px-5 py-3 text-right font-black text-emerald-800 text-xl">₹{fmt(calc.perBoxRate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
