'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  grade?: string;
  avatar?: string;
}

interface ChildSelectorProps {
  children: Child[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChildSelector({ children, selectedId, onSelect }: ChildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedChild = children.find((c) => c.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      setIsOpen(!isOpen);
    }
  };

  if (children.length === 0) {
    return null;
  }

  if (children.length === 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        {children[0].avatar ? (
          <img
            src={children[0].avatar}
            alt={`${children[0].name}'s avatar`}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <User className="w-5 h-5 text-gray-500" aria-hidden="true" />
        )}
        <span className="font-medium text-gray-900">{children[0].name}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select child: ${selectedChild?.name || 'Select'}`}
      >
        {selectedChild?.avatar ? (
          <img
            src={selectedChild.avatar}
            alt={`${selectedChild.name}'s avatar`}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <User className="w-5 h-5 text-gray-500" aria-hidden="true" />
        )}
        <span className="font-medium text-gray-900">
          {selectedChild?.name || 'Select child'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10"
        >
          {children.map((child) => (
            <li
              key={child.id}
              role="option"
              aria-selected={child.id === selectedId}
              onClick={() => {
                onSelect(child.id);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(child.id);
                  setIsOpen(false);
                }
              }}
              tabIndex={0}
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                child.id === selectedId ? 'bg-indigo-50' : ''
              }`}
            >
              {child.avatar ? (
                <img src={child.avatar} alt={`${child.name}'s avatar`} className="w-6 h-6 rounded-full" />
              ) : (
                <User className="w-5 h-5 text-gray-500" aria-hidden="true" />
              )}
              <div>
                <p className="font-medium text-gray-900">{child.name}</p>
                {child.grade && (
                  <p className="text-xs text-gray-500">Grade {child.grade}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
