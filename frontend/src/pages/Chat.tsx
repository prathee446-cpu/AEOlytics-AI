import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navbar } from '../components/layout/Navbar';
import { RAGChatInterface } from '../components/chat/RAGChatInterface';
import { RootState } from '../store';
import { 
  addChatMessage, 
  setChatHistory, 
  setChatLoading, 
  setChatError 
} from '../store/slices/aiSlice';
import api from '../services/api';

export const Chat: React.FC = () => {
  const dispatch = useDispatch();
  const { articles } = useSelector((state: RootState) => state.articles);
  
  // Safe selector helper since useSelector types might vary
  const aiState = useSelector((state: RootState) => state.ai);
  const history = aiState.chatHistory || [];
  const loading = aiState.chatLoading || false;

  const [selectedId, setSelectedId] = useState<string | 'all' | null>('all');

  // Reset chat history when selected article changes
  useEffect(() => {
    dispatch(setChatHistory([]));
  }, [selectedId, dispatch]);

  const handleSelectArticle = (id: string | null) => {
    setSelectedId(id);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedId) return;

    // Append user message
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: 'user' as const,
      content,
    };
    dispatch(addChatMessage(userMsg));
    dispatch(setChatLoading(true));

    try {
      const res = await api.post('/api/ai/chat', {
        articleId: selectedId === 'all' ? null : selectedId,
        query: content,
        history: history.map(h => ({ role: h.role, content: h.content }))
      });

      const assistantMsg = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: res.data.response,
      };
      dispatch(addChatMessage(assistantMsg));
      dispatch(setChatLoading(false));
    } catch (err: any) {
      console.error('API error during chat session:', err);
      const errMsg = err.response?.data?.error || err.message || 'The AI service failed to return a response.';
      const assistantMsg = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: `⚠️ Chat Error: ${errMsg}`,
      };
      dispatch(addChatMessage(assistantMsg));
      dispatch(setChatLoading(false));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950/20 overflow-y-auto">
      <Navbar title="Ask Your Content (RAG)" />
      
      <main className="flex-1 p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto justify-start">
        <RAGChatInterface
          articles={articles}
          selectedArticleId={selectedId}
          onSelectArticle={handleSelectArticle}
          chatHistory={history}
          onSendMessage={handleSendMessage}
          chatLoading={loading}
        />
      </main>
    </div>
  );
};
