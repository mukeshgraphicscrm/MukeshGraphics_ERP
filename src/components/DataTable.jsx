import React, { useState } from 'react';
import { Search, Download, Filter, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

export default function DataTable({
  title,
  subtitle,
  actionButton,
  columns,
  data,
  onRowClick,
  searchPlaceholder = "Search records...",
  toolbarExtra
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});

  const filteredData = data.filter(row => {
    // Global search
    let matchesSearch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      matchesSearch = columns.some(column => {
        // Use exportAccessor if available (since it formats arrays/objects nicely to string), else accessor
        const val = column.exportAccessor ? column.exportAccessor(row) : column.accessor(row);
        
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().includes(term));
        }
        return String(val || '').toLowerCase().includes(term);
      });
    }

    if (!matchesSearch) return false;

    // Column specific filters
    for (const [key, value] of Object.entries(columnFilters)) {
      if (value) {
        const column = columns[key];
        if (column) {
          const cellValue = String(column.accessor(row) || '').toLowerCase();
          if (!cellValue.includes(value.toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
  });

  const exportData = () => {
    if (filteredData.length === 0) return;

    // 1. Prepare data array (Headers + Rows)
    const exportColumns = columns.filter(c => c.header !== 'Actions' && !c.excludeFromExport);
    const headers = exportColumns.map(c => c.header);
    const dataArray = [headers];

    const merges = [];
    let currentRowIndex = 1; // Row 0 is the header

    filteredData.forEach(row => {
      // Get all values, handling arrays (from exportAccessor)
      const rowValues = exportColumns.map(c => {
        const val = c.exportAccessor ? c.exportAccessor(row) : c.accessor(row);
        return val;
      });

      // Find max items in this row to see if we need multiple excel rows
      let maxItems = 1;
      rowValues.forEach(val => {
        if (Array.isArray(val) && val.length > maxItems) {
          maxItems = val.length;
        }
      });

      for (let i = 0; i < maxItems; i++) {
        const excelRow = rowValues.map(val => {
          if (Array.isArray(val)) {
            return String(val[i] !== undefined && val[i] !== null ? val[i] : '');
          } else {
            // Only put non-array values in the first row of this block
            return i === 0 ? String(val !== null && val !== undefined ? val : '') : '';
          }
        });
        dataArray.push(excelRow);
      }

      // Add merges for non-array columns if there are multiple items
      if (maxItems > 1) {
        rowValues.forEach((val, colIdx) => {
          if (!Array.isArray(val)) {
            merges.push({
              s: { r: currentRowIndex, c: colIdx },
              e: { r: currentRowIndex + maxItems - 1, c: colIdx }
            });
          }
        });
      }

      currentRowIndex += maxItems;
    });

    // 2. Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(dataArray);
    if (merges.length > 0) {
      ws['!merges'] = merges;
    }

    // Apply vertical centering and basic styling
    for (const cellAddress in ws) {
      if (cellAddress.startsWith('!')) continue;

      if (!ws[cellAddress].s) ws[cellAddress].s = {};

      ws[cellAddress].s.alignment = {
        vertical: 'center',
        wrapText: true
      };

      ws[cellAddress].s.font = {
        name: 'Times New Roman',
        sz: 14
      };

      // Header row styling
      if (cellAddress.replace(/\D/g, '') === '1') {
        ws[cellAddress].s.font.bold = true;
      }
    }

    // 3. Automatically calculate and set column widths
    const colWidths = headers.map((header, colIndex) => {
      let maxLength = header.length;
      dataArray.forEach(row => {
        const cellValue = String(row[colIndex] || '');
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      // Calculate width with a balanced multiplier for size 14 font.
      // This prevents wrapping but avoids excessive empty space.
      return { wch: Math.min(Math.round(maxLength * 1.4) + 4, 100) };
    });
    ws['!cols'] = colWidths;

    // 4. Build and download workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export");

    const fileName = `${(title || 'export').replace(/\s+/g, '_').toLowerCase()}_export.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {(title || actionButton) && (
        <div className="pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-[14px] text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div>
            {actionButton}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="pb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div className="relative w-full flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent sm:text-[13px] transition-colors shadow-sm"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {toolbarExtra && (
            <div className="flex items-center shrink-0">
              {toolbarExtra}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          {showFilters && (
            <button
              onClick={() => {
                setColumnFilters({});
                setSearchTerm('');
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-gray-500" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg text-[13px] font-medium transition-colors shadow-sm ${showFilters
              ? 'border-brand-accent bg-brand-primary/5 text-brand-primary'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] border border-gray-200 rounded-xl bg-white shadow-sm mb-6 scrollbar-thin scrollbar-thumb-gray-200">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-white sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline outline-1 outline-gray-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
            {showFilters && (
              <tr className="bg-gray-50/50 border-t border-b border-gray-100">
                {columns.map((col, idx) => (
                  <th key={`filter-${idx}`} className="px-3 py-3 font-normal">
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors placeholder-gray-400 bg-white shadow-sm"
                      placeholder={`Filter ${col.header}...`}
                      value={columnFilters[idx] || ''}
                      onChange={(e) => setColumnFilters(prev => ({ ...prev, [idx]: e.target.value }))}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render ? col.render(row) : col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-500 text-[13px]">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
