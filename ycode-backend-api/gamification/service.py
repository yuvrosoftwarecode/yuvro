import datetime
import math
import random
from django.utils import timezone
from .models import UserGamificationProfile, DailyUserActivity, Badge, UserBadge, Mission, UserMission


# ─── Level System ────────────────────────────────────────────────────────────
# Progressive curve: early levels are fast, later levels require more XP.
# Formula: Level = floor(sqrt(XP / 50)) + 1
#   Level 1:    0 XP     Level 6:   1250 XP     Level 15:  9800 XP
#   Level 2:   50 XP     Level 7:   1800 XP     Level 20: 18050 XP
#   Level 3:  200 XP     Level 8:   2450 XP     Level 30: 42050 XP
#   Level 4:  450 XP     Level 9:   3200 XP     Level 50: 120050 XP
#   Level 5:  800 XP     Level 10:  4050 XP

LEVEL_TIERS = [
    (1,  'Beginner'),
    (5,  'Learner'),
    (10, 'Intermediate'),
    (20, 'Advanced'),
    (30, 'Expert'),
    (40, 'Master'),
    (50, 'Legend'),
]


def calculate_level(total_xp):
    """Convert total XP to level using progressive sqrt curve."""
    return int(math.sqrt(total_xp / 50)) + 1 if total_xp >= 0 else 1


def xp_required_for_level(level):
    """XP needed to reach a given level."""
    return (level - 1) ** 2 * 50 if level > 1 else 0


def get_level_progress(total_xp):
    """Return (current_level, xp_into_level, xp_to_next_level, progress_pct, tier_name).
    
    xp_to_next_level = XP still needed to reach the next level (the gap, not the ceiling).
    """
    level = calculate_level(total_xp)
    current_threshold = xp_required_for_level(level)
    next_threshold = xp_required_for_level(level + 1)
    xp_into_level = total_xp - current_threshold
    xp_span = next_threshold - current_threshold
    xp_to_next_level = xp_span - xp_into_level  # remaining gap
    progress_pct = round((xp_into_level / xp_span) * 100) if xp_span > 0 else 0

    tier_name = 'Beginner'
    for min_level, name in reversed(LEVEL_TIERS):
        if level >= min_level:
            tier_name = name
            break

    return level, xp_into_level, xp_to_next_level, progress_pct, tier_name


# Badge definitions — key maps to evaluation logic in check_badges()
BADGE_DEFINITIONS = [
    # Streak
    dict(key='streak_1',   name='First Step',      description='Complete your first day of learning.',         category='streak',   icon='flame',       xp_reward=10),
    dict(key='streak_7',   name='Week Warrior',     description='Maintain a 7-day streak.',                    category='streak',   icon='flame',       xp_reward=50),
    dict(key='streak_30',  name='Month Legend',     description='Maintain a 30-day streak.',                   category='streak',   icon='flame',       xp_reward=200),
    # XP
    dict(key='xp_100',     name='Point Starter',    description='Earn your first 100 XP.',                     category='xp',       icon='zap',         xp_reward=0),
    dict(key='xp_500',     name='Point Hunter',     description='Earn 500 XP.',                                category='xp',       icon='zap',         xp_reward=0),
    dict(key='xp_2000',    name='Point Master',     description='Earn 2000 XP.',                               category='xp',       icon='zap',         xp_reward=0),
    # Coding
    dict(key='code_1',     name='First Solve',      description='Solve your first coding problem.',            category='coding',   icon='code',        xp_reward=20),
    dict(key='code_10',    name='Problem Solver',   description='Solve 10 coding problems.',                   category='coding',   icon='code',        xp_reward=50),
    dict(key='code_50',    name='Code Champion',    description='Solve 50 coding problems.',                   category='coding',   icon='trophy',      xp_reward=200),
    # Learning
    dict(key='lesson_1',   name='First Lesson',     description='Complete your first lesson.',                 category='learning', icon='book-open',   xp_reward=10),
    dict(key='lesson_10',  name='Dedicated Learner',description='Complete 10 lessons.',                        category='learning', icon='book-open',   xp_reward=50),
    dict(key='course_1',   name='Course Graduate',  description='Complete your first full course.',            category='learning', icon='graduation-cap', xp_reward=100),
    # Quiz
    dict(key='quiz_1',     name='Quiz Taker',       description='Pass your first quiz.',                       category='quiz',     icon='brain-circuit', xp_reward=10),
    dict(key='quiz_10',    name='Quiz Ace',          description='Pass 10 quizzes.',                           category='quiz',     icon='brain-circuit', xp_reward=50),
]


