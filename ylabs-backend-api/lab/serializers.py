from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import (
    Lab,
    LabStatus,
    LabSprint,
    LabSprintTicket,
    UserLabEnrollment,
    UserLabSprintTicketSubmission,
    SystemDesign,
    LearnRecurringTask,
    LearnRecurringTaskEnrollment,
    WeeklyTask,
    WeeklyTaskEnrollment,
)
from .system_design_utils import normalize_system_design

class LabSerializer(serializers.ModelSerializer):
    total_tickets = serializers.IntegerField(read_only=True, required=False)
    is_active = serializers.BooleanField(read_only=True, required=False)

    class Meta:
        model = Lab
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if 'status' not in ret and 'is_active' in data:
            ret['status'] = LabStatus.ACTIVE if data['is_active'] else LabStatus.INACTIVE
        return ret

class LabSprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSprint
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

class LabSprintTicketSerializer(serializers.ModelSerializer):
    sprint_order = serializers.IntegerField(source='sprint.order_index', read_only=True)
    test_command = serializers.SerializerMethodField()

    class Meta:
        model = LabSprintTicket
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def get_test_command(self, obj):
        if isinstance(obj.scoring_rules, dict):
            return obj.scoring_rules.get('test_command') or ''
        return ''

    def validate_system_design(self, value):
        if value:
            return normalize_system_design(value)
        return value

class UserLabEnrollmentSerializer(serializers.ModelSerializer):
    lab_details = serializers.SerializerMethodField()
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = UserLabEnrollment
        fields = '__all__'
        read_only_fields = ('user',)

    def get_lab_details(self, obj):
        lab = obj.lab
        if lab:
            return {
                'id': str(lab.id),
                'title': lab.title,
                'type': lab.type
            }
        return None

    def get_user_details(self, obj):
        user = obj.user
        if user:
            first = getattr(user, 'first_name', '')
            last = getattr(user, 'last_name', '')
            name = f"{first} {last}".strip()
            return {
                'id': user.id,
                'name': name if name else user.username,
                'email': user.email,
                'status': 'active' if user.is_active else 'suspended'
            }
        return None

