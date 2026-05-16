import { useCallback, useRef, useState } from 'react';
import { TENANT_TOKEN_KEY } from '@api/axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [muteInfo, setMuteInfo] = useState({
    muted: false,
    scope: null,
    errorCode: null,
    message: null,
  });
  const abortRef = useRef(null);
  const messagesRef = useRef([]);

  const updateMessages = useCallback((updater) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  }, []);

  const resetConversation = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  const clearMuteInfo = useCallback(() => {
    setMuteInfo({ muted: false, scope: null, errorCode: null, message: null });
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      if (!text?.trim() || isStreaming || muteInfo.muted) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
      };

      const newHistory = [...messagesRef.current, userMsg, assistantMsg];
      messagesRef.current = newHistory;
      setMessages(newHistory);
      setIsStreaming(true);

      const apiHistory = newHistory
        .filter((message) => message.id !== assistantId)
        .map((message) => ({ role: message.role, content: message.content }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = localStorage.getItem(TENANT_TOKEN_KEY);
        const res = await fetch(`${BASE_URL}/api/tenant/chatbot/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ messages: apiHistory }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const ct = res.headers.get('content-type') || '';
          let errorBody = null;
          if (ct.includes('application/json')) {
            try {
              errorBody = await res.json();
            } catch {
              errorBody = null;
            }
          }

          if (res.status === 429 && errorBody?.errorCode === 'USER_QUOTA_EXCEEDED') {
            setMuteInfo({
              muted: true,
              scope: 'user',
              errorCode: 'USER_QUOTA_EXCEEDED',
              message: errorBody.message,
            });
          } else if (res.status === 503 && errorBody?.errorCode === 'GLOBAL_QUOTA_EXCEEDED') {
            setMuteInfo({
              muted: true,
              scope: 'global',
              errorCode: 'GLOBAL_QUOTA_EXCEEDED',
              message: errorBody.message,
            });
          }

          updateMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: errorBody?.message || `Lỗi máy chủ (${res.status})`,
                  }
                : message,
            ));
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let shouldStop = false;

        while (!shouldStop) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.search(/\r?\n\r?\n/)) >= 0) {
            const block = buffer.slice(0, idx);
            const separator = buffer.slice(idx).match(/^\r?\n\r?\n/)?.[0] ?? '\n\n';
            buffer = buffer.slice(idx + separator.length);
            const dataLine = block
              .split(/\r?\n/)
              .find((line) => line.startsWith('data: '));
            if (!dataLine) continue;

            let evt;
            try {
              evt = JSON.parse(dataLine.slice(6));
            } catch {
              continue;
            }

            if (evt.type === 'text') {
              updateMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: `${message.content}${evt.content}` }
                    : message,
                ));
            } else if (evt.type === 'tool_call') {
              updateMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? {
                        ...message,
                        toolCalls: [
                          ...message.toolCalls,
                          { name: evt.name, status: 'running', args: evt.arguments },
                        ],
                      }
                    : message,
                ));
            } else if (evt.type === 'tool_result') {
              updateMessages((prev) =>
                prev.map((message) => {
                  if (message.id !== assistantId) return message;
                  const updated = [...message.toolCalls];
                  for (let i = updated.length - 1; i >= 0; i -= 1) {
                    if (updated[i].name === evt.name && updated[i].status === 'running') {
                      updated[i] = { ...updated[i], status: 'done', result: evt.result };
                      break;
                    }
                  }
                  return { ...message, toolCalls: updated };
                }));
            } else if (evt.type === 'error') {
              updateMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: `${message.content}\n\n⚠️ ${evt.message}` }
                    : message,
                ));
              if (evt.errorCode === 'USER_QUOTA_EXCEEDED') {
                setMuteInfo({
                  muted: true,
                  scope: 'user',
                  errorCode: evt.errorCode,
                  message: evt.message,
                });
              } else if (evt.errorCode === 'GLOBAL_QUOTA_EXCEEDED') {
                setMuteInfo({
                  muted: true,
                  scope: 'global',
                  errorCode: evt.errorCode,
                  message: evt.message,
                });
              }
            } else if (evt.type === 'done') {
              shouldStop = true;
              setIsStreaming(false);
              abortRef.current = null;
              break;
            }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: `${message.content}\n\n⚠️ Mất kết nối: ${e.message}` }
                : message,
            ));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, muteInfo.muted, updateMessages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    muteInfo,
    sendMessage,
    resetConversation,
    clearMuteInfo,
    stop,
  };
}
