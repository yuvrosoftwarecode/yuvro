from decouple import config

class Settings:

    LLM_PROVIDER: str = config("LLM_PROVIDER", default="openai")

    OPENAI_API_KEY: str = config("OPENAI_API_KEY", default="")
    OPENAI_MODEL: str = config("OPENAI_MODEL", default="gpt-4o-mini")
    OPENAI_BASE_URL: str = config("OPENAI_BASE_URL", default="https://api.openai.com/v1")
    OPENAI_TEMPERATURE: float = 0.3

    ANTHROPIC_API_KEY: str = config("ANTHROPIC_API_KEY", default="")
    ANTHROPIC_MODEL: str = config("ANTHROPIC_MODEL", default="claude-3-haiku-20240307")

    GEMINI_API_KEY: str = config("GEMINI_API_KEY", default="")
    GEMINI_MODEL: str = config("GEMINI_MODEL", default="gemini-2.5-flash")

    MAX_RESUME_CHARS: int = 3000
    MAX_JD_CHARS: int = 1500
    MAX_ANSWER_CHARS: int = 12000

    MAX_OUTPUT_TOKENS_SKILL: int = 4096     
    MAX_OUTPUT_TOKENS_JD: int = 2048         
    MAX_OUTPUT_TOKENS_RESUME: int = 4096     
    MAX_OUTPUT_TOKENS_QUESTIONS: int = 4096  
    MAX_OUTPUT_TOKENS_ADAPTIVE: int = 1024   
    MAX_OUTPUT_TOKENS_EVAL: int = 2048      
    MAX_OUTPUT_TOKENS_CODE: int = 1024      
    MAX_OUTPUT_TOKENS_HINT: int = 1024       
    MAX_OUTPUT_TOKENS_REPORT: int = 8192     
    MAX_HINTS_PER_QUESTION: int = 3
    ADAPTIVE_SCORE_THRESHOLD_HIGH: float = 8.0 
    ADAPTIVE_SCORE_THRESHOLD_LOW: float = 4.0   
    DEFAULT_NUM_QUESTIONS: int = 5
    MAX_NUM_QUESTIONS: int = 15
    LONG_ANSWER_SECONDS: float = 180.0
    SILENCE_PROMPT_SECONDS: float = 7.0
    HINT_OFFER_MIN_PERCENT: float = 55.0
    HINT_OFFER_MAX_PERCENT: float = 69.0
    QUESTION_DUPLICATE_SIMILARITY: float = 0.86
    MAX_QUESTION_GENERATION_ATTEMPTS: int = 2

    FACE_IMAGE_MAX_BYTES: int = 5 * 1024 * 1024
    FACE_CONFIDENCE_THRESHOLD: float = 0.50
    FACE_MAX_ALLOWED_FACES: int = 1
    FACE_MONITOR_INTERVAL_SECONDS: int = 30
    FACE_MONITOR_HISTORY_LIMIT: int = 50
    FACE_VERIFY_MODEL_NAME: str = "VGG-Face"
    FACE_VERIFY_DISTANCE_METRIC: str = "cosine"

    APP_NAME: str = "AI Mock Interview"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

settings = Settings()
