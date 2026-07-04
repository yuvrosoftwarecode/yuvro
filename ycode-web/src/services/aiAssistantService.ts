import { yhubApiAuthUtil } from '@/utils/RestApiAuthUtil';

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
            return await yhubApiAuthUtil.get<ChatSession>(`/sessions/${id}/`);
        } catch (error) {
            console.error('Error fetching chat session:', error);
            throw error;
        }
    }

    async sendMessage(chatId: string, message: string, context?: any): Promise<any> {
        try {
            return await yhubApiAuthUtil.post<any>(`/sessions/${chatId}/send_message/`, {
                message,
                ...context
            });
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
}

export const aiAssistantService = new AIAssistantService();
