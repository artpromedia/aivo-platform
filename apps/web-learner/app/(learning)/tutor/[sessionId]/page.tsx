'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { UILocale } from '@aivo/i18n/config';
import { useTutorSession, type TutorMessage } from '../../../../lib/hooks/use-tutor-session';
import { useTutorWebSocket, type TutorMessage as WsMessage } from '../../../../lib/hooks/use-tutor-websocket';
import { useTutorAudio, type VisemeEvent } from '../../../../lib/hooks/use-tutor-audio';
import { useVoicePreference } from '../../../../lib/hooks/use-voice-preference';
import { TutorSessionHeader } from '../../../../components/tutor/tutor-session-header';
import { TutorChat } from '../../../../components/tutor/tutor-chat';
import type { TutorLocaleInfo } from '../../../../components/tutor/tutor-language-indicator';

export default function TutorSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { t } = useTranslation('tutor');
  const [input, setInput] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('NEUTRAL');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [sessionLocale, setSessionLocale] = useState('en');
  const [localeInfo, setLocaleInfo] = useState<TutorLocaleInfo | null>(null);

  const {
    session,
    messages: restMessages,
    isSending: isRestSending,
    error: restError,
    loadMessages,
    endSession,
    setSession,
  } = useTutorSession();

  // Audio playback with lip-sync
  const { mouthOpenAmount, isPlaying, playWithLipSync, stop: stopAudio } = useTutorAudio();

  // Voice preference
  const { voiceEnabled, toggleVoice } = useVoicePreference();

  // Stable audio callback ref
  const onAudioReadyRef = useRef<((audioUrl: string, visemes: VisemeEvent[]) => void) | undefined>(undefined);
  onAudioReadyRef.current = (audioUrl: string, visemes: VisemeEvent[]) => {
    if (voiceEnabled) {
      playWithLipSync(audioUrl, visemes);
    }
  };

  // WebSocket real-time messaging
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
    sessionId,
    authToken: '',
    onAudioReady: (audioUrl, visemes) => {
      onAudioReadyRef.current?.(
        audioUrl,
        visemes.map((v, i) => ({ ...v, visemeId: i })),
      );
    },
  });

  // Load session and messages on mount
  useEffect(() => {
    async function loadSession() {
      const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch {
        // Session load failed
      }

      await loadMessages(sessionId);
    }
    loadSession();
  }, [sessionId, loadMessages, setSession]);

  // Prefer WS messages; fall back to REST
  const messages = wsMessages.length > 0 ? wsMessages : restMessages;
  const isSending = isAiTyping || isRestSending;
  const error = wsError || restError;

  // Seed WS hook with REST messages
  useEffect(() => {
    if (restMessages.length > 0 && wsMessages.length === 0) {
      addInitialMessages(
        restMessages.map((m) => ({
          id: m.id,
          role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
          content: m.content,
          createdAt: new Date(m.createdAt),
        })),
      );
    }
  }, [restMessages, wsMessages.length, addInitialMessages]);

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

  const handleSend = useCallback(() => {
    if (!input.trim() || isSending) return;
    const text = input;
    setInput('');
    wsSendMessage(text.trim());
  }, [input, isSending, wsSendMessage]);

  const handleLocaleChange = useCallback(
    async (newLocale: UILocale) => {
      const API_BASE = process.env.NEXT_PUBLIC_TUTOR_API_URL ?? '/api/tutor';
      try {
        const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: newLocale }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionLocale(newLocale);
          if (data.localeInfo) setLocaleInfo(data.localeInfo);
        }
      } catch {
        // locale change failed silently
      }
    },
    [sessionId],
  );

  const handleEndSession = async () => {
    stopAudio();
    await endSession(sessionId);
    router.push('/tutor');
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

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-gray-500">{t('session.loadingSession')}</p>
        </div>
      </div>
    );
  }

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
        locale={sessionLocale}
        localeInfo={localeInfo}
        onLocaleChange={handleLocaleChange}
      />

      <TutorChat
        messages={messages as TutorMessage[]}
        personaSlug={session.persona.slug}
        personaName={session.persona.name}
        isSending={isSending}
        streamingText={streamingText}
        onPlayAudio={handlePlayAudio as (message: TutorMessage) => void}
        playingMessageId={playingMessageId}
        isRTL={localeInfo?.isRTL ?? false}
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
          <h3 className="text-lg font-bold text-gray-900">{t('session.complete')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('session.greatJob', { count: messages.length })}
          </p>
          <button
            onClick={() => router.push('/tutor')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {t('session.startNew')}
          </button>
        </div>
      )}

      {/* Input */}
      {session.status === 'ACTIVE' && (
        <div className="border-t border-gray-100 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
            dir={localeInfo?.isRTL ? 'rtl' : undefined}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('input.placeholder', { name: session.persona.name })}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              disabled={isSending}
              dir={localeInfo?.isRTL ? 'rtl' : 'auto'}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {t('input.send')} <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
