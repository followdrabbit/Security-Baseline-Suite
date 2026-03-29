import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doc-assistant`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (resp.status === 429) {
      onError('Rate limit exceeded. Please wait a moment.');
      return;
    }
    if (resp.status === 402) {
      onError('AI credits exhausted.');
      return;
    }
    if (!resp.ok || !resp.body) {
      onError('Failed to connect to assistant.');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { done: readerDone, value } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          done = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e) {
    onError('Connection error. Please try again.');
  }
}

const contextualQuestions: Record<string, Array<{ label: string; q: string }>> = {
  '/': [
    { label: '📊 Dashboard overview', q: 'What does the dashboard show and how do I interpret the metrics?' },
    { label: '🚀 Getting started', q: 'How do I get started with Aureum?' },
    { label: '📁 Create project', q: 'How do I create my first project?' },
    { label: '📈 Confidence scores', q: 'What do the confidence scores mean?' },
  ],
  '/sources': [
    { label: '📄 Add sources', q: 'How do I add sources to my project?' },
    { label: '📎 File formats', q: 'What file formats are supported for sources?' },
    { label: '🔗 Import URL', q: 'How do I import content from a URL?' },
    { label: '🏷️ Organize sources', q: 'How can I tag and organize my sources?' },
  ],
  '/workspace': [
    { label: '🤖 AI pipeline', q: 'How does the AI pipeline work to generate controls?' },
    { label: '⚙️ Configure AI', q: 'How do I configure AI providers?' },
    { label: '🔄 Regenerate', q: 'Can I regenerate controls with different settings?' },
    { label: '📊 Review controls', q: 'How do I review and approve generated controls?' },
  ],
  '/editor': [
    { label: '✏️ Edit controls', q: 'How do I edit controls in the baseline editor?' },
    { label: '🗺️ Mind map view', q: 'How does the mind map visualization work?' },
    { label: '🔍 Filter controls', q: 'How do I filter controls by category or criticality?' },
    { label: '📋 Bulk actions', q: 'Can I perform bulk actions on controls?' },
  ],
  '/traceability': [
    { label: '📊 Map frameworks', q: 'How do I map controls to frameworks like NIST or ISO 27001?' },
    { label: '📈 Radar chart', q: 'How do I interpret the framework radar chart?' },
    { label: '📤 Export matrix', q: 'How do I export the traceability matrix?' },
    { label: '🔗 Coverage gaps', q: 'How do I identify coverage gaps in my framework mappings?' },
  ],
  '/rules': [
    { label: '📝 Custom rules', q: 'How do I create custom rules and templates?' },
    { label: '📦 Templates', q: 'What templates are available and how do I use them?' },
    { label: '🔄 Import rules', q: 'Can I import rules from other projects?' },
    { label: '⚡ Apply rules', q: 'How do rules affect AI-generated controls?' },
  ],
  '/history': [
    { label: '📜 Version history', q: 'How does the version history work?' },
    { label: '🔄 Restore version', q: 'How do I restore a previous baseline version?' },
    { label: '📊 Compare versions', q: 'Can I compare two different baseline versions?' },
    { label: '📤 Export version', q: 'How do I export a specific version of my baseline?' },
  ],
  '/export-import': [
    { label: '📤 Export formats', q: 'What export formats are available for baselines?' },
    { label: '📥 Import data', q: 'How do I import data from external sources?' },
    { label: '📊 CSV export', q: 'How do I export controls as CSV?' },
    { label: '📋 PDF report', q: 'Can I generate a PDF report of my baseline?' },
  ],
  '/settings': [
    { label: '⚙️ Settings', q: 'What settings can I configure in Aureum?' },
    { label: '🤖 AI providers', q: 'How do I configure AI providers and API keys?' },
    { label: '👥 Team settings', q: 'How do I manage team members and permissions?' },
    { label: '🌐 Language', q: 'How do I change the interface language?' },
  ],
  '/ai-integrations': [
    { label: '🤖 AI providers', q: 'What AI providers are available and how do I configure them?' },
    { label: '🔑 API keys', q: 'How do I set up API keys for AI providers?' },
    { label: '⚡ Default provider', q: 'How do I set a default AI provider?' },
    { label: '🧪 Test connection', q: 'How do I test if my AI provider connection is working?' },
  ],
  '/docs': [
    { label: '📖 Documentation', q: 'Give me an overview of the Aureum documentation.' },
    { label: '🔍 Search docs', q: 'How do I search the documentation effectively?' },
    { label: '🚀 Quick start', q: 'What is the quickest way to get started with Aureum?' },
    { label: '❓ FAQ', q: 'What are the most frequently asked questions about Aureum?' },
  ],
};

const defaultQuestions = [
  { label: '🚀 Getting started', q: 'How do I get started with Aureum?' },
  { label: '📄 Add sources', q: 'How do I add sources to my project?' },
  { label: '🤖 AI pipeline', q: 'How does the AI pipeline work?' },
  { label: '📊 Traceability', q: 'How do I map controls to frameworks?' },
];

const getPageLabel = (path: string): string => {
  const labels: Record<string, string> = {
    '/': 'Dashboard', '/sources': 'Source Library', '/workspace': 'AI Workspace',
    '/editor': 'Baseline Editor', '/traceability': 'Traceability', '/rules': 'Rules & Templates',
    '/history': 'History', '/export-import': 'Export/Import', '/settings': 'Settings',
    '/ai-integrations': 'AI Integrations', '/docs': 'Documentation', '/teams': 'Teams',
  };
  return labels[path] || 'the application';
};

const DocAssistant: React.FC = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPath = location.pathname;
  const quickQuestions = contextualQuestions[currentPath] || defaultQuestions;
  const pageLabel = getPageLabel(currentPath);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text: string, existingMessages: Message[] = messages) => {
    const userMsg: Message = { role: 'user', content: text };
    const contextPrefix = `[User is on the "${pageLabel}" page (${currentPath})] `;
    const contextualUserMsg: Message = { role: 'user', content: contextPrefix + text };
    const updatedMessages = [...existingMessages, userMsg];
    const contextualMessages = [...existingMessages, contextualUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: contextualMessages,
      onDelta: (chunk) => upsertAssistant(chunk),
      onDone: () => setIsLoading(false),
      onError: (error) => {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${error}` }]);
        setIsLoading(false);
      },
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    await sendMessage(trimmed);
  };

  return (
    <>
      {/* FAB button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gold-gradient shadow-xl hover:shadow-2xl transition-shadow flex items-center justify-center group"
          >
            <MessageCircle className="h-6 w-6 text-primary-foreground group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Aureum Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Documentation & Help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-center">
                    <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">How can I help?</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask anything about Aureum Baseline Studio</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {quickQuestions.map((qq) => (
                      <button
                        key={qq.q}
                        onClick={() => {
                          setInput(qq.q);
                          setTimeout(() => {
                            setInput('');
                            const userMsg: Message = { role: 'user', content: qq.q };
                            setMessages([userMsg]);
                            setIsLoading(true);
                            let assistantSoFar = '';
                            streamChat({
                              messages: [userMsg],
                              onDelta: (chunk) => {
                                assistantSoFar += chunk;
                                setMessages(prev => {
                                  const last = prev[prev.length - 1];
                                  if (last?.role === 'assistant') {
                                    return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                                  }
                                  return [...prev, { role: 'assistant', content: assistantSoFar }];
                                });
                              },
                              onDone: () => setIsLoading(false),
                              onError: (error) => {
                                setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${error}` }]);
                                setIsLoading(false);
                              },
                            });
                          }, 0);
                        }}
                        className="text-left px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 hover:border-primary/20 transition-all text-xs text-muted-foreground hover:text-foreground"
                      >
                        {qq.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted/50 border border-border/50 text-foreground rounded-bl-sm'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_code]:text-[10px] [&_pre]:text-[10px]">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border/50 rounded-xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/50 px-3 py-2.5 bg-muted/20">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask about Aureum..."
                  disabled={isLoading}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-lg gold-gradient flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
                >
                  <Send className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-1.5">Powered by Lovable AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DocAssistant;
