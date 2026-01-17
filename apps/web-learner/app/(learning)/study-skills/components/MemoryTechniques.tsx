'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/study-skills-api';

export function MemoryTechniques() {
  const [techniques, setTechniques] = useState<api.MemoryTechnique[]>([]);
  const [cards, setCards] = useState<api.MemoryCard[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<api.MemoryTechnique | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [techniquesData, cardsData] = await Promise.all([
        api.getMemoryTechniques('user123'),
        api.getMemoryCards('user123'),
      ]);
      setTechniques(techniquesData);
      setCards(cardsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechnique = async (
    name: string,
    type: api.MemoryTechnique['type'],
    description: string,
    steps: string[]
  ) => {
    try {
      const technique = await api.createMemoryTechnique({
        userId: 'user123',
        name,
        type,
        description,
        steps,
      });
      setTechniques([...techniques, technique]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create technique:', error);
    }
  };

  const handleCreateCard = async (
    front: string,
    back: string,
    subject: string,
    deck: string
  ) => {
    try {
      const card = await api.createMemoryCard({
        userId: 'user123',
        front,
        back,
        subject,
        deck,
      });
      setCards([...cards, card]);
      setCreatingCard(false);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleReviewCard = async (correct: boolean) => {
    const card = filteredCards[currentCardIndex];
    try {
      const updated = await api.reviewMemoryCard(card.id, correct);
      setCards(cards.map((c) => (c.id === updated.id ? updated : c)));
      setShowAnswer(false);
      if (currentCardIndex < filteredCards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        setReviewMode(false);
        setCurrentCardIndex(0);
      }
    } catch (error) {
      console.error('Failed to review card:', error);
    }
  };

  const handleDeleteTechnique = async (techniqueId: string) => {
    if (!confirm('Delete this technique?')) return;
    try {
      await api.deleteMemoryTechnique(techniqueId);
      setTechniques(techniques.filter((t) => t.id !== techniqueId));
      setSelectedTechnique(null);
    } catch (error) {
      console.error('Failed to delete technique:', error);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Delete this card?')) return;
    try {
      await api.deleteMemoryCard(cardId);
      setCards(cards.filter((c) => c.id !== cardId));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const filteredCards =
    selectedDeck === 'all' ? cards : cards.filter((c) => c.deck === selectedDeck);

  const decks = Array.from(new Set(cards.map((c) => c.deck)));

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (reviewMode && filteredCards.length > 0) {
    const card = filteredCards[currentCardIndex];
    return (
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => {
            setReviewMode(false);
            setCurrentCardIndex(0);
            setShowAnswer(false);
          }}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Exit Review
        </button>

        <div className="mb-4 text-center text-sm text-slate-600">
          Card {currentCardIndex + 1} of {filteredCards.length}
        </div>

        <div className="rounded-lg border-2 border-indigo-300 bg-white p-12 text-center shadow-lg">
          <div className="mb-8 text-2xl font-semibold text-slate-900">{card.front}</div>
          {showAnswer && (
            <div className="mb-8 border-t-2 border-slate-200 pt-8 text-xl text-slate-700">
              {card.back}
            </div>
          )}
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="rounded-lg bg-indigo-600 px-8 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Show Answer
            </button>
          ) : (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleReviewCard(false)}
                className="rounded-lg bg-red-600 px-8 py-3 font-medium text-white hover:bg-red-700"
              >
                ✗ Incorrect
              </button>
              <button
                onClick={() => handleReviewCard(true)}
                className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700"
              >
                ✓ Correct
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-600">
          <div>Correct: {card.correctCount}</div>
          <div>Incorrect: {card.incorrectCount}</div>
        </div>
      </div>
    );
  }

  if (selectedTechnique) {
    return (
      <div>
        <button
          onClick={() => setSelectedTechnique(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Techniques
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedTechnique.name}</h2>
              <p className="text-slate-600">{selectedTechnique.type}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  Effectiveness: {'⭐'.repeat(selectedTechnique.effectiveness)}
                </span>
                <span className="text-sm text-slate-600">
                  Used {selectedTechnique.timesUsed} times
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteTechnique(selectedTechnique.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
            <p className="text-slate-700">{selectedTechnique.description}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Steps</h3>
            <ol className="list-decimal space-y-2 pl-5">
              {selectedTechnique.steps.map((step, index) => (
                <li key={index} className="text-slate-700">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {selectedTechnique.examples && selectedTechnique.examples.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold text-slate-900">Examples</h3>
              <ul className="list-disc space-y-1 pl-5">
                {selectedTechnique.examples.map((example, index) => (
                  <li key={index} className="text-slate-700">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Techniques Column */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Memory Techniques</h2>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New Technique
          </button>
        </div>

        {creating && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const steps = (formData.get('steps') as string)
                  .split('\n')
                  .filter((s) => s.trim());
                handleCreateTechnique(
                  formData.get('name') as string,
                  formData.get('type') as api.MemoryTechnique['type'],
                  formData.get('description') as string,
                  steps
                );
              }}
              className="space-y-3"
            >
              <input
                type="text"
                name="name"
                placeholder="Technique Name"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <select
                name="type"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="mnemonic">Mnemonic</option>
                <option value="visualization">Visualization</option>
                <option value="chunking">Chunking</option>
                <option value="association">Association</option>
                <option value="storyMethod">Story Method</option>
                <option value="custom">Custom</option>
              </select>
              <textarea
                name="description"
                placeholder="Description"
                required
                rows={2}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <textarea
                name="steps"
                placeholder="Steps (one per line)"
                required
                rows={4}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {techniques.map((technique) => (
            <div
              key={technique.id}
              onClick={() => setSelectedTechnique(technique)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <h3 className="font-semibold text-slate-900">{technique.name}</h3>
              <p className="text-sm text-slate-600">{technique.type}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span>{'⭐'.repeat(technique.effectiveness)}</span>
                <span>{technique.timesUsed} uses</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Cards Column */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Memory Cards</h2>
          <div className="flex gap-2">
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1 text-sm"
            >
              <option value="all">All Decks</option>
              {decks.map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
            <button
              onClick={() => setCreatingCard(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + New Card
            </button>
          </div>
        </div>

        {creatingCard && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateCard(
                  formData.get('front') as string,
                  formData.get('back') as string,
                  formData.get('subject') as string,
                  formData.get('deck') as string
                );
              }}
              className="space-y-3"
            >
              <input
                type="text"
                name="front"
                placeholder="Front (Question)"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <input
                type="text"
                name="back"
                placeholder="Back (Answer)"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <input
                type="text"
                name="subject"
                placeholder="Subject"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <input
                type="text"
                name="deck"
                placeholder="Deck Name"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingCard(false)}
                  className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredCards.length > 0 && (
          <button
            onClick={() => setReviewMode(true)}
            className="mb-4 w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700"
          >
            Start Review ({filteredCards.length} cards)
          </button>
        )}

        <div className="space-y-3">
          {filteredCards.map((card) => (
            <div key={card.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 font-medium text-slate-900">{card.front}</div>
              <div className="mb-2 text-sm text-slate-600">{card.back}</div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {card.deck} • {card.subject}
                </span>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filteredCards.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No cards in this deck. Create some to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