def seed_badges():
    """Create badge definitions in DB if they don't exist."""
    for defn in BADGE_DEFINITIONS:
        Badge.objects.get_or_create(key=defn['key'], defaults=defn)


class GamificationService:
    XP_VIDEO = 10
    XP_QUIZ = 20
    XP_CODING = 50
    XP_COURSE_COMPLETION = 500

    @staticmethod
    def get_or_create_profile(user):
        profile, _ = UserGamificationProfile.objects.get_or_create(user=user)
        return profile

    @classmethod
    def update_streak(cls, user):
        """
        Update streak on activity.
        Rules:
        - Same day as last activity: no-op
        - Last activity was yesterday: streak continues (+1)
        - Any other gap (missed 1+ days): streak resets to 1

        Returns dict with streak feedback:
        {
            'streak_lost': bool,     # True if a previous streak was reset
            'days_missed': int,      # Days gap before returning (0 if continuous)
            'comeback': bool,        # True if returning after 2+ missed days
            'current_streak': int,
        }
        """
        profile = cls.get_or_create_profile(user)
        today = timezone.now().date()
        last_date = profile.last_activity_date

        feedback = {
            'streak_lost': False,
            'days_missed': 0,
            'comeback': False,
            'current_streak': profile.current_streak,
        }

        if last_date == today:
            # Already active today — nothing to do
            return feedback

        if last_date is None:
            # First ever activity
            profile.current_streak = 1
        elif last_date == today - datetime.timedelta(days=1):
            # Consecutive day — continue streak
            profile.current_streak += 1
        else:
            # Missed one or more days — streak resets
            gap = (today - last_date).days - 1
            feedback['days_missed'] = gap
            feedback['comeback'] = gap >= 2
            feedback['streak_lost'] = profile.current_streak > 1
            profile.days_missed = gap
            profile.current_streak = 1

        if profile.current_streak > profile.longest_streak:
            profile.longest_streak = profile.current_streak

        feedback['current_streak'] = profile.current_streak
        profile.last_activity_date = today
        profile.save()

    @classmethod
    def award_xp(cls, user, amount):
        """Award XP and update level. Returns (leveled_up, old_level, new_level)."""
        profile = cls.get_or_create_profile(user)
        old_level = profile.current_level
        profile.total_xp += amount
        new_level = calculate_level(profile.total_xp)
        leveled_up = new_level > old_level
        if leveled_up:
            profile.current_level = new_level
        profile.save()
        return leveled_up, old_level, new_level

    @classmethod
    def check_badges(cls, user):
        """
        Evaluate all badge conditions for the user and award any newly earned badges.
        Returns a list of newly awarded Badge objects.
        NOTE: Requires `python manage.py seed_gamification` to have been run first.
        """
        profile = cls.get_or_create_profile(user)
        already_earned = set(
            UserBadge.objects.filter(user=user).values_list('badge__key', flat=True)
        )
        newly_earned = []

        conditions = {
            'streak_1':   profile.current_streak >= 1,
            'streak_7':   profile.current_streak >= 7,
            'streak_30':  profile.current_streak >= 30,
            'xp_100':     profile.total_xp >= 100,
            'xp_500':     profile.total_xp >= 500,
            'xp_2000':    profile.total_xp >= 2000,
            'code_1':     profile.total_problems_solved >= 1,
            'code_10':    profile.total_problems_solved >= 10,
            'code_50':    profile.total_problems_solved >= 50,
            'lesson_1':   profile.total_lessons_completed >= 1,
            'lesson_10':  profile.total_lessons_completed >= 10,
            'course_1':   profile.total_courses_completed >= 1,
            'quiz_1':     profile.total_quizzes_passed >= 1,
            'quiz_10':    profile.total_quizzes_passed >= 10,
        }

        for key, condition_met in conditions.items():
            if condition_met and key not in already_earned:
                try:
                    badge = Badge.objects.get(key=key)
                    UserBadge.objects.create(user=user, badge=badge)
                    newly_earned.append(badge)
                    # Award XP bonus for the badge
                    if badge.xp_reward > 0:
                        cls.award_xp(user, badge.xp_reward)
                except Badge.DoesNotExist:
                    pass

        return newly_earned

    # Daily XP caps per activity type
    XP_CAPS = {
        'video':           5,   # max 5 videos/day = 50 XP
        'quiz':            5,   # max 5 quizzes/day = 100 XP
        'coding':          10,  # max 10 solves/day = 500 XP
        'course_complete': 1,   # max 1 course completion/day
    }

    @classmethod
    def record_activity(cls, user, activity_type):
        """
        Central activity recording entry point.
        Returns a dict with gamification feedback for the frontend:
        {
            'xp_earned': int,
            'new_badges': [{'key', 'name', 'icon', 'xp_reward'}],
            'welcome_bonus': int,
            'leveled_up': bool,
            'new_level': int,
            'tier_name': str,
        }
        """
        streak_feedback = cls.update_streak(user)

        today = timezone.now().date()
        daily_activity, _ = DailyUserActivity.objects.get_or_create(user=user, date=today)

        # Detect first-ever activity for welcome bonus
        is_first_activity = daily_activity.activity_count == 0 and not DailyUserActivity.objects.filter(
            user=user
        ).exclude(date=today).exists()

        daily_activity.activity_count += 1

        # Check per-type cap before awarding XP
        cap = cls.XP_CAPS.get(activity_type)
        type_count_field = f"{activity_type}_count" if activity_type in ('video', 'quiz', 'coding') else None
        current_count = getattr(daily_activity, type_count_field, 0) if type_count_field else 0
        xp_eligible = cap is None or current_count < cap

        # Increment per-type counter
        if type_count_field:
            setattr(daily_activity, type_count_field, current_count + 1)
        daily_activity.save()

        xp_map = {
            'video': cls.XP_VIDEO,
            'quiz': cls.XP_QUIZ,
            'coding': cls.XP_CODING,
            'course_complete': cls.XP_COURSE_COMPLETION,
        }

        total_xp_earned = 0
        leveled_up = False
        new_level = 0

        xp = xp_map.get(activity_type, 0)
        if xp > 0 and xp_eligible:
            leveled_up, _, new_level = cls.award_xp(user, xp)
            total_xp_earned += xp

        # Update activity counters on profile
        profile = cls.get_or_create_profile(user)
        if activity_type == 'coding':
            profile.total_problems_solved += 1
            profile.save(update_fields=['total_problems_solved'])
            MissionService.update_mission_progress(user, 'solve_problems')
        elif activity_type == 'quiz':
            profile.total_quizzes_passed += 1
            profile.save(update_fields=['total_quizzes_passed'])
            MissionService.update_mission_progress(user, 'pass_quizzes')
        elif activity_type == 'video':
            profile.total_lessons_completed += 1
            profile.save(update_fields=['total_lessons_completed'])
            MissionService.update_mission_progress(user, 'complete_lessons')
        elif activity_type == 'course_complete':
            profile.total_courses_completed += 1
            profile.save(update_fields=['total_courses_completed'])

        # Advance streak missions
        MissionService.update_mission_progress(user, 'maintain_streak', increment=1)
        # Advance XP missions only if XP was actually awarded
        if xp > 0 and xp_eligible:
            MissionService.update_xp_missions(user, xp)

        # Welcome bonus for brand new users
        welcome_bonus = 0
        if is_first_activity:
            welcome_bonus = 50
            lu, _, new_level = cls.award_xp(user, welcome_bonus)
            total_xp_earned += welcome_bonus
            leveled_up = leveled_up or lu

        # Check and award any newly unlocked badges
        new_badges = cls.check_badges(user)

        # Resolve final level/tier info
        if not new_level:
            profile.refresh_from_db()
            new_level = profile.current_level
        _, _, _, _, tier_name = get_level_progress(profile.total_xp)

        return {
            'xp_earned': total_xp_earned,
            'new_badges': [{'key': b.key, 'name': b.name, 'icon': b.icon, 'xp_reward': b.xp_reward} for b in new_badges],
            'welcome_bonus': welcome_bonus,
            'leveled_up': leveled_up,
            'new_level': new_level,
            'tier_name': tier_name,
            'streak_lost': streak_feedback.get('streak_lost', False),
            'comeback': streak_feedback.get('comeback', False),
            'current_streak': streak_feedback.get('current_streak', 0),
        }

