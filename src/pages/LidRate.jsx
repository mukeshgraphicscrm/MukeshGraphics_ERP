import React, { useState, useMemo } from 'react';
import { Calculator, Settings, TableProperties, Download, Printer } from 'lucide-react';

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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Lid Rate Calculator
            </h1>
          </div>
          <p className="text-gray-500 ml-4 text-sm font-medium">Real-time computation for FBB Lid Rates</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary whitespace-nowrap hidden sm:flex">
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          <button className="btn-secondary whitespace-nowrap hidden sm:flex" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Top Configuration & Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Parameters */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
        <div className="lg:col-span-4 grid grid-rows-2 gap-4">
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                <tr key={row.qty} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-gray-900 bg-white sticky left-0 shadow-[1px_0_0_0_#e5e7eb]">{fmtInt(row.qty)}</td>
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-teal-600" />
            Lid Size Matrix
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase tracking-wider text-gray-600 font-bold border-b border-gray-200">
              <tr className="bg-gray-100">
                <th className="px-3 py-2 bg-gray-200 sticky left-0 shadow-[1px_0_0_0_#d1d5db] z-20">Size</th>
                {LID_SIZES.map(lid => (
                  <th key={lid.size} colSpan={2} className="px-3 py-2 text-center border-l border-gray-300 first:border-l-0 text-slate-800">
                    {lid.size} <span className="text-gray-400 block text-[9px] mt-0.5">F: {lid.factor}</span>
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 bg-gray-100 sticky left-0 shadow-[1px_0_0_0_#e5e7eb] z-20 text-gray-500">Base QTY</th>
                {LID_SIZES.map((lid, idx) => (
                  <React.Fragment key={idx}>
                    <th className="px-3 py-2 text-right border-l border-gray-200 text-teal-700 w-24">RATE</th>
                    <th className="px-3 py-2 text-right text-gray-500 w-24">QTY</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mainTable.map((row) => (
                <tr key={row.qty} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-1.5 font-bold text-slate-700 bg-white sticky left-0 shadow-[1px_0_0_0_#e5e7eb] z-10">{fmtInt(row.qty)}</td>
                  {LID_SIZES.map((lid, idx) => {
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
                {LID_SIZES.map((lid, idx) => (
                  <td key={idx} colSpan={2} className="px-3 py-3 text-center border-l border-gray-300 first:border-l-0 text-slate-800 bg-slate-200/50">
                    {lid.cartoonCharge.toFixed(2)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
    </div>
  );
}
