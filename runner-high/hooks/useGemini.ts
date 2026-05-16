import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { generateContent, GeminiMessage, GeminiError } from '../services/geminiService';
import { ChatMessage } from '../types';

const SECURE_KEY = 'gemini_api_key';

export function useGemini() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApiKey = useCallback(async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(SECURE_KEY);
  }, []);

  const sendMessage = useCallback(
    async (userText: string, systemPrompt: string) => {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setError('API Key가 설정되지 않았습니다. 설정 탭에서 Gemini API Key를 입력해주세요.');
        return;
      }

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      // Gemini 형식으로 변환
      const history: GeminiMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      try {
        const result = await generateContent(apiKey, history, systemPrompt);
        const modelMsg: ChatMessage = {
          id: `${Date.now()}-model`,
          role: 'model',
          text: result.text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, modelMsg]);
      } catch (e) {
        if (e instanceof GeminiError) {
          setError(e.message);
        } else {
          setError('알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    },
    [messages, getApiKey]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearMessages, getApiKey };
}
