from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Sum, Count, F, Q, ExpressionWrapper, FloatField
from assessment.models import SkillTestSubmission, SkillTest
from course.models import Subject, Unit
from authentication.permissions import IsOwnerOrContentManagerOrAdmin

class LeaderboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _get_college_filter(self, request):
        user = request.user
        if hasattr(user, 'role'):
            if user.role == 'placement_officer' and hasattr(user, 'placement_officer_profile'):
                return Q(user__student_profile__college=user.placement_officer_profile.college)
            elif user.role == 'college_admin' and hasattr(user, 'college_admin_profile'):
                return Q(user__student_profile__college=user.college_admin_profile.college)
        return Q()

    def _calculate_performance(self, avg_score, avg_accuracy, completion_rate):
        # Performance Score out of 10
        # 70% weight on accuracy (quality), 30% weight on completion rate (quantity)
        score_out_of_100 = (avg_accuracy * 0.7) + (completion_rate * 0.3)
        return score_out_of_100 / 10.0

    @action(detail=False, methods=['get'], url_path=r'test/(?P<test_id>[^/.]+)')
    def test_leaderboard(self, request, test_id=None):
        submissions = SkillTestSubmission.objects.filter(
            skill_test_id=test_id,
            status=SkillTestSubmission.STATUS_COMPLETED
        ).filter(self._get_college_filter(request)).select_related('user')
        
        # In a real app we aggregate multiple attempts, for now we pick the max score attempt
        from django.db.models import Max
        # Using a subquery or ordering to get the best submission per user
        data = []
        for sub in submissions:
            # dummy accuracy calculate (score / total_marks * 100)
            accuracy = (sub.marks / sub.skill_test.total_marks * 100) if sub.skill_test.total_marks else 0
            data.append({
                'user_id': sub.user.id,
                'student_name': f"{sub.user.first_name} {sub.user.last_name}".strip() or sub.user.username,
                'score': sub.marks,
                'accuracy': round(accuracy, 2),
                'time_taken': (sub.completed_at - sub.started_at).total_seconds() if sub.completed_at and sub.started_at else 0,
                'attempts': 1, # Simplified
                'completed_at': sub.completed_at,
            })
            
        data.sort(key=lambda x: (-x['score'], -x['accuracy'], x['time_taken']))
        
        for idx, item in enumerate(data):
            item['rank'] = idx + 1
            item['is_current_user'] = item['user_id'] == request.user.id
            
        return Response(data)

    @action(detail=False, methods=['get'], url_path=r'unit/(?P<unit_id>[^/.]+)')
    def unit_leaderboard(self, request, unit_id=None):
        tests = SkillTest.objects.filter(unit_id=unit_id)
        submissions = SkillTestSubmission.objects.filter(
            skill_test__in=tests,
            status=SkillTestSubmission.STATUS_COMPLETED
        ).filter(self._get_college_filter(request)).values('user__id', 'user__first_name', 'user__last_name', 'user__username').annotate(
            avg_score=Avg('marks'),
            avg_accuracy=Avg(ExpressionWrapper(F('marks') * 100.0 / F('skill_test__total_marks'), output_field=FloatField())),
            total_tests=Count('skill_test', distinct=True)
        )
        
        total_tests_in_unit = tests.count()
        data = []
        for sub in submissions:
            completion_rate = (sub['total_tests'] / total_tests_in_unit * 100) if total_tests_in_unit else 0
            avg_accuracy = sub['avg_accuracy'] or 0
            perf_score = self._calculate_performance(sub['avg_score'] or 0, avg_accuracy, completion_rate)
            
            data.append({
                'user_id': sub['user__id'],
                'student_name': f"{sub['user__first_name']} {sub['user__last_name']}".strip() or sub['user__username'],
                'tests_completed': sub['total_tests'],
                'avg_score': round(sub['avg_score'] or 0, 2),
                'accuracy': round(avg_accuracy or 0, 2),
                'performance_score': round(perf_score, 2),
            })
            
        data.sort(key=lambda x: -x['performance_score'])
        for idx, item in enumerate(data):
            item['rank'] = idx + 1
            item['is_current_user'] = item['user_id'] == request.user.id
            
        return Response(data)

    @action(detail=False, methods=['get'], url_path=r'subject/(?P<subject_id>[^/.]+)')
    def subject_leaderboard(self, request, subject_id=None):
        tests = SkillTest.objects.filter(subject_id=subject_id, test_type='practice')
        return self._aggregate_leaderboard(request, tests)

    @action(detail=False, methods=['get'], url_path=r'assessments/(?P<subject_id>[^/.]+)')
    def assessment_leaderboard(self, request, subject_id=None):
        tests = SkillTest.objects.filter(subject_id=subject_id, test_type='assessment')
        return self._aggregate_leaderboard(request, tests)

    @action(detail=False, methods=['get'], url_path='global')
    def global_leaderboard(self, request):
        test_type = request.query_params.get('test_type', 'practice')
        tests = SkillTest.objects.filter(test_type=test_type)
        return self._aggregate_leaderboard(request, tests)

    def _aggregate_leaderboard(self, request, tests):
        submissions = SkillTestSubmission.objects.filter(
            skill_test__in=tests,
            status=SkillTestSubmission.STATUS_COMPLETED
        ).filter(self._get_college_filter(request)).values('user__id', 'user__first_name', 'user__last_name', 'user__username').annotate(
            avg_score=Avg('marks'),
            avg_accuracy=Avg(ExpressionWrapper(F('marks') * 100.0 / F('skill_test__total_marks'), output_field=FloatField())),
            total_tests=Count('skill_test', distinct=True)
        )
        
        total_tests_in_scope = tests.count()
        data = []
        for sub in submissions:
            completion_rate = (sub['total_tests'] / total_tests_in_scope * 100) if total_tests_in_scope else 0
            avg_accuracy = sub['avg_accuracy'] or 0
            perf_score = self._calculate_performance(sub['avg_score'] or 0, avg_accuracy, completion_rate)
            data.append({
                'user_id': sub['user__id'],
                'student_name': f"{sub['user__first_name']} {sub['user__last_name']}".strip() or sub['user__username'],
                'tests_completed': sub['total_tests'],
                'avg_score': round(sub['avg_score'] or 0, 2),
                'accuracy': round(avg_accuracy, 2),
                'performance_score': round(perf_score, 2),
            })
            
        data.sort(key=lambda x: -x['performance_score'])
        for idx, item in enumerate(data):
            item['rank'] = idx + 1
            item['is_current_user'] = item['user_id'] == request.user.id
            
        return Response(data)
