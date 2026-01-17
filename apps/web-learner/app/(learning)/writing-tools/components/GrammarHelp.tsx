'use client';

import { useState } from 'react';
import {
  GrammarCheck,
  GrammarRule,
  GrammarTip,
  checkGrammar,
  getGrammarRules,
  getGrammarRulesByCategory,
  getGrammarTips,
  applyGrammarSuggestion,
} from '@/lib/writing-api';

/**
 * Grammar Help component
 * Provides real-time grammar checking and educational resources
 */
export function GrammarHelp() {
  const [text, setText] = useState('');
  const [grammarCheck, setGrammarCheck] = useState<GrammarCheck | null>(null);
  const [rules, setRules] = useState<GrammarRule[]>([]);
  const [tips, setTips] = useState<GrammarTip[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'check' | 'rules' | 'tips'>('check');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  async function handleCheckGrammar() {
    if (!text.trim()) return;

    try {
      setChecking(true);
      setError(null);
      const result = await checkGrammar(text);
      setGrammarCheck(result);
    } catch (err) {
      setError('Failed to check grammar');
      console.error(err);
    } finally {
      setChecking(false);
    }
  }

  async function loadRules(category?: string) {
    try {
      const data = category
        ? await getGrammarRulesByCategory(category)
        : await getGrammarRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load grammar rules:', err);
    }
  }

  async function loadTips() {
    try {
      const data = await getGrammarTips();
      setTips(data);
    } catch (err) {
      console.error('Failed to load grammar tips:', err);
    }
  }

  async function handleApplySuggestion(issueId: string, suggestionIndex: number) {
    if (!grammarCheck) return;

    try {
      const result = await applyGrammarSuggestion(text, issueId, suggestionIndex);
      setText(result.correctedText);
      
      // Re-check grammar with corrected text
      const newCheck = await checkGrammar(result.correctedText);
      setGrammarCheck(newCheck);
    } catch (err) {
      setError('Failed to apply suggestion');
      console.error(err);
    }
  }

  function handleTabChange(tab: 'check' | 'rules' | 'tips') {
    setActiveTab(tab);
    if (tab === 'rules' && rules.length === 0) {
      loadRules();
    } else if (tab === 'tips' && tips.length === 0) {
      loadTips();
    }
  }

  const categories = [
    'Punctuation',
    'Capitalization',
    'Subject-Verb Agreement',
    'Verb Tense',
    'Word Choice',
    'Sentence Structure',
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange('check')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'check'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Grammar Checker
          </button>
          <button
            onClick={() => handleTabChange('rules')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Grammar Rules
          </button>
          <button
            onClick={() => handleTabChange('tips')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'tips'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Writing Tips
          </button>
        </div>
      </div>

      {/* Grammar Checker Tab */}
      {activeTab === 'check' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Enter or paste your text to check for grammar issues:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-md"
              rows={10}
              placeholder="Type or paste your writing here..."
            />
          </div>

          <button
            onClick={handleCheckGrammar}
            disabled={checking || !text.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking...' : 'Check Grammar'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
          )}

          {grammarCheck && (
            <div className="mt-6">
              {grammarCheck.issues.length === 0 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 font-medium">✓ No grammar issues found!</p>
                  <p className="text-sm text-green-600 mt-1">
                    Your writing looks great. Score: {grammarCheck.score}/100
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      Found {grammarCheck.issues.length} issue{grammarCheck.issues.length !== 1 ? 's' : ''}
                    </h3>
                    <div className="text-sm">
                      <span className="text-slate-600">Grammar Score: </span>
                      <span
                        className={`font-semibold ${
                          grammarCheck.score >= 80
                            ? 'text-green-600'
                            : grammarCheck.score >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {grammarCheck.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {grammarCheck.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`p-4 border rounded-lg ${
                          issue.severity === 'error'
                            ? 'border-red-300 bg-red-50'
                            : issue.severity === 'warning'
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-blue-300 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                issue.severity === 'error'
                                  ? 'bg-red-200 text-red-800'
                                  : issue.severity === 'warning'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-blue-200 text-blue-800'
                              }`}
                            >
                              {issue.severity.toUpperCase()}
                            </span>
                            <span className="ml-2 text-sm text-slate-600">{issue.category}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Line {issue.line}, Col {issue.column}
                          </span>
                        </div>

                        <p className="font-medium mb-2">{issue.message}</p>

                        <div className="mb-3 p-2 bg-white rounded border border-slate-200">
                          <p className="text-sm">
                            <span className="text-slate-500">Original: </span>
                            <span className="bg-yellow-200">{issue.context}</span>
                          </p>
                        </div>

                        {issue.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Suggestions:</p>
                            <div className="space-y-2">
                              {issue.suggestions.map((suggestion, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-start p-2 bg-white rounded border border-slate-200"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-700">
                                      {suggestion.replacement}
                                    </p>
                                    {suggestion.explanation && (
                                      <p className="text-xs text-slate-600 mt-1">
                                        {suggestion.explanation}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleApplySuggestion(issue.id, idx)}
                                    className="ml-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {issue.ruleId && (
                          <p className="text-xs text-slate-500 mt-2">Rule: {issue.ruleId}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grammar Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by category:</label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => {
                const category = e.target.value || null;
                setSelectedCategory(category);
                loadRules(category || undefined);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {rules.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Loading grammar rules...</p>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{rule.title}</h4>
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{rule.description}</p>

                  {rule.examples.length > 0 && (
                    <div className="space-y-2">
                      {rule.examples.map((example, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-red-600 font-medium">✗</span>
                            <p className="text-red-700">{example.incorrect}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 font-medium">✓</span>
                            <p className="text-green-700">{example.correct}</p>
                          </div>
                          {example.explanation && (
                            <p className="text-xs text-slate-600 mt-1 ml-5">
                              {example.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Writing Tips Tab */}
      {activeTab === 'tips' && (
        <div>
          {tips.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Loading writing tips...</p>
          ) : (
            <div className="space-y-4">
              {tips.map((tip) => (
                <div key={tip.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{tip.title}</h4>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                      {tip.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{tip.content}</p>

                  {tip.examples && tip.examples.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Examples:</p>
                      {tip.examples.map((example, idx) => (
                        <p key={idx} className="text-sm text-slate-600 pl-4 border-l-2 border-indigo-200">
                          {example}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
