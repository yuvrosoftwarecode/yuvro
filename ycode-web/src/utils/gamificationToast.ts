import { toast } from 'sonner';

/**
 * Standard gamification feedback shape returned by backend APIs.
 * Returned in response.gamification from quiz/coding/video/assessment endpoints.
 */
export interface GamificationFeedback {
  xp_earned: number;
  new_badges: Array<{ key: string; name: string; icon: string; xp_reward: number }>;
  welcome_bonus: number;
  leveled_up: boolean;
  new_level: number;
  tier_name: string;
  // Streak events
  streak_lost?: boolean;
  comeback?: boolean;
  current_streak?: number;
}

/**
 * Show gamification toast notifications based on API response.
 * Call this after any API that returns a `gamification` field.
 *
 * Usage:
 *   const res = await markSubtopicVideoWatched(subtopicId);
 *   showGamificationToasts(res.gamification);
 */
export function showGamificationToasts(feedback?: GamificationFeedback) {
  if (!feedback) return;

  // 1. Streak events — show first, highest priority
  if (feedback.comeback) {
    toast(`🔥 Welcome back! ${feedback.current_streak ?? 1}-day streak started`, {
      description: 'Great to see you again — keep the momentum going!',
      duration: 5000,
    });
  } else if (feedback.streak_lost) {
    toast('💔 Streak reset — but you\'re back!', {
      description: 'New streak started. Consistency builds champions!',
      duration: 4000,
    });
  }

  const baseDelay = (feedback.comeback || feedback.streak_lost) ? 500 : 0;

  // 2. YP earned
  if (feedback.xp_earned > 0) {
    setTimeout(() => {
      toast(`⚡ +${feedback.xp_earned} YP earned!`, {
        description: feedback.welcome_bonus > 0
          ? `Welcome bonus: +${feedback.welcome_bonus} YP 🎉`
          : undefined,
        duration: 3000,
      });
    }, baseDelay);
  }

  // 3. Level up — shown after YP toast with stagger
  if (feedback.leveled_up) {
    setTimeout(() => {
      toast(`🚀 Level Up! → Level ${feedback.new_level}`, {
        description: `You're now "${feedback.tier_name}" tier`,
        duration: 5000,
      });
    }, baseDelay + 800);
  }

  // 4. Badge unlocks — shown after other toasts
  if (feedback.new_badges?.length > 0) {
    const delay = baseDelay + (feedback.leveled_up ? 1600 : 800);
    feedback.new_badges.forEach((badge, i) => {
      setTimeout(() => {
        const xpNote = badge.xp_reward > 0 ? ` (+${badge.xp_reward} YP bonus)` : '';
        toast(`🏆 Badge Unlocked: ${badge.name}`, {
          description: `${getBadgeEmoji(badge.icon)} ${badge.name}${xpNote}`,
          duration: 5000,
        });
      }, delay + i * 600);
    });
  }
}

function getBadgeEmoji(icon: string): string {
  const map: Record<string, string> = {
    'flame': '🔥',
    'zap': '⚡',
    'code': '💻',
    'trophy': '🏆',
    'book-open': '📖',
    'brain-circuit': '🧠',
    'graduation-cap': '🎓',
  };
  return map[icon] || '🏅';
}