MISSION_DEFINITIONS = [
    dict(key='solve_1',    title='Quick Coder',       description='Solve 1 coding problem today.',      mission_type='solve_problems',   target=1,  xp_reward=25,  icon='code'),
    dict(key='solve_3',    title='Problem Trio',      description='Solve 3 coding problems today.',     mission_type='solve_problems',   target=3,  xp_reward=60,  icon='code'),
    dict(key='lesson_1',   title='Daily Learner',     description='Complete 1 lesson today.',           mission_type='complete_lessons', target=1,  xp_reward=20,  icon='book-open'),
    dict(key='lesson_3',   title='Knowledge Seeker',  description='Complete 3 lessons today.',          mission_type='complete_lessons', target=3,  xp_reward=50,  icon='book-open'),
    dict(key='quiz_1',     title='Quiz Time',         description='Pass 1 quiz today.',                 mission_type='pass_quizzes',     target=1,  xp_reward=30,  icon='brain-circuit'),
    dict(key='xp_50',      title='XP Grinder',        description='Earn 50 XP today.',                  mission_type='earn_xp',          target=50, xp_reward=20,  icon='zap'),
    dict(key='streak_day', title='Keep It Going',     description='Maintain your streak today.',        mission_type='maintain_streak',  target=1,  xp_reward=15,  icon='flame'),
]


