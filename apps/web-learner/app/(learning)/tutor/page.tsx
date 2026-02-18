'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Calculator, BookOpen, PenTool, Globe } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: Calculator, text: 'Help me with fractions' },
  { icon: Globe, text: 'Explain the water cycle' },
  { icon: PenTool, text: 'How do I write a good paragraph?' },
  { icon: BookOpen, text: 'What are the planets in order?' },
];

const AI_RESPONSES: Record<string, string> = {
  default:
    "I'm here to help you learn! Ask me anything about your lessons - math, reading, science, or any subject you're curious about. What would you like to explore today?",
  fractions:
    "Great question! Fractions are like pizza slices!\n\nImagine a pizza cut into 4 equal pieces. If you eat 1 piece, you've eaten 1/4 (one-fourth) of the pizza.\n\nThe top number (1) is called the **numerator** - it's how many pieces you have.\nThe bottom number (4) is called the **denominator** - it's how many total pieces there are.\n\nWant me to show you how to add or multiply fractions?",
  water:
    "The water cycle is like nature's recycling system!\n\n1. **Evaporation** - The sun heats up water in oceans and lakes, turning it into invisible water vapor that rises into the air.\n\n2. **Condensation** - When water vapor gets high in the sky where it's cold, it turns back into tiny water droplets that form clouds.\n\n3. **Precipitation** - When clouds get heavy with water droplets, the water falls back down as rain, snow, or hail.\n\n4. **Collection** - Water collects in oceans, lakes, and rivers... and the cycle starts again!\n\nPretty cool, right?",
  paragraph:
    "Writing a great paragraph is like building a sandwich!\n\n**Top Bun = Topic Sentence**\nStart with one sentence that tells what the paragraph is about.\n\n**The Filling = Supporting Details**\nAdd 2-4 sentences with facts, examples, or explanations.\n\n**Bottom Bun = Closing Sentence**\nEnd with a sentence that wraps it all up.\n\n**Example:**\n*Dogs make wonderful pets. They are loyal and love to play with their owners. Dogs can learn tricks and even help people who need assistance. Having a dog as a pet brings joy to many families.*\n\nWant to practice writing one together?",
  planets:
    "Great astronomy question! Here are the 8 planets in order from the Sun:\n\n1. **Mercury** - Smallest & closest to the Sun\n2. **Venus** - Hottest planet!\n3. **Earth** - That's us!\n4. **Mars** - The red planet\n5. **Jupiter** - Biggest planet\n6. **Saturn** - Famous for its rings\n7. **Uranus** - Tilted on its side\n8. **Neptune** - Farthest & windiest\n\n**Memory trick:** *My Very Educated Mother Just Served Us Nachos*\n\n(Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)",
};

function getAIResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('fraction')) return AI_RESPONSES.fractions;
  if (lowerMessage.includes('water') && lowerMessage.includes('cycle'))
    return AI_RESPONSES.water;
  if (lowerMessage.includes('paragraph') || lowerMessage.includes('write'))
    return AI_RESPONSES.paragraph;
  if (lowerMessage.includes('planet')) return AI_RESPONSES.planets;
  return AI_RESPONSES.default;
}

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi there! I'm your AI learning buddy. I'm here to help you understand anything you're learning about. What would you like to explore today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking time
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getAIResponse(text),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, aiMessage]);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white rounded-t-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold">AIVO AI Tutor</h1>
          <p className="text-sm text-indigo-200">Your personal learning assistant</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-sm text-indigo-200">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`mt-1 text-xs ${
                  message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Thinking</span>
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="border-t border-gray-100 p-3">
          <p className="mb-2 text-sm text-gray-500">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q.text}
                onClick={() => sendMessage(q.text)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <q.icon className="h-3.5 w-3.5" /> {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Send <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
