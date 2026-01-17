'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordSuggestions, getPredictionSettings, updatePredictionSettings, saveTypingSession, type WordSuggestion, type PredictionSettings } from '../../../../lib/reading-api';

interface WordPredictionProps {
  learnerId: string;
}

/**
 * Word Prediction Component
 * 
 * Provides intelligent word suggestions while typing:
 * - Real-time word predictions based on context
 * - Customizable suggestion count
 * - Keyboard shortcuts for accepting suggestions
 * - Tracks typing sessions and accepted suggestions
 */
export function WordPrediction({ learnerId }: WordPredictionProps) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [settings, setSettings] = useState<PredictionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const startTimeRef = useRef<number>(Date.now());
  const acceptedSuggestionsRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSettings();
  }, [learnerId]);

  useEffect(() => {
    if (text && settings) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [text, settings]);

  const loadSettings = async () => {
    try {
      const settingsData = await getPredictionSettings(learnerId);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!settings) return;

    try {
      const suggestions = await getWordSuggestions(text, settings.maxSuggestions);
      setSuggestions(suggestions);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  const acceptSuggestion = (suggestion: WordSuggestion) => {
    const words = text.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    // Replace the last partial word with the suggestion
    const newText = words.slice(0, -1).concat(suggestion.word).join(' ') + ' ';
    setText(newText);
    setSuggestions([]);
    acceptedSuggestionsRef.current++;
    
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;

    // Tab or Right Arrow to accept first suggestion
    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      e.preventDefault();
      acceptSuggestion(suggestions[0]);
      return;
    }

    // Number keys 1-9 to accept specific suggestion
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < suggestions.length && e.ctrlKey) {
        e.preventDefault();
        acceptSuggestion(suggestions[index]);
        return;
      }
    }

    // Arrow keys to navigate suggestions
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && e.ctrlKey && suggestions.length > 0) {
      e.preventDefault();
      acceptSuggestion(suggestions[selectedIndex]);
    }
  };

  const updateSetting = async (key: keyof PredictionSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updatePredictionSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const clearText = async () => {
    if (!text) return;

    // Save typing session
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    
    try {
      await saveTypingSession({
        learnerId,
        text,
        timestamp: new Date().toISOString(),
        duration,
        wordsTyped: words.length,
        suggestionsAccepted: acceptedSuggestionsRef.current,
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    // Reset
    setText('');
    setSuggestions([]);
    startTimeRef.current = Date.now();
    acceptedSuggestionsRef.current = 0;
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading word prediction...</div>;
  }

  if (!settings) {
    return <div className="text-center py-12">Failed to load settings</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Typing Area */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Start Typing</h2>
            <button
              onClick={clearText}
              disabled={!text}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear & Save
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={15}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            placeholder="Start typing here... Suggestions will appear below as you type."
          />

          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <span>{text.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
            <span>{acceptedSuggestionsRef.current} suggestions accepted</span>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => acceptSuggestion(suggestion)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      index === selectedIndex
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <span className="font-medium">{suggestion.word}</span>
                    <span className="ml-2 text-xs opacity-70">
                      {Math.round(suggestion.confidence * 100)}%
                      {index < 9 && ` • Ctrl+${index + 1}`}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">Tab</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">→</kbd> to accept first suggestion,{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">Ctrl+Number</kbd> for specific suggestion
              </p>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">⌨️ Keyboard Shortcuts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
            <div>
              <kbd className="px-1.5 py-0.5 bg-white rounded mr-2">Tab</kbd>
              Accept first suggestion
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-white rounded mr-2">Ctrl+1-9</kbd>
              Accept specific suggestion
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-white rounded mr-2">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white rounded mr-2">↓</kbd>
              Navigate suggestions
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-white rounded mr-2">Ctrl+Enter</kbd>
              Accept selected suggestion
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Prediction Settings</h2>

          {/* Max Suggestions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Number of Suggestions: {settings.maxSuggestions}
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={settings.maxSuggestions}
              onChange={(e) => updateSetting('maxSuggestions', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Fewer</span>
              <span>More</span>
            </div>
          </div>

          {/* Minimum Confidence */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Minimum Confidence: {Math.round(settings.minConfidence * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.1"
              value={settings.minConfidence}
              onChange={(e) => updateSetting('minConfidence', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              Lower values show more suggestions but may be less accurate
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useContext}
                onChange={(e) => updateSetting('useContext', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Use context for better predictions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.learnFromUser}
                onChange={(e) => updateSetting('learnFromUser', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Learn from my writing style</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.suggestPunctuation}
                onChange={(e) => updateSetting('suggestPunctuation', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Suggest punctuation</span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Session Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Words Typed:</span>
              <span className="font-medium text-slate-900">
                {text.trim().split(/\s+/).filter(w => w.length > 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Suggestions Accepted:</span>
              <span className="font-medium text-slate-900">{acceptedSuggestionsRef.current}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Time Elapsed:</span>
              <span className="font-medium text-slate-900">
                {Math.floor((Date.now() - startTimeRef.current) / 60000)}m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