class UserLabSprintTicketSubmissionSerializer(serializers.ModelSerializer):
    ticket_title = serializers.SerializerMethodField()
    ticket_slug = serializers.SerializerMethodField()
    lab_id = serializers.SerializerMethodField()
    lab_title = serializers.SerializerMethodField()
    sprint_id = serializers.SerializerMethodField()
    sprint_title = serializers.SerializerMethodField()

    class Meta:
        model = UserLabSprintTicketSubmission
        fields = '__all__'
        read_only_fields = ('user',)

    def get_ticket_title(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        return getattr(ticket, 'title', None)

    def get_ticket_slug(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        return getattr(ticket, 'ticket_slug', None)

    def get_lab_id(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        if ticket and getattr(ticket, 'sprint', None) and getattr(ticket.sprint, 'lab', None):
            return str(ticket.sprint.lab.id)
        return None

    def get_lab_title(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        if ticket and getattr(ticket, 'sprint', None) and getattr(ticket.sprint, 'lab', None):
            return ticket.sprint.lab.title
        return None

    def get_sprint_id(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        if ticket and getattr(ticket, 'sprint', None):
            return str(ticket.sprint.id)
        return None

    def get_sprint_title(self, obj):
        ticket = getattr(obj, 'lab_sprint_ticket', None)
        if ticket and getattr(ticket, 'sprint', None):
            return ticket.sprint.title
        return None

    def validate_system_design(self, value):
        if value:
            return normalize_system_design(value)
        return value


class SystemDesignSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    lab_title = serializers.CharField(source='lab.title', read_only=True)
    ticket_title = serializers.CharField(source='ticket.title', read_only=True)

    class Meta:
        model = SystemDesign
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

    def validate_design(self, value):
        if value:
            return normalize_system_design(value)
        return value


class LearnRecurringTaskSerializer(serializers.ModelSerializer):
    lab_details = serializers.SerializerMethodField()
    enrollments_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    is_future = serializers.SerializerMethodField()
    today_index = serializers.SerializerMethodField()
    enriched_days = serializers.SerializerMethodField()
    completed_days_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    is_all_completed = serializers.SerializerMethodField()

    class Meta:
        model = LearnRecurringTask
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

    def get_lab_details(self, obj):
        lab = obj.lab
        if lab:
            title_slug = lab.title.lower().replace(' ', '-').replace('&', 'and')
            slug = getattr(lab, 'slug', '') or title_slug
            return {
                'id': str(lab.id),
                'title': lab.title,
                'slug': slug,
                'type': lab.type,
                'difficulty': lab.difficulty,
                'description': lab.description,
            }
        return None

    def get_enrollments_count(self, obj):
        return obj.enrollments.count()

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(user=request.user).exists()
        return False

    def get_is_future(self, obj):
        today = timezone.now().date()
        return bool(obj.start_date and today < obj.start_date)

    def get_today_index(self, obj):
        today = timezone.now().date()
        total_days = 7 if getattr(obj, 'type', 'weekly') == 'weekly' else 30
        if obj.start_date and obj.end_date:
            if today < obj.start_date:
                return -1
            offset = (today - obj.start_date).days
            if offset >= total_days:
                return total_days
            return offset
        return (today.weekday()) % total_days

    def _get_submissions_map(self, obj):
        if hasattr(self, '_cached_submissions_map'):
            return self._cached_submissions_map

        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            self._cached_submissions_map = {}
            return self._cached_submissions_map

        ticket_ids = []
        if isinstance(obj.days, list):
            for d in obj.days:
                tids = []
                if d.get('ticket_ids') and isinstance(d['ticket_ids'], list):
                    tids.extend([str(x) for x in d['ticket_ids'] if x])
                elif d.get('ticket_id'):
                    tids.append(str(d['ticket_id']))

                if isinstance(d.get('tickets'), list):
                    for tk in d.get('tickets'):
                        if isinstance(tk, dict) and tk.get('ticket_id'):
                            tids.append(str(tk['ticket_id']))
                        elif isinstance(tk, str):
                            tids.append(str(tk))
                for tid in tids:
                    if tid and tid not in ticket_ids:
                        ticket_ids.append(tid)

        if not ticket_ids:
            self._cached_submissions_map = {}
            return self._cached_submissions_map

        subs = UserLabSprintTicketSubmission.objects.filter(
            user=request.user,
            lab_sprint_ticket_id__in=ticket_ids
        ).values('lab_sprint_ticket_id', 'ticket_status')

        self._cached_submissions_map = {
            str(s['lab_sprint_ticket_id']): s['ticket_status']
            for s in subs
        }
        return self._cached_submissions_map

    def _get_tickets_map(self, obj):
        if hasattr(self, '_cached_tickets_map'):
            return self._cached_tickets_map

        ticket_ids = []
        if isinstance(obj.days, list):
            for d in obj.days:
                tids = []
                if d.get('ticket_ids') and isinstance(d['ticket_ids'], list):
                    tids.extend([str(x) for x in d['ticket_ids'] if x])
                elif d.get('ticket_id'):
                    tids.append(str(d['ticket_id']))

                if isinstance(d.get('tickets'), list):
                    for tk in d.get('tickets'):
                        if isinstance(tk, dict) and tk.get('ticket_id'):
                            tids.append(str(tk['ticket_id']))
                        elif isinstance(tk, str):
                            tids.append(str(tk))
                for tid in tids:
                    if tid and tid not in ticket_ids:
                        ticket_ids.append(tid)

        if not ticket_ids:
            self._cached_tickets_map = {}
            return self._cached_tickets_map

        tickets = LabSprintTicket.objects.filter(
            id__in=ticket_ids
        ).select_related('sprint')

        def extract_tasks(ticket):
            bullets = []
            if isinstance(ticket.learning_objectives, list):
                for x in ticket.learning_objectives:
                    if isinstance(x, str) and x.strip():
                        bullets.append(x.strip())
            if not bullets and isinstance(ticket.tasks, list):
                for item in ticket.tasks:
                    if isinstance(item, str) and item.strip():
                        bullets.append(item.strip())
                    elif isinstance(item, dict):
                        title = item.get('title') or item.get('description')
                        if title and isinstance(title, str):
                            bullets.append(title.strip())
            if not bullets:
                bullets = [ticket.title]
            return bullets[:3]

        self._cached_tickets_map = {
            str(t.id): {
                'id': str(t.id),
                'title': t.title,
                'ticket_slug': t.ticket_slug,
                'difficulty': t.difficulty,
                'yuvro_points': t.yuvro_points or 10,
                'minutes_max': t.minutes_max or 45,
                'sprint_id': str(t.sprint.id) if t.sprint else None,
                'sprint_title': t.sprint.title if t.sprint else None,
                'tasks': extract_tasks(t),
            }
            for t in tickets
        }
        return self._cached_tickets_map

    def get_enriched_days(self, obj):
        days_list = obj.days if isinstance(obj.days, list) else []
        today_idx = self.get_today_index(obj)
        subs_map = self._get_submissions_map(obj)
        tickets_map = self._get_tickets_map(obj)
        total_days = 7 if getattr(obj, 'type', 'weekly') == 'weekly' else 30

        enriched = []
        for i, d in enumerate(days_list):
            # Compute actual day date and weekday name from start_date
            if obj.start_date:
                day_date = obj.start_date + timedelta(days=i)
                day_name = day_date.strftime("%A")
                date_str = day_date.isoformat()
                date_display = day_date.strftime("%b %d")
            else:
                day_name = d.get('day_name', f"Day {i + 1}")
                date_str = ""
                date_display = ""

            # Extract unique tickets for this day preserving order
            day_ticket_ids = []
            seen_tids = set()
            def add_day_tid(raw_tid):
                s = str(raw_tid).strip() if raw_tid else ""
                if s and s not in seen_tids:
                    seen_tids.add(s)
                    day_ticket_ids.append(s)

            if d.get('ticket_ids') and isinstance(d['ticket_ids'], list):
                for x in d['ticket_ids']:
                    add_day_tid(x)
            elif d.get('ticket_id'):
                add_day_tid(d['ticket_id'])

            if isinstance(d.get('tickets'), list):
                for tk in d['tickets']:
                    tid = tk.get('ticket_id', '') if isinstance(tk, dict) else tk
                    add_day_tid(tid)

            # Build enriched tickets list
            enriched_tickets = []
            for tid in day_ticket_ids:
                info = tickets_map.get(tid, {})
                status = subs_map.get(tid, '')
                tk_done = status in ['done', 'in_review']
                enriched_tickets.append({
                    'ticket_id': tid,
                    'title': info.get('title') or tid,
                    'ticket_slug': info.get('ticket_slug', ''),
                    'difficulty': info.get('difficulty', 'EASY'),
                    'yuvro_points': info.get('yuvro_points', 10),
                    'minutes_max': info.get('minutes_max', 45),
                    'is_completed': tk_done,
                    'tasks': info.get('tasks', []),
                })

            # Day is completed if all tickets for this day are completed
            is_done = (
                all(t['is_completed'] for t in enriched_tickets)
                if enriched_tickets
                else False
            )

            # Lock status
            if today_idx < 0:
                is_locked = True
            elif today_idx >= total_days:
                is_locked = False
            else:
                is_locked = (i > today_idx)

            first_ticket = enriched_tickets[0] if enriched_tickets else {}
            first_tid = first_ticket.get('ticket_id', str(d.get('ticket_id', '')))
            first_title = first_ticket.get('title', d.get('ticket_title', ''))

            total_points = sum(t.get('yuvro_points', 10) for t in enriched_tickets) if enriched_tickets else 10
            total_minutes = sum(t.get('minutes_max', 45) for t in enriched_tickets) if enriched_tickets else 45

            tasks_list = d.get('tasks') or first_ticket.get('tasks') or ([first_title] if first_title else [])

            lab_slug = getattr(obj.lab, 'slug', '') or (obj.lab.title.lower().replace(' ', '-').replace('&', 'and') if obj.lab else '')

            item = {
                'day_index': d.get('day_index', i),
                'day_name': day_name,
                'date': date_str,
                'date_display': date_display,
                'lab_id': str(obj.lab_id) if obj.lab_id else None,
                'lab_title': obj.lab.title if obj.lab else '',
                'lab_slug': lab_slug,
                'sprint_id': d.get('sprint_id') or tickets_map.get(first_tid, {}).get('sprint_id'),
                'sprint_title': tickets_map.get(first_tid, {}).get('sprint_title') or d.get('sprint_title', ''),
                'ticket_id': first_tid,
                'ticket_title': first_title,
                'ticket_slug': first_ticket.get('ticket_slug', ''),
                'difficulty': first_ticket.get('difficulty', 'EASY'),
                'yuvro_points': total_points,
                'minutes_max': total_minutes,
                'is_completed': is_done,
                'is_locked': is_locked,
                'tasks': tasks_list,
                'ticket_ids': day_ticket_ids,
                'tickets': enriched_tickets,
            }
            enriched.append(item)
        return enriched

    def get_completed_days_count(self, obj):
        enriched = self.get_enriched_days(obj)
        return sum(1 for d in enriched if d.get('is_completed'))

    def get_progress_percentage(self, obj):
        count = self.get_completed_days_count(obj)
        total_days = 7 if getattr(obj, 'type', 'weekly') == 'weekly' else 30
        total = len(obj.days) if isinstance(obj.days, list) and obj.days else total_days
        return round((count / total) * 100) if total > 0 else 0

    def get_is_all_completed(self, obj):
        count = self.get_completed_days_count(obj)
        total_days = 7 if getattr(obj, 'type', 'weekly') == 'weekly' else 30
        total = len(obj.days) if isinstance(obj.days, list) and obj.days else total_days
        return count >= total if total > 0 else False


class LearnRecurringTaskEnrollmentSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()
    recurring_task_name = serializers.CharField(source='recurring_task.name', read_only=True)
    weekly_task_name = serializers.CharField(source='recurring_task.name', read_only=True)
    recurring_task_type = serializers.CharField(source='recurring_task.type', read_only=True)
    lab_id = serializers.CharField(source='recurring_task.lab.id', read_only=True)
    lab_title = serializers.CharField(source='recurring_task.lab.title', read_only=True)

    class Meta:
        model = LearnRecurringTaskEnrollment
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

    def get_user_details(self, obj):
        u = obj.user
        if u:
            first = getattr(u, 'first_name', '')
            last = getattr(u, 'last_name', '')
            name = f"{first} {last}".strip()
            return {
                'id': u.id,
                'name': name if name else u.username,
                'email': u.email,
            }
        return None


# Backward compatibility aliases
WeeklyTaskSerializer = LearnRecurringTaskSerializer
WeeklyTaskEnrollmentSerializer = LearnRecurringTaskEnrollmentSerializer


