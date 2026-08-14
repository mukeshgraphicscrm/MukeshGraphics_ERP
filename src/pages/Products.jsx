import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, Box, Download } from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import AddCategoryModal from '../components/AddCategoryModal';
import CustomSelect from '../components/CustomSelect';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showExportModal) {
        setShowExportModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal]);

  const handleExportClick = () => {
    if (filteredProducts.length === 0) {
      toast.error('No products to export');
      return;
    }
    setShowExportModal(true);
  };

  const handleExport = async (withPrice) => {
    setShowExportModal(false);
    setIsExporting(true);
    const toastId = toast.loading('Generating PDF Catalog...');

    try {
      const doc = new jsPDF({ format: 'a4' });
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const margin = 15;
      const cardWidth = (pageWidth - margin * 2 - 10) / 2; // 2 cols, 10mm gap
      const cardHeight = 100;

      let yPos = 40;
      let col = 0;

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

      const logoBase64 = await loadImage('/logo.png');

      const drawHeader = () => {
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, 10, 20, 20);
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(27, 47, 99);
        doc.text("Mukesh Graphics", margin + (logoBase64 ? 25 : 0), 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Product Catalog", margin + (logoBase64 ? 25 : 0), 26);

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, 35, pageWidth - margin, 35);
      };

      drawHeader();

      for (let i = 0; i < filteredProducts.length; i++) {
        const p = filteredProducts[i];

        if (yPos + cardHeight > pageHeight - margin - 10) {
          doc.addPage();
          drawHeader();
          yPos = 40;
          col = 0;
        }

        const xPos = margin + col * (cardWidth + 10);

        // Draw Card Border
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, "FD");

        // Draw Image area background
        doc.setFillColor(27, 47, 99);
        doc.roundedRect(xPos, yPos, cardWidth, 40, 3, 3, "F");
        doc.rect(xPos, yPos + 20, cardWidth, 20, "F"); // cover bottom corners

        if (p.image) {
          const imgUrl = p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`;
          const imgBase64 = await loadImage(imgUrl);
          if (imgBase64) {
            doc.addImage(imgBase64, 'PNG', xPos + (cardWidth - 36) / 2, yPos + 2, 36, 36);
          }
        }

        // Product Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        const splitTitle = doc.splitTextToSize(p.name || '-', cardWidth - 10);
        doc.text(splitTitle[0], xPos + 5, yPos + 48);

        // Category
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(p.category || 'Uncategorized', xPos + 5, yPos + 54);

        // Details Grid
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Material", xPos + 5, yPos + 62);
        doc.text("GSM", xPos + cardWidth / 2 + 2, yPos + 62);

        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "bold");
        const mat = doc.splitTextToSize(p.material || '-', cardWidth / 2 - 5)[0];
        const gsm = doc.splitTextToSize(p.gsm?.toString() || '-', cardWidth / 2 - 5)[0];
        doc.text(mat, xPos + 5, yPos + 66);
        doc.text(gsm, xPos + cardWidth / 2 + 2, yPos + 66);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text("Printing", xPos + 5, yPos + 74);
        doc.text("Dimensions", xPos + cardWidth / 2 + 2, yPos + 74);

        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "bold");
        const prt = doc.splitTextToSize(p.printing || '-', cardWidth / 2 - 5)[0];
        const dim = doc.splitTextToSize(p.dimensions || '-', cardWidth / 2 - 5)[0];
        doc.text(prt, xPos + 5, yPos + 78);
        doc.text(dim, xPos + cardWidth / 2 + 2, yPos + 78);

        // Line separator
        doc.setDrawColor(240, 240, 240);
        doc.line(xPos, yPos + 86, xPos + cardWidth, yPos + 86);

        if (withPrice) {
          // Unit Price
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text("Unit price", xPos + 5, yPos + 94);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(27, 47, 99);
          doc.text(`Rs ${Number(p.unitPrice || 0).toLocaleString('en-IN')}`, xPos + cardWidth - 5, yPos + 94, { align: 'right' });
        }

        col++;
        if (col === 2) {
          col = 0;
          yPos += cardHeight + 10;
        }
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      const date = new Date();
      const dd = date.getDate().toString().padStart(2, '0');
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = date.getFullYear();
      doc.save(`Product_Catalog_${dd}-${mm}-${yyyy}.pdf`);
      toast.success('Catalog exported successfully!', { id: toastId });
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('Failed to export catalog.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    api.get('/products')
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });

    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Food Packaging': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pharma Packaging': return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'FMCG': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    ...categories.map(cat => ({ label: cat.name, value: cat.name }))
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Product Master...</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Product Master</h2>
            <p className="text-sm text-gray-500 mt-1">Catalog of standard SKUs across food, pharma and FMCG packaging.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn-add w-fit"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Add Category</span>
            </button>
            <button
              onClick={() => {
                setStartInEditMode(true);
                setProductToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="btn-add w-fit"
            >
              <Plus className="w-4 h-4 mr-1" /> <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, categories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent bg-white shadow-sm"
            />
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none w-full sm:w-48 z-20">
              <CustomSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={categoryOptions}
                placeholder="All Categories"
                icon={Filter}
                triggerClassName="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer flex justify-between items-center"
              />
            </div>
            <button
              onClick={handleExportClick}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col border border-gray-200 cursor-pointer"
              onClick={() => {
                setStartInEditMode(false);
                setProductToEdit(product);
                setIsAddModalOpen(true);
              }}
            >
              {/* Card Header (Dark Blue) */}
              <div className="bg-[#1b2f63] h-32 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img src={product.image.startsWith('http') ? product.image : `http://localhost:5000${product.image}`} alt={product.name} className="w-full h-full object-contain bg-white" />
                ) : (
                  <Box className="w-10 h-10 text-orange-400" strokeWidth={1.5} />
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate" title={product.name}>{product.name}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={product.companyName}>{product.companyName || '-'}</p>
                  </div>
                  <span className={cn("inline-block px-2.5 py-1 text-[10px] font-semibold rounded-full flex-shrink-0", getCategoryColor(product.category))}>
                    {product.category || 'Uncategorized'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-[11px] mb-0.5">Material</p>
                    <p className="font-medium text-gray-900 text-[13px]">{product.material}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[11px] mb-0.5">GSM</p>
                    <p className="font-medium text-gray-900 text-[13px]">{product.gsm}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[11px] mb-0.5">Printing</p>
                    <p className="font-medium text-gray-900 text-[13px]">{product.printing}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[11px] mb-0.5">Dimensions</p>
                    <p className="font-medium text-gray-900 text-[13px] truncate" title={product.dimensions}>{product.dimensions}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-4 flex justify-between items-center bg-white border-t border-gray-100">
                <span className="text-[12px] text-gray-400">Unit price</span>
                <span className="text-lg font-bold text-[#1b2f63]">
                  ₹{Number(product.unitPrice).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-gray-200 border-dashed">
              No products found matching your search.
            </div>
          )}
        </div>
      </div>

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setProductToEdit(null);
        }}
        onProductAdded={(newProduct) => {
          setProducts([newProduct, ...products]);
        }}
        onProductUpdated={(updatedProduct) => {
          setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        }}
        onProductDeleted={(productId) => {
          setProducts(products.filter(p => p.id !== productId));
        }}
        productToEdit={productToEdit}
        startInEditMode={startInEditMode}
      />
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryAdded={(newCat) => {
          setCategories(prev => [...prev, newCat]);
        }}
        onCategoryUpdated={(updatedCat) => {
          setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
        }}
        onCategoryDeleted={(catId) => {
          setCategories(prev => prev.filter(c => c.id !== catId));
        }}
      />
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-[#1b2f63] mb-2">Export Options</h3>
            <p className="text-sm text-gray-500 mb-6">How would you like to export the product catalog?</p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => handleExport(true)}
                className="w-full px-4 py-2.5 bg-[#EA580C] text-white font-medium rounded-lg hover:bg-[#EA580C]/90 transition-colors shadow-sm"
              >
                With Price
              </button>
              <button
                onClick={() => handleExport(false)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
              >
                Without Price
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2.5 bg-white text-gray-500 font-medium rounded-lg hover:bg-gray-50 border border-gray-200 mt-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
