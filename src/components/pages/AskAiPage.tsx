import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquareText,
  Send,
  Sparkles,
  ShieldCheck,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { ChatMessage, NormalizedRecord } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AskAiPageProps {
  records: NormalizedRecord[];
}

export const AskAiPage: React.FC<AskAiPageProps> = ({ records }) => {
  const { t } = useLanguage();

  const suggestedQuestions = [
    t.q1,
    t.q2,
    t.q3,
    t.q4,
    t.q5,
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: t.welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowups: [
        t.q1,
        t.q2,
        t.q4,
      ],
    },
  ]);

  // Update welcome message if language changes and message is initial
  useEffect(() => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === 'welcome-msg'
          ? {
              ...msg,
              text: t.welcomeMessage,
              suggestedFollowups: [t.q1, t.q2, t.q4],
            }
          : msg
      )
    );
  }, [t]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFactMsgId, setExpandedFactMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText.trim(),
          dataset: records,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process question.');
      }

      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: data.suggestedFollowups || [],
        groundedFact: data.groundedFact,
        queryIntent: {
          intentType: data.intentType,
          filterApplied: data.groundedFact?.calculationType || 'Dataset Filter',
          recordCount: data.groundedFact?.matchingCount || records.length,
        },
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error calculating answer: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFactExpand = (id: string) => {
    setExpandedFactMsgId(expandedFactMsgId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.askAiTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {t.askAiSubtitle} ({records.length} {t.recordsText})
              </p>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t.groundedInConnectedData}</span>
          </div>
        </div>
      </div>

      {/* SUGGESTED QUESTIONS CHIPS */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t.suggestedQuestionsLabel}
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl border border-slate-200/80 shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6 min-h-[420px] flex flex-col justify-between">
        {/* Messages List */}
        <div className="space-y-6 overflow-y-auto max-h-[520px] pr-2">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isFactExpanded = expandedFactMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>

                  {/* Grounded Fact Badge & Drawer */}
                  {!isUser && msg.groundedFact && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {t.groundedInConnectedData}
                        </span>

                        <button
                          onClick={() => toggleFactExpand(msg.id)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                        >
                          <span>{t.calculatedFactDetail}</span>
                          {isFactExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Fact Details */}
                      {isFactExpanded && (
                        <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2 font-mono">
                          <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
                            <span>{t.engineOperation} {msg.groundedFact.calculationType}</span>
                            <span>{t.matchingRecords} {msg.groundedFact.matchingCount} {t.recordsText}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-800">
                            {msg.groundedFact.rawSummary}
                          </p>
                          {msg.groundedFact.sampleItems.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500">
                                {t.exactCalculatedSamples}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {msg.groundedFact.sampleItems.map((item, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-[10px]"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested Followups */}
                  {!isUser && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {msg.suggestedFollowups.map((f, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(f)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition"
                        >
                          → {f}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 block px-1">{msg.timestamp}</span>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-slate-100 rounded-2xl text-xs text-slate-600 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>{t.calculatingNotice}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="pt-4 border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={t.askInputPlaceholder}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 font-semibold text-xs shrink-0"
          >
            <span>{t.askButton}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
