'use client';

import { useState, useEffect } from 'react';
import {
  getVocabularyLists,
  createVocabularyList,
  addWordToList,
  searchWords,
  getVocabularyProgress,
  submitFlashcardResults,
  type VocabularyList,
  type VocabularyWord,
  type VocabularyProgress,
  type FlashcardResult,
} from '../../../../lib/reading-api';

interface VocabularyBuilderProps {
  learnerId: string;
}

type Tab = 'lists' | 'search' | 'flashcards' | 'progress';

/**
 * Vocabulary Builder Component
 * 
 * Helps learners build and practice vocabulary:
 * - Create and manage custom word lists
 * - Search and add new words with definitions
 * - Practice with flashcard mode
 * - Track vocabulary learning progress
 */
export function VocabularyBuilder({ learnerId }: Readonly<VocabularyBuilderProps>) {
  const [activeTab, setActiveTab] = useState<Tab>('lists');
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [selectedList, setSelectedList] = useState<VocabularyList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VocabularyWord[]>([]);
  const [progress, setProgress] = useState<VocabularyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // Flashcard state
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardResults, setFlashcardResults] = useState<FlashcardResult[]>([]);

  // New list form
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  useEffect(() => {
    loadLists();
  }, [learnerId]);

  useEffect(() => {
    if (activeTab === 'progress') {
      loadProgress();
    }
  }, [activeTab, learnerId]);

  const loadLists = async () => {
    try {
      const data = await getVocabularyLists(learnerId);
      setLists(data);
      if (data.length > 0 && !selectedList) {
        setSelectedList(data[0]);
      }
    } catch (error) {
      console.error('Failed to load lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const data = await getVocabularyProgress(learnerId);
      setProgress(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const newList = await createVocabularyList({
        learnerId,
        name: newListName,
        description: newListDescription,
      });
      setLists((prev) => [newList, ...prev]);
      setSelectedList(newList);
      setNewListName('');
      setNewListDescription('');
      setShowNewListForm(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchWords(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search words:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddWordToList = async (word: VocabularyWord) => {
    if (!selectedList) return;

    try {
      const updatedList = await addWordToList(selectedList.id, word.id);
      setLists((prev) =>
        prev.map((list) => (list.id === updatedList.id ? updatedList : list))
      );
      setSelectedList(updatedList);
    } catch (error) {
      console.error('Failed to add word to list:', error);
    }
  };

  const startFlashcards = () => {
    if (!selectedList || selectedList.words.length === 0) return;
    setFlashcardMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setFlashcardResults([]);
  };

  const handleFlashcardResponse = (correct: boolean) => {
    if (!selectedList) return;

    const currentWord = selectedList.words[currentCardIndex];
    setFlashcardResults((prev) => [
      ...prev,
      {
        wordId: currentWord.id,
        correct,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (currentCardIndex < selectedList.words.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      endFlashcards();
    }
  };

  const endFlashcards = async () => {
    if (flashcardResults.length === 0) return;

    try {
      await submitFlashcardResults({
        learnerId,
        listId: selectedList!.id,
        results: flashcardResults,
        timestamp: new Date().toISOString(),
      });
      await loadProgress();
    } catch (error) {
      console.error('Failed to submit flashcard results:', error);
    }

    setFlashcardMode(false);
    setActiveTab('progress');
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading vocabulary builder...</div>;
  }

  return (
    <div>
      {!flashcardMode && (
        <>
          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab('lists')}
                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'lists'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                📋 My Lists
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'search'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                🔍 Search Words
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'progress'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                📊 Progress
              </button>
            </nav>
          </div>

          {/* Lists Tab */}
          {activeTab === 'lists' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List Sidebar */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Vocabulary Lists</h2>
                  <button
                    onClick={() => setShowNewListForm(true)}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    + New
                  </button>
                </div>

                {showNewListForm && (
                  <form onSubmit={handleCreateList} className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="List name"
                      className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <textarea
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewListForm(false);
                          setNewListName('');
                          setNewListDescription('');
                        }}
                        className="px-3 py-1 text-slate-600 text-sm hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedList(list)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedList?.id === list.id
                          ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-900'
                          : 'bg-slate-50 border-2 border-transparent hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-medium">{list.name}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {list.words.length} {list.words.length === 1 ? 'word' : 'words'}
                      </div>
                    </button>
                  ))}
                </div>

                {lists.length === 0 && !showNewListForm && (
                  <p className="text-sm text-slate-600 text-center py-8">
                    No vocabulary lists yet. Create your first list!
                  </p>
                )}
              </div>

              {/* List Details */}
              {selectedList && (
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{selectedList.name}</h2>
                      {selectedList.description && (
                        <p className="text-sm text-slate-600 mt-1">{selectedList.description}</p>
                      )}
                    </div>
                    <button
                      onClick={startFlashcards}
                      disabled={selectedList.words.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🎴 Practice Flashcards
                    </button>
                  </div>

                  {selectedList.words.length > 0 ? (
                    <div className="space-y-4">
                      {selectedList.words.map((word) => (
                        <div key={word.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-medium text-slate-900">{word.word}</h3>
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded">
                              {word.partOfSpeech}
                            </span>
                          </div>
                          <p className="text-slate-700 mb-2">{word.definition}</p>
                          {word.example && (
                            <p className="text-sm text-slate-600 italic">
                              Example: "{word.example}"
                            </p>
                          )}
                          {word.synonyms && word.synonyms.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {word.synonyms.map((synonym, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                                >
                                  {synonym}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-600 mb-4">No words in this list yet.</p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Search & Add Words
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Words</h2>

                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter a word to search..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    {searchResults.map((word) => (
                      <div key={word.id} className="p-4 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-medium text-slate-900">{word.word}</h3>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {word.partOfSpeech}
                              </span>
                            </div>
                            <p className="text-slate-700 mb-2">{word.definition}</p>
                            {word.example && (
                              <p className="text-sm text-slate-600 italic">
                                Example: "{word.example}"
                              </p>
                            )}
                          </div>
                          {selectedList && (
                            <button
                              onClick={() => handleAddWordToList(word)}
                              disabled={selectedList.words.some((w) => w.id === word.id)}
                              className="ml-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {selectedList.words.some((w) => w.id === word.id)
                                ? '✓ Added'
                                : '+ Add to List'}
                            </button>
                          )}
                        </div>
                        {word.synonyms && word.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs text-slate-600">Synonyms:</span>
                            {word.synonyms.map((synonym, index) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                              >
                                {synonym}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!selectedList && searchResults.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      💡 Select a list from the "My Lists" tab to add words
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && progress && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Vocabulary Progress</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-indigo-900">{progress.totalWords}</div>
                    <div className="text-sm text-indigo-700 mt-1">Total Words</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-green-900">{progress.masteredWords}</div>
                    <div className="text-sm text-green-700 mt-1">Mastered Words</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-purple-900">
                      {Math.round((progress.overallAccuracy ?? 0) * 100)}%
                    </div>
                    <div className="text-sm text-purple-700 mt-1">Overall Accuracy</div>
                  </div>
                </div>

                {progress.recentActivity && progress.recentActivity.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Activity</h3>
                    <div className="space-y-2">
                      {progress.recentActivity.map((activity: { listName: string; date: string; score: number; correctAnswers: number; totalQuestions: number }, index: number) => (
                        <div key={`${activity.listName}-${activity.date}-${index}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">{activity.listName}</div>
                            <div className="text-xs text-slate-600">{activity.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-900">{activity.score}%</div>
                            <div className="text-xs text-slate-600">
                              {activity.correctAnswers}/{activity.totalQuestions}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Flashcard Mode */}
      {flashcardMode && selectedList && selectedList.words.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Flashcard Practice</h2>
              <button
                onClick={() => setFlashcardMode(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                ✕ Exit
              </button>
            </div>

            <div className="mb-4 text-sm text-slate-600 text-center">
              Card {currentCardIndex + 1} of {selectedList.words.length}
            </div>

            {/* Flashcard */}
            <div
              role="button"
              tabIndex={0}
              className="min-h-[300px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer mb-6"
              onClick={() => setShowAnswer(!showAnswer)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowAnswer(!showAnswer);
                }
              }}
            >
              <div className="text-center">
                {showAnswer ? (
                  <>
                    <div className="text-2xl font-bold text-slate-900 mb-4">
                      {selectedList.words[currentCardIndex].word}
                    </div>
                    <div className="text-lg text-slate-700 mb-2">
                      {selectedList.words[currentCardIndex].definition}
                    </div>
                    {selectedList.words[currentCardIndex].example && (
                      <p className="text-sm text-slate-600 italic mt-4">
                        "{selectedList.words[currentCardIndex].example}"
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-slate-900 mb-4">
                      {selectedList.words[currentCardIndex].word}
                    </div>
                    <p className="text-slate-600">Click to reveal definition</p>
                  </>
                )}
              </div>
            </div>

            {/* Response Buttons */}
            {showAnswer && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleFlashcardResponse(false)}
                  className="px-6 py-3 bg-red-100 text-red-900 rounded-lg hover:bg-red-200 font-medium"
                >
                  ✗ Need Practice
                </button>
                <button
                  onClick={() => handleFlashcardResponse(true)}
                  className="px-6 py-3 bg-green-100 text-green-900 rounded-lg hover:bg-green-200 font-medium"
                >
                  ✓ Got It!
                </button>
              </div>
            )}

            {/* Progress */}
            <div className="mt-6">
              <div className="flex gap-1">
                {selectedList.words.map((word, index) => (
                  <div
                    key={`progress-${word.word}-${index}`}
                    className={`h-2 flex-1 rounded ${(() => {
                      if (index < currentCardIndex) {
                        return flashcardResults[index]?.correct
                          ? 'bg-green-600'
                          : 'bg-red-600';
                      }
                      if (index === currentCardIndex) {
                        return 'bg-indigo-600';
                      }
                      return 'bg-slate-200';
                    })()}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
