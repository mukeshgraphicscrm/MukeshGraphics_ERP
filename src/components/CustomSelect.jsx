import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ options, value, onChange, placeholder = "Select...", name, required, placement = "bottom", icon: Icon, triggerClassName, disabled, isMulti = false, searchable = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const selectedOption = !isMulti ? options.find(opt => opt.value === value) : null;
  const selectedOptions = isMulti ? options.filter(opt => Array.isArray(value) && value.includes(opt.value)) : [];

  const filteredOptions = searchable ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase())) : options;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (e.target.closest('.custom-select-portal-element')) {
            return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let actualPlacement = placement;
      if (placement === 'bottom' && spaceBelow < 240 && spaceAbove > spaceBelow) {
        actualPlacement = 'top';
      } else if (placement === 'top' && spaceAbove < 240 && spaceBelow > spaceAbove) {
        actualPlacement = 'bottom';
      }

      const top = actualPlacement === 'bottom' ? rect.bottom + 4 : 'auto';
      const bottom = actualPlacement === 'top' ? window.innerHeight - rect.top + 4 : 'auto';
      
      const maxAvailableSpace = actualPlacement === 'bottom' ? spaceBelow - 16 : spaceAbove - 16;
      const finalMaxHeight = Math.min(240, Math.max(100, maxAvailableSpace));

      setDropdownStyle(prev => {
        if (prev.top !== top || prev.bottom !== bottom || prev.left !== rect.left || prev.width !== rect.width || prev.maxHeight !== finalMaxHeight) {
          return {
            position: 'fixed',
            top,
            bottom,
            left: rect.left,
            width: rect.width,
            maxHeight: finalMaxHeight,
            zIndex: 99999,
          };
        }
        return prev;
      });
    }
  }); // Runs on every render to sync position dynamically

  useEffect(() => {
    const handleScrollOrResize = (e) => {
      if (!isOpen) return;
      // Ignore scrolls that happen inside the dropdown portal
      if (e.target && e.target.closest && e.target.closest('.custom-select-portal-element')) {
        return;
      }
      setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      <div
        className={triggerClassName || `w-full ${Icon ? 'pl-9 pr-3' : 'px-3'} py-2 border rounded-md transition-colors ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-300' : 'cursor-pointer bg-white border-gray-300 hover:border-gray-400'} flex justify-between items-center ${isOpen ? 'border-[#1b2f63] ring-2 ring-[#1b2f63]/50' : ''
          }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm('');
          }
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm('');
          }
        }}
      >
        {Icon && <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        <span className={`block truncate text-sm ${(isMulti ? selectedOptions.length > 0 : selectedOption) ? 'text-gray-900' : 'text-gray-500'}`}>
          {isMulti
            ? (selectedOptions.length > 0 ? selectedOptions.map(o => o.label).join(', ') : placeholder)
            : (selectedOption ? selectedOption.label : placeholder)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
      </div>

      {/* Visually hidden input to support HTML5 required validation */}
      <input 
        type="text" 
        name={name} 
        value={isMulti ? (Array.isArray(value) ? value.join(',') : '') : (value || '')} 
        onChange={() => {}}
        required={required} 
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          left: '50%',
          bottom: 0,
        }}
        tabIndex={-1} 
      />

      {isOpen && createPortal(
        <div className={`custom-select-portal-element bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col focus:outline-none`} style={dropdownStyle}>
          {searchable && (
            <div className="p-2 border-b border-gray-100 shrink-0">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1b2f63] focus:border-[#1b2f63]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">No options available</div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = isMulti ? Array.isArray(value) && value.includes(option.value) : value === option.value;
                  return (
                    <li
                      key={option.value}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center ${isSelected
                        ? 'bg-[#E8A33D]/10 text-[#E8A33D] font-bold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMulti) {
                          const currentValues = Array.isArray(value) ? value : [];
                          const newValues = currentValues.includes(option.value)
                            ? currentValues.filter(v => v !== option.value)
                            : [...currentValues, option.value];
                          onChange({ target: { name, value: newValues } });
                        } else {
                          onChange({ target: { name, value: option.value } });
                          setIsOpen(false);
                        }
                      }}
                    >
                      {isMulti && (
                        <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-[#E8A33D] bg-[#E8A33D]' : 'border-gray-300'}`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      )}
                      <span className="truncate">{option.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
