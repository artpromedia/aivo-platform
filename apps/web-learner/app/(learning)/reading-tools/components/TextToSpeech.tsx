'use client';

import { useState, useEffect, useRef } from 'react';
import { getTTSVoices, getTTSSettings, updateTTSSettings, saveReadingSession, type TTSVoice, type TTSSettings } from '../../../../lib/reading-api';

interface TextToSpeechProps {
  learnerId: string;
}

const SAMPLE_TEXT = `Welcome to text-to-speech! This tool helps you listen to text being read aloud. You can adjust the voice, speed, and other settings to make it work best for you.`;

/**
 * Text-to-Speech Component
 * 
 * Allows learners to:
 * - Paste or type text to be read aloud
 * - Select from different voices
 * - Adjust reading speed and pitch
 * - Enable text highlighting as it's read
 * - Save reading sessions
 */
export function TextToSpeech({ learnerId }: Readonly<TextToSpeechProps>) {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wordsRef = useRef<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const pauseCountRef = useRef<number>(0);

  useEffect(() => {
    loadVoicesAndSettings();
  }, [learnerId]);

  useEffect(() => {
    wordsRef.current = text.split(/\s+/);
  }, [text]);

  const loadVoicesAndSettings = async () => {
    try {
      const [voicesData, settingsData] = await Promise.all([
        getTTSVoices(),
        getTTSSettings(learnerId),
      ]);
      setVoices(voicesData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load TTS data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof TTSSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await updateTTSSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const speak = () => {
    if (!settings || !text.trim()) return;

    // Stop any existing speech
    globalThis.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find((v) => v.id === settings.voiceId);
    
    if (selectedVoice && globalThis.speechSynthesis.getVoices().length > 0) {
      const systemVoice = globalThis.speechSynthesis.getVoices().find(
        (v) => v.name.includes(selectedVoice.name) || v.lang.includes(selectedVoice.language)
      );
      if (systemVoice) utterance.voice = systemVoice;
    }

    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
    };

    utterance.onend = async () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(-1);

      // Save reading session
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      try {
        await saveReadingSession({
          learnerId,
          text,
          timestamp: new Date().toISOString(),
          duration,
          wordsRead: wordsRef.current.length,
          pauseCount: pauseCountRef.current,
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }

      pauseCountRef.current = 0;
    };

    utterance.onpause = () => {
      setIsPaused(true);
      pauseCountRef.current++;
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    if (settings.highlightText) {
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const textBefore = text.substring(0, charIndex);
          const wordIndex = textBefore.split(/\s+/).length - 1;
          setCurrentWordIndex(wordIndex);
        }
      };
    }

    utteranceRef.current = utterance;
    globalThis.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    globalThis.speechSynthesis.pause();
  };

  const resume = () => {
    globalThis.speechSynthesis.resume();
  };

  const stop = () => {
    globalThis.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  };

  const renderTextWithHighlight = () => {
    if (!settings?.highlightText || currentWordIndex === -1) {
      return <span>{text}</span>;
    }

    return (
      <span>
        {wordsRef.current.map((word, index) => (
          <span
            key={`word-${word}-${index}`}
            className={index === currentWordIndex ? 'bg-yellow-200' : ''}
          >
            {word}{index < wordsRef.current.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading text-to-speech...</div>;
  }

  if (!settings) {
    return <div className="text-center py-12">Failed to load settings</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Text Input */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Text to Read</h2>
          
          <div className="mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isPlaying}
              rows={12}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Paste or type text here..."
            />
          </div>

          {/* Preview with highlighting */}
          {isPlaying && settings.highlightText && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 mb-2">Reading Preview:</p>
              <div className="text-base leading-relaxed">{renderTextWithHighlight()}</div>
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <>
                {isPaused ? (
                  <button
                    onClick={resume}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    ▶️ Resume
                  </button>
                ) : (
                  <button
                    onClick={pause}
                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700"
                  >
                    ⏸️ Pause
                  </button>
                )}
                <button
                  onClick={stop}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  ⏹️ Stop
                </button>
              </>
            ) : (
              <button
                onClick={speak}
                disabled={!text.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶️ Start Reading
              </button>
            )}
            <button
              onClick={() => setText(SAMPLE_TEXT)}
              disabled={isPlaying}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Sample
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Voice Settings</h2>

          {/* Voice Selection */}
          <div className="mb-4">
            <label htmlFor="voice-select" className="block text-sm font-medium text-slate-700 mb-2">
              Voice
            </label>
            <select
              id="voice-select"
              value={settings.voiceId}
              onChange={(e) => updateSetting('voiceId', e.target.value)}
              disabled={isPlaying}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender}, {voice.language})
                </option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Speed: {settings.rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.rate}
              onChange={(e) => updateSetting('rate', Number.parseFloat(e.target.value))}
              disabled={isPlaying}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pitch: {settings.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => updateSetting('pitch', Number.parseFloat(e.target.value))}
              disabled={isPlaying}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>

          {/* Volume */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Volume: {Math.round(settings.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => updateSetting('volume', Number.parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highlightText}
                onChange={(e) => updateSetting('highlightText', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Highlight text as it's read</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoScroll}
                onChange={(e) => updateSetting('autoScroll', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">Auto-scroll to current word</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
