'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, Send, Sparkles, ArrowRight, Calculator, BookOpen, PenTool, Globe, Code } from 'lucide-react';

import { useTutorSession, type TutorMessage } from '../../../lib/hooks/use-tutor-session';
import { useTutorWebSocket, type TutorMessage as WsMessage } from '../../../lib/hooks/use-tutor-websocket';
import { useTutorAudio, type VisemeEvent } from '../../../lib/hooks/use-tutor-audio';
import { useVoicePreference } from '../../../lib/hooks/use-voice-preference';
import { AnimatedTutorAvatar } from '../../../components/tutor/animated-tutor-avatar';
import { TutorChat } from '../../../components/tutor/tutor-chat';
import { TutorSessionHeader } from '../../../components/tutor/tutor-session-header';

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  MATH: Calculator,
  ELA: BookOpen,
  SCIENCE: Globe,
  HISTORY: PenTool,
  CODING: Code,
};

const SUGGESTED_QUESTIONS: Record<string, Array<{ icon: typeof Calculator; text: string }>> = {
  MATH: [
    { icon: Calculator, text: 'Help me with fractions' },
    { icon: Calculator, text: 'How do I solve word problems?' },
    { icon: Calculator, text: 'What is the order of operations?' },
  ],
  ELA: [
    { icon: BookOpen, text: 'How do I write a good paragraph?' },
    { icon: BookOpen, text: 'What are the parts of speech?' },
    { icon: BookOpen, text: 'Help me understand this story' },
  ],
  SCIENCE: [
    { icon: Globe, text: 'Explain the water cycle' },
    { icon: Globe, text: 'What are the states of matter?' },
    { icon: Globe, text: 'How do plants make food?' },
  ],
  HISTORY: [
    { icon: PenTool, text: 'What caused the American Revolution?' },
    { icon: PenTool, text: 'Tell me about ancient Egypt' },
    { icon: PenTool, text: 'Who were the first Americans?' },
  ],
  CODING: [
    { icon: Code, text: 'What is a variable?' },
    { icon: Code, text: 'How do loops work?' },
    { icon: Code, text: 'Help me fix a bug in my code' },
  ],
};

