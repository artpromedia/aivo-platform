'use client';

import { useState, useEffect } from 'react';
import {
  StarterCategory,
  SentenceStarter,
  getStarterCategories,
  getSentenceStarters,
  logStarterUsage,
  getRandomStarters,
} from '@/lib/writing-api';

interface SentenceStartersProps {
  learnerId: string;
}

/**
 * Sentence Starters component
 * Provides helpful sentence starters organized by category and purpose
 */
export function SentenceStarters({ learnerId }: SentenceStartersProps) {
  const [categories, setCategories] = useState<StarterCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [starters, setStarters] = useState<SentenceStarter[]>([]);
  const [randomStarters, setRandomStarters] = useState<SentenceStarter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    loadRandomStarters();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadStarters(selectedCategory);
    }
  }, [selectedCategory]);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await getStarterCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStarters(categoryId: string) {
    try {
      const data = await getSentenceStarters(categoryId);
      setStarters(data);
    } catch (err) {
      setError('Failed to load sentence starters');
      console.error(err);
    }
  }

  async function loadRandomStarters() {
    try {
      const data = await getRandomStarters(6);
      setRandomStarters(data);
    } catch (err) {
      console.error('Failed to load random starters:', err);
    }
  }

  async function handleCopyStarter(starter: SentenceStarter) {
    try {
      await navigator.clipboard.writeText(starter.text);
      setCopiedId(starter.id);
      setTimeout(() => setCopiedId(null), 2000);

      // Log usage
      await logStarterUsage(learnerId, starter.id);
    } catch (err) {
      console.error('Failed to copy starter:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading sentence starters...</div>;
  }

  if (error && categories.length === 0) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div>
      {/* Random Suggestions */}
      {randomStarters.length > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">✨ Suggested Starters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {randomStarters.map((starter) => (
              <button
                key={starter.id}
                onClick={() => handleCopyStarter(starter)}
                className="p-3 bg-white rounded-md text-left hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                <p className="text-sm mb-1">{starter.text}</p>
                <p className="text-xs text-slate-500">{starter.purpose}</p>
                {copiedId === starter.id && (
                  <p className="text-xs text-green-600 mt-1">✓ Copied!</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-t-md font-medium text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Category Info */}
      {selectedCategory && (
        <div className="mb-4">
          {categories
            .filter((c) => c.id === selectedCategory)
            .map((category) => (
              <div key={category.id}>
                <h3 className="text-lg font-semibold mb-1">{category.name}</h3>
                <p className="text-sm text-slate-600">{category.description}</p>
              </div>
            ))}
        </div>
      )}

      {/* Sentence Starters List */}
      <div className="space-y-3">
        {starters.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No starters available in this category</p>
        ) : (
          starters.map((starter) => (
            <div
              key={starter.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-base mb-2">{starter.text}</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {starter.purpose}
                    </span>
                    <span className="text-xs text-slate-500">
                      {starter.gradeLevel}
                    </span>
                  </div>
                  {starter.example && (
                    <p className="text-sm text-slate-600 mt-2 italic">
                      Example: {starter.example}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCopyStarter(starter)}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm whitespace-nowrap"
                >
                  {copiedId === starter.id ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {error && starters.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md">{error}</div>
      )}
    </div>
  );
}
