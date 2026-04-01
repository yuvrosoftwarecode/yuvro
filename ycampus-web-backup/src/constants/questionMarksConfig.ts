
// Define the configuration types
export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export const MARKS_CONFIG: Record<string, Record<DifficultyLevel, number>> = {
    mcq_single: { easy: 1, medium: 2, hard: 3 },
    mcq_multiple: { easy: 1, medium: 2, hard: 3 },
    coding: { easy: 5, medium: 10, hard: 15 },
    descriptive: { easy: 5, medium: 10, hard: 15 },
    // Default fallback for any future types
    default: { easy: 2, medium: 5, hard: 8 }
};

export const DURATION_CONFIG: Record<string, Record<DifficultyLevel, number>> = {
    mcq_single: { easy: 1, medium: 2, hard: 3 },
    mcq_multiple: { easy: 1, medium: 2, hard: 3 },
    coding: { easy: 10, medium: 20, hard: 30 },
    descriptive: { easy: 10, medium: 20, hard: 30 },
    // Default fallback
    default: { easy: 5, medium: 10, hard: 15 }
};

export const getDefaultMarks = (type: string, difficulty: string): number => {
    // Try to find config for specific type
    const typeConfig = MARKS_CONFIG[type] || MARKS_CONFIG['default'];

    // Try to find marks for specific difficulty, fallback to easy if not found
    const marks = typeConfig[difficulty as DifficultyLevel] || typeConfig['easy'];

    return marks;
};

export const getDefaultDuration = (type: string, difficulty: string): number => {
    // Try to find config for specific type
    const typeConfig = DURATION_CONFIG[type] || DURATION_CONFIG['default'];

    // Try to find duration for specific difficulty, fallback to easy if not found
    const duration = typeConfig[difficulty as DifficultyLevel] || typeConfig['easy'];

    return duration;
};

