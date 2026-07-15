import React, { useState, useRef, useEffect } from 'react';
import { Card, Button } from '../ui/Widgets';
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  FileText,
  User as UserIcon,
  Bot,
  CornerDownLeft
} from 'lucide-react';
import { Article } from '../../store/slices/articleSlice';
import { ChatMessage } from '../../store/slices/aiSlice';

interface RAGChatInterfaceProps {
  articles: Article[];
  selectedArticleId: string | 'all' | null;
  onSelectArticle: (id: string | 'all' | null) => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  chatLoading: boolean;
}

export const RAGChatInterface: React.FC<RAGChatInterfaceProps> = ({
  articles,
  selectedArticleId,
  onSelectArticle,
  chatHistory,
  onSendMessage,
  chatLoading,
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatLoading || !selectedArticleId) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handlePresetClick = (preset: string) => {
    if (chatLoading || !selectedArticleId) return;
    onSendMessage(preset);
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  const presets = [
    { label: 'Summarize this page', prompt: 'Summarize this page.' },
    { label: 'Improve this content', prompt: 'Improve this content.' },
    { label: 'Generate FAQs', prompt: 'Generate FAQs.' },
    { label: 'Suggest better headings', prompt: 'Suggest better headings.' },
    { label: 'Suggest keywords', prompt: 'Suggest keywords.' },
    { label: 'Find missing topics', prompt: 'Find missing topics.' },
    { label: 'Improve readability', prompt: 'Improve readability.' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto h-[calc(100vh-10rem)] flex gap-6 items-stretch">
      {/* Sidebar - Article Selector */}
      <div className="w-72 glass border border-border/60 rounded-xl p-4 flex flex-col gap-4 bg-neutral-950 shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-display mb-1">Article Scope</h3>
          <p className="text-[10px] text-muted">Select which document to load as chat context</p>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          <button
            onClick={() => onSelectArticle('all')}
            className={`w-full text-left p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition ${
              selectedArticleId === 'all'
                ? 'bg-neutral-900 border-accent/60 text-white font-medium'
                : 'bg-transparent border-transparent hover:bg-neutral-900/40 text-muted hover:text-white'
            }`}
          >
            <span className="font-semibold truncate font-display w-full flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Global Workspace
            </span>
            <span className="text-[9px] text-muted">Search across all content</span>
          </button>
          
          <div className="h-px w-full bg-border/40 my-1" />

          {articles.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No articles available. Write one first!
            </div>
          ) : (
            articles.map((art) => (
              <button
                key={art.id}
                onClick={() => onSelectArticle(art.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition ${
                  selectedArticleId === art.id
                    ? 'bg-neutral-900 border-accent/60 text-white font-medium'
                    : 'bg-transparent border-transparent hover:bg-neutral-900/40 text-muted hover:text-white'
                }`}
              >
                <span className="font-semibold truncate font-display w-full">{art.title}</span>
                <span className="text-[9px] text-muted">{art.category}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 border border-border/60 rounded-xl overflow-hidden shadow-inner">
        {!selectedArticleId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted">
            <MessageSquare className="w-10 h-10 text-neutral-800 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-white font-display">No scope selected</p>
            <p className="text-xs text-muted mt-1 max-w-xs leading-normal">
              Choose an article from the left sidebar to start chatting with its content using Retrieval-Augmented Generation.
            </p>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div className="px-5 py-3 border-b border-border/40 bg-neutral-950/60 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold text-white font-display truncate max-w-xs">
                  {selectedArticleId === 'all' ? 'Global Workspace (All Content)' : selectedArticle?.title}
                </span>
              </div>
              <span className="text-[9px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/5 border border-accent/15 tracking-wider uppercase font-display">RAG Context Loaded</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* Warnings Banner if website content is empty or short */}
              {(!selectedArticle?.content || selectedArticle.content.trim().length < 20) && selectedArticleId !== 'all' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex flex-col gap-2 select-none">
                  <div className="font-bold flex items-center gap-1.5">
                    ⚠️ Crawled Content Missing
                  </div>
                  <p className="text-[11px] leading-normal text-muted">
                    This document does not contain crawled website text. Please go back to the workspace and execute an audit on this URL to load the content scope properly.
                  </p>
                </div>
              )}

              {chatHistory.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 gap-4 select-none">
                  <Bot className="w-10 h-10 text-neutral-800" />
                  <div>
                    <h4 className="text-xs font-semibold text-white font-display">Chat initialized</h4>
                    <p className="text-[10px] text-muted mt-1 leading-normal max-w-xs">
                      {selectedArticleId === 'all' ? 'Ask questions spanning your entire knowledge base.' : `Ask questions, rewrite paragraphs, or generate summaries based on "${selectedArticle?.title}."`}
                    </p>
                  </div>
                  {/* Preset prompts */}
                  <div className="grid grid-cols-2 gap-2 max-w-lg mt-2">
                    {presets.map((pre, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePresetClick(pre.prompt)}
                        className="p-2 bg-neutral-900/60 hover:bg-neutral-800/80 hover:text-white rounded-lg border border-border text-[10px] text-muted text-left font-display font-medium leading-relaxed transition"
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4.5">
                  {chatHistory.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm ${
                          isUser ? 'bg-neutral-900 border-neutral-800' : 'bg-accent/10 border-accent/25'
                        }`}>
                          {isUser ? <UserIcon className="w-4 h-4 text-accent" /> : <Bot className="w-4 h-4 text-accent" />}
                        </div>
                        {/* Content Card */}
                        <Card className={`p-3.5 select-text selection:bg-indigo-500/30 selection:text-white ${
                          isUser 
                            ? 'bg-accent !text-zinc-50 border-accent-hover/20' 
                            : 'bg-neutral-900/40 text-white border-border/30 shadow-md'
                        }`}>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap select-text">{msg.content}</p>
                        </Card>
                      </div>
                    );
                  })}
                  
                  {chatLoading && (
                    <div className="flex gap-3 max-w-[85%] self-start">
                      <div className="w-8 h-8 rounded-full border bg-accent/10 border-accent/25 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-accent" />
                      </div>
                      <Card className="p-3.5 bg-neutral-900/40 text-white border-border/30 flex items-center gap-1.5 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                      </Card>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 border-t border-border/40 bg-neutral-950/60 flex items-center gap-3 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this article..."
                disabled={chatLoading}
                className="flex-1 bg-neutral-900/80 text-xs rounded-lg border border-border px-3.5 py-2.5 outline-none transition text-white placeholder:text-neutral-600 focus:border-accent/60"
              />
              <Button type="submit" disabled={!input.trim() || chatLoading} className="h-9 px-3 text-xs">
                <span>Send</span>
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