export default function TutorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('NEUTRAL');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const personaId = searchParams.get('personaId');
  const subject = searchParams.get('subject');

  const {
    session,
    messages: restMessages,
    isLoading,
    isSending: isRestSending,
    error: restError,
    createSession,
    endSession,
  } = useTutorSession();

  // Audio playback with lip-sync
  const { mouthOpenAmount, isPlaying, playWithLipSync, stop: stopAudio } = useTutorAudio();

  // Voice preference persistence
  const { voiceEnabled, toggleVoice } = useVoicePreference();

  // Stable audio callback ref
  const onAudioReadyRef = useRef<(audioUrl: string, visemes: VisemeEvent[]) => void>();
  onAudioReadyRef.current = (audioUrl: string, visemes: VisemeEvent[]) => {
    if (voiceEnabled) {
      playWithLipSync(audioUrl, visemes);
    }
  };

  // WebSocket real-time messaging (active when session exists)
  const {
    messages: wsMessages,
    streamingText,
    isAiTyping,
    avatarState,
    isConnected,
    useHttpFallback,
    error: wsError,
    sendMessage: wsSendMessage,
    addInitialMessages,
  } = useTutorWebSocket({
    sessionId: session?.id ?? '',
    authToken: '',
    onAudioReady: (audioUrl, visemes) => {
      onAudioReadyRef.current?.(
        audioUrl,
        visemes.map((v, i) => ({ ...v, visemeId: i })),
      );
    },
  });

  // Create session if personaId and subject are provided
  useEffect(() => {
    if (personaId && subject && !session) {
      createSession(personaId, subject);
    }
  }, [personaId, subject, session, createSession]);

  // Prefer WS messages when available; fall back to REST messages
  const messages = wsMessages.length > 0 ? wsMessages : restMessages;
  const isSending = isAiTyping || isRestSending;
  const error = wsError || restError;

  // Seed WS hook with REST messages when session loads
  useEffect(() => {
    if (session && restMessages.length > 0 && wsMessages.length === 0) {
      addInitialMessages(
        restMessages.map((m) => ({
          id: m.id,
          role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
          content: m.content,
          createdAt: new Date(m.createdAt),
        })),
      );
    }
  }, [session, restMessages, wsMessages.length, addInitialMessages]);

  // Update emotion from latest AI message
  useEffect(() => {
    const lastAiMessage = [...messages].reverse().find(
      (m) => m.role === 'ASSISTANT' || m.role === 'assistant',
    );
    if (lastAiMessage) {
      const emotion = (lastAiMessage as TutorMessage).emotion ?? 'NEUTRAL';
      setCurrentEmotion(emotion);
    }
  }, [messages]);

  // Clear playing ID when audio stops
  useEffect(() => {
    if (!isPlaying) setPlayingMessageId(null);
  }, [isPlaying]);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isSending || !session) return;
      setInput('');
      wsSendMessage(text.trim());
    },
    [isSending, session, wsSendMessage],
  );

  const handleEndSession = async () => {
    if (session) {
      stopAudio();
      await endSession(session.id);
    }
  };

  const handlePlayAudio = useCallback(
    (message: TutorMessage | WsMessage) => {
      const wsMsg = message as WsMessage;
      if (wsMsg.audioUrl && wsMsg.visemes?.length) {
        setPlayingMessageId(wsMsg.id);
        playWithLipSync(
          wsMsg.audioUrl,
          wsMsg.visemes.map((v, i) => ({ ...v, visemeId: i })),
        );
      }
    },
    [playWithLipSync],
  );

  // ── Landing page (no session) ──────────────────────────────────────
  if (!session && !personaId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 mb-4">
            <Sparkles className="h-4 w-4" /> AI Tutors
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Meet Your AI Tutors</h1>
          <p className="mt-2 text-lg text-gray-600">
            Choose a tutor to start learning. Each one has their own unique personality!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {[
            { slug: 'nova-math', name: 'Nova', subject: 'MATH', desc: 'Space explorer who makes math an adventure' },
            { slug: 'sage-ela', name: 'Sage', subject: 'ELA', desc: 'Storyteller who brings reading to life' },
            { slug: 'spark-science', name: 'Spark', subject: 'SCIENCE', desc: 'Inventor who turns science into experiments' },
            { slug: 'chrono-history', name: 'Chrono', subject: 'HISTORY', desc: 'Time traveler who makes history come alive' },
            { slug: 'pixel-coding', name: 'Pixel', subject: 'CODING', desc: 'Robot who makes coding a fun game' },
          ].map((persona) => {
            const SubjectIcon = SUBJECT_ICONS[persona.subject] ?? Brain;
            return (
              <button
                key={persona.slug}
                onClick={() => router.push(`/tutor/select`)}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 text-center transition-all hover:border-indigo-300 hover:shadow-lg"
              >
                <AnimatedTutorAvatar
                  personaSlug={persona.slug}
                  personaName={persona.name}
                  size="lg"
                  emotion="HAPPY"
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{persona.name}</h3>
                  <p className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <SubjectIcon className="h-3.5 w-3.5" /> {persona.subject}
                  </p>
                </div>
                <p className="text-sm text-gray-600">{persona.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/tutor/select')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            Choose a Tutor <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (isLoading || (!session && personaId)) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-gray-500">Setting up your tutor...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const suggestions = SUGGESTED_QUESTIONS[session.subject] ?? [];

  // ── Active session ──────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      <TutorSessionHeader
        session={session}
        emotion={currentEmotion}
        avatarState={avatarState as 'idle' | 'thinking' | 'talking' | 'celebrating' | 'encouraging' | 'listening' | undefined}
        mouthOpenAmount={mouthOpenAmount}
        isConnected={isConnected || useHttpFallback}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        onEndSession={handleEndSession}
      />

      <TutorChat
        messages={messages as TutorMessage[]}
        personaSlug={session.persona.slug}
        personaName={session.persona.name}
        isSending={isSending}
        streamingText={streamingText}
        onPlayAudio={handlePlayAudio as (message: TutorMessage) => void}
        playingMessageId={playingMessageId}
      />

      {error && (
        <div className="px-4 py-2 text-sm text-red-500 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      {/* Session ended — inline summary */}
      {session.status === 'COMPLETED' && (
        <div className="border-t border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-lg font-bold text-gray-900">Session Complete!</h3>
          <p className="text-sm text-gray-600 mt-1">
            Great job! You had {messages.length} messages in this session.
          </p>
          <button
            onClick={() => router.push('/tutor')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Start New Session
          </button>
        </div>
      )}

      {/* Suggested Questions (early in conversation) */}
      {session.status === 'ACTIVE' && messages.length <= 2 && suggestions.length > 0 && (
        <div className="border-t border-gray-100 p-3">
          <p className="mb-2 text-sm text-gray-500">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q.text}
                onClick={() => handleSend(q.text)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <q.icon className="h-3.5 w-3.5" /> {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {session.status === 'ACTIVE' && (
        <div className="border-t border-gray-100 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${session.persona.name} anything...`}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              Send <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
