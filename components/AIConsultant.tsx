import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ComprehensiveStrategy, ChatMessage, ExecutionState } from '../types';
import { chatWithConsultant } from '../services/geminiService';
import { Button } from './ui/Button';

interface AIConsultantProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  strategy: ComprehensiveStrategy;
  executionState?: ExecutionState; // Added prop
}

export const AIConsultant: React.FC<AIConsultantProps> = ({ isOpen, onClose, profile, strategy, executionState }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hola. Veo que estamos trabajando en "${strategy.priorityFocus.title}". ¿Qué te está frenando para completarlo?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Pass executionState to service
      const responseText = await chatWithConsultant(messages, userMsg.text, profile, strategy, 'es', executionState);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      // Error handling
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-950 border-l border-white/10 shadow-2xl z-50 flex flex-col animate-fade-in-blur">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-900/50 border border-primary-500/30 flex items-center justify-center relative">
             <span className="text-xl">🤖</span>
             <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Consultor Senior</h3>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Soporte Estratégico</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary-600/20 border border-primary-500/20 text-slate-200 rounded-tr-none' 
                : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 rounded-tl-none flex gap-2">
              <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-slate-900/30">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tu duda o bloqueo..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pr-12 text-slate-200 focus:border-primary-500 outline-none resize-none h-14 max-h-32 text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-2 text-primary-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            ➤
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          El consultor conoce tu estrategia actual. Pregunta sobre ella.
        </p>
      </div>
    </div>
  );
};