def seed_missions():
    """Create mission definitions in DB if they don't exist."""
    for defn in MISSION_DEFINITIONS:
        Mission.objects.get_or_create(key=defn['key'], defaults=defn)


class MissionService:
    # How many missions to assign per day
    DAILY_MISSION_COUNT = 3

    @classmethod
    def get_or_assign_daily_missions(cls, user):
        """
        Return today's missions for the user.
        - First call: assigns DAILY_MISSION_COUNT missions.
        - Subsequent calls: if any missions are completed, replaces them
          with new ones from the unused pool, keeping DAILY_MISSION_COUNT active.
        Returns (active_missions, total_completed_count).
        NOTE: Requires `python manage.py seed_gamification` to have been run first.
        """
        today = timezone.now().date()

        existing = list(
            UserMission.objects.filter(user=user, date=today)
            .select_related('mission')
            .order_by('id')
        )

        if not existing:
            # First time today — assign initial batch
            active_missions = list(Mission.objects.filter(is_active=True))
            streak_missions = [m for m in active_missions if m.mission_type == 'maintain_streak']
            other_missions = [m for m in active_missions if m.mission_type != 'maintain_streak']

            selected = streak_missions[:1]
            remaining_slots = cls.DAILY_MISSION_COUNT - len(selected)
            if remaining_slots > 0 and other_missions:
                selected += random.sample(other_missions, min(remaining_slots, len(other_missions)))

            user_missions = []
            for mission in selected:
                um, _ = UserMission.objects.get_or_create(user=user, mission=mission, date=today)
                user_missions.append(um)

            return user_missions, 0

        # Separate completed vs active
        completed = [um for um in existing if um.is_completed]
        active = [um for um in existing if not um.is_completed]
        total_completed = len(completed)

        # If we have fewer active missions than the daily count, fill the gap
        slots_to_fill = cls.DAILY_MISSION_COUNT - len(active)

        if slots_to_fill > 0:
            # Find missions not yet assigned today
            assigned_mission_ids = set(um.mission_id for um in existing)
            available = list(
                Mission.objects.filter(is_active=True)
                .exclude(id__in=assigned_mission_ids)
            )

            if available:
                new_picks = random.sample(available, min(slots_to_fill, len(available)))
                for mission in new_picks:
                    um = UserMission.objects.create(user=user, mission=mission, date=today)
                    active.append(um)

        return active, total_completed

    @classmethod
    def _award_mission_xp(cls, user, newly_completed):
        """Award XP for each newly completed mission and mark xp_awarded=True."""
        for um in newly_completed:
            if not um.xp_awarded and um.mission.xp_reward > 0:
                GamificationService.award_xp(user, um.mission.xp_reward)
                um.xp_awarded = True
                um.save(update_fields=['xp_awarded'])

    @classmethod
    def update_mission_progress(cls, user, mission_type, increment=1):
        """
        Called after an activity to advance matching missions.
        Returns list of newly completed UserMission objects.
        """
        today = timezone.now().date()
        missions = UserMission.objects.filter(
            user=user, date=today, is_completed=False,
            mission__mission_type=mission_type,
        ).select_related('mission')

        newly_completed = []
        for um in missions:
            um.progress = min(um.progress + increment, um.mission.target)
            if um.progress >= um.mission.target:
                um.is_completed = True
                um.completed_at = timezone.now()
                newly_completed.append(um)
            um.save(update_fields=['progress', 'is_completed', 'completed_at'])

        cls._award_mission_xp(user, newly_completed)
        return newly_completed

    @classmethod
    def update_xp_missions(cls, user, xp_earned):
        """Special handler for earn_xp missions — tracks cumulative XP earned today."""
        today = timezone.now().date()
        missions = UserMission.objects.filter(
            user=user, date=today, is_completed=False,
            mission__mission_type='earn_xp',
        ).select_related('mission')

        newly_completed = []
        for um in missions:
            um.progress = min(um.progress + xp_earned, um.mission.target)
            if um.progress >= um.mission.target:
                um.is_completed = True
                um.completed_at = timezone.now()
                newly_completed.append(um)
            um.save(update_fields=['progress', 'is_completed', 'completed_at'])

        cls._award_mission_xp(user, newly_completed)
        return newly_completed
