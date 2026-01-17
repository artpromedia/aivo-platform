'use client';

import { useState, useEffect } from 'react';
import { getFormulasGroupedByCategory, searchFormulas, type Formula, type FormulaCategory } from '../../../../lib/math-api';

/**
 * Formula Reference Component
 * 
 * Provides a searchable library of math formulas:
 * - Browse formulas by category
 * - Search for specific formulas
 * - View detailed explanations
 * - See examples and use cases
 * - Understand variable meanings
 */
export function FormulaReference() {
  const [categories, setCategories] = useState<FormulaCategory[]>([]);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadFormulas();
  }, []);

  const loadFormulas = async () => {
    try {
      const data = await getFormulasGroupedByCategory();
      setCategories(data);
      if (data.length > 0 && data[0].formulas.length > 0) {
        setSelectedFormula(data[0].formulas[0]);
      }
    } catch (error) {
      console.error('Failed to load formulas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchFormulas(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search formulas:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading formulas...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search formulas..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              🔍
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600 mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map((formula) => (
                <button
                  key={formula.id}
                  onClick={() => {
                    setSelectedFormula(formula);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-indigo-50 rounded-lg"
                >
                  <div className="font-medium text-slate-900">{formula.name}</div>
                  <div className="text-xs text-slate-500">{formula.category}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Categories</h3>
          {categories.map((category) => (
            <div key={category.category} className="mb-4">
              <div className="text-xs font-medium text-slate-600 mb-2 uppercase">
                {category.category}
              </div>
              <div className="space-y-1">
                {category.formulas.map((formula) => (
                  <button
                    key={formula.id}
                    onClick={() => setSelectedFormula(formula)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                      selectedFormula?.id === formula.id
                        ? 'bg-indigo-50 text-indigo-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {formula.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula Details */}
      {selectedFormula && (
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-2xl font-bold text-slate-900">{selectedFormula.name}</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                {selectedFormula.category}
              </span>
            </div>
            <p className="text-slate-600">{selectedFormula.description}</p>
          </div>

          {/* Formula Display */}
          <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-8">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-600 mb-3">Formula:</div>
              <div className="text-3xl font-mono font-bold text-slate-900">
                {selectedFormula.formula}
              </div>
            </div>
          </div>

          {/* Variables */}
          {selectedFormula.variables.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Variables:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedFormula.variables.map((variable, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-mono font-bold text-indigo-900">
                          {variable.symbol}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{variable.name}</div>
                        <div className="text-sm text-slate-600">{variable.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* When to Use */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">When to Use:</h3>
            <p className="text-sm text-blue-800">{selectedFormula.when_to_use}</p>
          </div>

          {/* Example */}
          {selectedFormula.example && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Example:</h3>
              <p className="text-sm text-green-800 whitespace-pre-line">
                {selectedFormula.example}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
