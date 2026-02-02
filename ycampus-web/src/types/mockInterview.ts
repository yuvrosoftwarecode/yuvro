export interface Role {
    id: string;
    title: string;
    description: string;
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    max_duration: number;
    interviewer_name: string;
    interviewer_voice_id: string;
    voice_speed: number;
    icon?: string;
    iconBg?: string;
    iconColor?: string;
    buttonGradient?: string;
}

export interface InterviewSettings {
    difficulty: string;
    duration: string;
    interviewer: string;
    mediaStream: MediaStream;
    resume?: File;
}

export interface Message {
    type: 'ai' | 'user';
    content: string;
    timestamp: string;
    questionType?: 'behavioral' | 'coding';
    codeSubmission?: string;
}
