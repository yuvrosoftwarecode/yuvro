import { restApiAuthUtil } from '@/utils/RestApiAuthUtil';

export interface ChatMessage {
    id: string;
    message_type: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    ai_agent: string;
    created_at: string;
}

class AIAssistantService {
    async getChatSession(id: string): Promise<ChatSession> {
        try {
            return await restApiAuthUtil.get<ChatSession>(`/sessions/${id}/`);
        } catch (error) {
            console.error('Error fetching chat session:', error);
            throw error;
        }
    }

    async sendMessage(chatId: string, message: string, context?: any): Promise<any> {
        try {
            const token = restApiAuthUtil.getAuthToken();
            const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
            const url = `${baseUrl}/sessions/${chatId}/send_message/`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ message, ...context }),
            });

            const contentType = response.headers.get('Content-Type');
            
            // Standard JSON Response Handling
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                return { response: (data.response || '').trim() };
            }

            // SSE / Streaming Handling Fallback
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            let fullResponseText = '';
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) continue;
                        
                        const dataStr = trimmed.slice(6);
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.chunk) {
                                fullResponseText += data.chunk;
                            }
                            if (data.done) {
                                // Resolved when done event received
                                return { response: fullResponseText.trim() };
                            }
                        } catch (e) {
                            // Ignore non-JSON lines or partials
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            return { response: fullResponseText.trim() };
        } catch (error) {
            console.error('Error sending message (SSE Handler):', error);
            throw error;
        }
    }
}

export const aiAssistantService = new AIAssistantService();