"""
Contest Analytics Service
Provides analytics for students, colleges, and overall contests.
"""
from django.db.models import Avg, Max, Min, Count, Q, F
from django.utils import timezone
from typing import Dict, List, Any, Optional
from .models import (
    Contest,
    ContestSubmission,
    ContestQuestionActivity,
)
from authentication.models import User, College
from course.models import Question


class ContestAnalyticsService:
    """Service for generating contest analytics at different levels."""

    def __init__(self, contest_id: str):
        self.contest_id = contest_id
        try:
            self.contest = Contest.objects.get(id=contest_id)
        except Contest.DoesNotExist:
            raise ValueError(f"Contest with id {contest_id} does not exist")

    def get_student_analytics(self, user_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive analytics for a single student's contest performance.
        
        Args:
            user_id: UUID of the student
            
        Returns:
            Dictionary containing all student analytics data
        """
        try:
            user = User.objects.get(id=user_id)
            submission = ContestSubmission.objects.select_related(
                'user', 'user__profile', 'contest'
            ).get(contest=self.contest, user=user)
        except (User.DoesNotExist, ContestSubmission.DoesNotExist):
            raise ValueError("Student submission not found for this contest")

        # Get all question activities for this submission
        question_activities = ContestQuestionActivity.objects.filter(
            contest_submission=submission,
            is_final_answer=True
        ).select_related('question', 'question__topic').order_by('created_at')

        # Calculate basic metrics
        performance_overview = self._calculate_performance_overview(submission, user)
        question_breakdown = self._calculate_question_breakdown(question_activities)
        topic_performance = self._calculate_topic_performance(question_activities)
        difficulty_analysis = self._calculate_difficulty_analysis(question_activities)
        time_analysis = self._calculate_time_analysis(submission, question_activities)
        behavioral_insights = self._calculate_behavioral_insights(submission, question_activities)

        return {
            "contest_info": {
                "title": self.contest.title,
                "start_time": self.contest.start_datetime,
                "end_time": self.contest.end_datetime,
                "total_marks": self.contest.total_marks,
                "passing_marks": self.contest.passing_marks,
                "duration_minutes": self.contest.duration,
            },
            "performance_overview": performance_overview,
            "question_breakdown": question_breakdown,
            "topic_performance": topic_performance,
            "difficulty_analysis": difficulty_analysis,
            "time_analysis": time_analysis,
            "behavioral_insights": behavioral_insights,
            "submission_details": {
                "submission_id": str(submission.id),
                "status": submission.status,
                "started_at": submission.started_at,
                "submitted_at": submission.submitted_at,
                "completed_at": submission.completed_at,
            }
        }

    def _calculate_performance_overview(
        self, submission: ContestSubmission, user: User
    ) -> Dict[str, Any]:
        """Calculate overall performance metrics for the student."""
        # Get all submissions for ranking
        all_submissions = ContestSubmission.objects.filter(
            contest=self.contest
        ).exclude(
            status=ContestSubmission.STATUS_CANCELLED
        ).order_by('-marks', 'submitted_at')

        # Calculate overall rank using a single DB count (avoids iterating all rows)
        student_marks = submission.marks or 0
        rank = all_submissions.filter(
            Q(marks__gt=student_marks) |
            Q(marks=student_marks, submitted_at__lt=submission.submitted_at)
        ).count() + 1

        total_participants = all_submissions.count()

        # Rank is only meaningful with multiple participants
        display_rank = rank if total_participants > 1 else None

        # Percentile = score-based (% of max marks achieved) — always meaningful regardless of participant count
        score_percentage = round((student_marks / self.contest.total_marks * 100), 2) if self.contest.total_marks > 0 else 0
        percentile = score_percentage

        # Get college rank if user has a college
        college_rank = None
        college_total = None
        profile = getattr(user, 'profile', None)
        if profile and profile.college:
            college_submissions = all_submissions.filter(
                user__profile__college=profile.college
            )
            college_total = college_submissions.count()
            # Use DB count for college rank too
            college_rank = college_submissions.filter(
                Q(marks__gt=student_marks) |
                Q(marks=student_marks, submitted_at__lt=submission.submitted_at)
            ).count() + 1

        # Calculate time taken
        time_taken_seconds = None
        if submission.submitted_at and submission.started_at:
            time_taken_seconds = (submission.submitted_at - submission.started_at).total_seconds()

        # Get contest average
        contest_avg = all_submissions.aggregate(avg_marks=Avg('marks'))['avg_marks'] or 0

        # Get college average if applicable
        college_avg = None
        if profile and profile.college:
            college_avg = all_submissions.filter(
                user__profile__college=profile.college
            ).aggregate(avg_marks=Avg('marks'))['avg_marks'] or 0

        return {
            "score": submission.marks or 0,
            "max_score": self.contest.total_marks,
            "percentage": round((submission.marks or 0) / self.contest.total_marks * 100, 2) if self.contest.total_marks > 0 else 0,
            "rank": display_rank,
            "total_participants": total_participants,
            "percentile": round(percentile, 2),
            "college_rank": college_rank,
            "college_total_participants": college_total,
            "time_taken_seconds": time_taken_seconds,
            "time_taken_minutes": round(time_taken_seconds / 60, 2) if time_taken_seconds else None,
            "allocated_time_minutes": self.contest.duration,
            "completion_status": submission.status,
            "contest_average": round(contest_avg, 2),
            "college_average": round(college_avg, 2) if college_avg else None,
            "vs_contest_avg": round((submission.marks or 0) - contest_avg, 2),
            "vs_college_avg": round((submission.marks or 0) - college_avg, 2) if college_avg is not None else None,
        }

    def _calculate_question_breakdown(
        self, question_activities: List[ContestQuestionActivity]
    ) -> List[Dict[str, Any]]:
        """Generate question-wise performance breakdown."""
        breakdown = []
        
        for qa in question_activities:
            question = qa.question

            # Extract correct answer(s) for MCQ questions
            correct_answer = None
            if question.type in ('mcq_single', 'mcq_multiple') and question.mcq_options:
                correct_options = [
                    opt['text'] for opt in question.mcq_options
                    if opt.get('is_correct')
                ]
                correct_answer = correct_options[0] if question.type == 'mcq_single' else correct_options

            # Extract student's submitted answer
            student_answer = None
            if qa.answer_data:
                student_answer = qa.answer_data.get('answer', qa.answer_data)

            breakdown.append({
                "question_id": str(question.id),
                "title": question.title,
                "topic": question.topic.name if question.topic else "General",
                "difficulty": question.difficulty,
                "max_marks": question.marks,
                "marks_obtained": qa.marks_obtained or 0,
                "is_correct": qa.is_correct,
                "time_spent_seconds": qa.total_question_time,
                "time_spent_minutes": round(qa.total_question_time / 60, 2) if qa.total_question_time else 0,
                "attempt_count": qa.answer_attempt_count,
                "status": "Correct ✓" if qa.is_correct else "Incorrect ✗",
                "has_violations": qa.has_violations,
                "violation_count": qa.violation_count,
                "correct_answer": correct_answer,
                "student_answer": student_answer,
            })
        
        return breakdown

    def _calculate_topic_performance(
        self, question_activities: List[ContestQuestionActivity]
    ) -> List[Dict[str, Any]]:
        """Aggregate performance by topic."""
        topic_data = {}
        
        for qa in question_activities:
            topic_name = qa.question.topic.name if qa.question.topic else "General"
            
            if topic_name not in topic_data:
                topic_data[topic_name] = {
                    "questions_attempted": 0,
                    "questions_correct": 0,
                    "total_marks": 0,
                    "marks_obtained": 0,
                    "total_time": 0,
                }
            
            topic_data[topic_name]["questions_attempted"] += 1
            if qa.is_correct:
                topic_data[topic_name]["questions_correct"] += 1
            topic_data[topic_name]["total_marks"] += qa.question.marks
            topic_data[topic_name]["marks_obtained"] += qa.marks_obtained or 0
            topic_data[topic_name]["total_time"] += qa.total_question_time or 0

        # Use cached contest-wide topic averages (single shared DB query)
        topic_averages = self._get_contest_topic_averages()

        # Format results
        results = []
        for topic, data in topic_data.items():
            accuracy = (data["questions_correct"] / data["questions_attempted"] * 100) if data["questions_attempted"] > 0 else 0
            score_percentage = (data["marks_obtained"] / data["total_marks"] * 100) if data["total_marks"] > 0 else 0
            avg_time = data["total_time"] / data["questions_attempted"] if data["questions_attempted"] > 0 else 0
            
            # Calculate topic average
            topic_avg_list = topic_averages.get(topic, [])
            topic_avg = sum(topic_avg_list) / len(topic_avg_list) if topic_avg_list else 0
            vs_average = score_percentage - topic_avg

            results.append({
                "topic": topic,
                "questions_attempted": data["questions_attempted"],
                "questions_correct": data["questions_correct"],
                "accuracy": round(accuracy, 2),
                "marks_obtained": data["marks_obtained"],
                "max_marks": data["total_marks"],
                "score_percentage": round(score_percentage, 2),
                "avg_time_seconds": round(avg_time, 2),
                "avg_time_minutes": round(avg_time / 60, 2),
                "contest_avg_percentage": round(topic_avg, 2),
                "vs_average": round(vs_average, 2),
                "performance": "Above Average" if vs_average > 0 else "Below Average" if vs_average < 0 else "Average"
            })

        # Sort by score percentage descending
        results.sort(key=lambda x: x["score_percentage"], reverse=True)
        return results

    def _calculate_difficulty_analysis(
        self, question_activities: List[ContestQuestionActivity]
    ) -> Dict[str, Any]:
        """Analyze performance by difficulty level."""
        difficulty_data = {
            "easy": {"correct": 0, "total": 0, "marks_obtained": 0, "max_marks": 0},
            "medium": {"correct": 0, "total": 0, "marks_obtained": 0, "max_marks": 0},
            "hard": {"correct": 0, "total": 0, "marks_obtained": 0, "max_marks": 0},
        }

        for qa in question_activities:
            difficulty = qa.question.difficulty.lower()
            if difficulty in difficulty_data:
                difficulty_data[difficulty]["total"] += 1
                if qa.is_correct:
                    difficulty_data[difficulty]["correct"] += 1
                difficulty_data[difficulty]["marks_obtained"] += qa.marks_obtained or 0
                difficulty_data[difficulty]["max_marks"] += qa.question.marks

        # Format results
        results = {}
        for difficulty, data in difficulty_data.items():
            percentage = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
            score_percentage = (data["marks_obtained"] / data["max_marks"] * 100) if data["max_marks"] > 0 else 0
            
            results[difficulty] = {
                "correct": data["correct"],
                "total": data["total"],
                "percentage": round(percentage, 2),
                "marks_obtained": data["marks_obtained"],
                "max_marks": data["max_marks"],
                "score_percentage": round(score_percentage, 2),
            }

        return results

    def _calculate_time_analysis(
        self, submission: ContestSubmission, question_activities: List[ContestQuestionActivity]
    ) -> Dict[str, Any]:
        """Analyze time spent on the contest."""
        total_time = sum(qa.total_question_time or 0 for qa in question_activities)
        question_count = len(question_activities)
        avg_time = total_time / question_count if question_count > 0 else 0

        # Fall back to actual submission wall-clock time if no per-question tracking
        if total_time == 0 and submission.submitted_at and submission.started_at:
            total_time = (submission.submitted_at - submission.started_at).total_seconds()

        # Find fastest and slowest questions
        sorted_by_time = sorted(question_activities, key=lambda qa: qa.total_question_time or 0)
        fastest = sorted_by_time[0] if sorted_by_time else None
        slowest = sorted_by_time[-1] if sorted_by_time else None

        # Calculate time efficiency (compared to allocated time)
        allocated_seconds = self.contest.duration * 60
        time_efficiency = (total_time / allocated_seconds * 100) if allocated_seconds > 0 else 0

        return {
            "total_time_seconds": total_time,
            "total_time_minutes": round(total_time / 60, 2),
            "avg_time_per_question_seconds": round(avg_time, 2),
            "avg_time_per_question_minutes": round(avg_time / 60, 2),
            "fastest_question": {
                "title": fastest.question.title if fastest else None,
                "time_seconds": fastest.total_question_time if fastest else None,
                "time_minutes": round(fastest.total_question_time / 60, 2) if fastest and fastest.total_question_time else None,
            } if fastest else None,
            "slowest_question": {
                "title": slowest.question.title if slowest else None,
                "time_seconds": slowest.total_question_time if slowest else None,
                "time_minutes": round(slowest.total_question_time / 60, 2) if slowest and slowest.total_question_time else None,
            } if slowest else None,
            "allocated_time_seconds": allocated_seconds,
            "allocated_time_minutes": self.contest.duration,
            "time_efficiency_percentage": round(time_efficiency, 2),
        }

    def _get_contest_topic_averages(self) -> Dict[str, list]:
        """
        Compute per-topic score percentages for ALL contest activities.
        Cached on the instance so student and college analytics share one DB query.
        """
        if hasattr(self, '_topic_averages_cache'):
            return self._topic_averages_cache

        all_activities = ContestQuestionActivity.objects.filter(
            contest_submission__contest=self.contest,
            is_final_answer=True
        ).select_related('question', 'question__topic')

        topic_averages: Dict[str, list] = {}
        for qa in all_activities:
            topic_name = qa.question.topic.name if qa.question.topic else "General"
            if topic_name not in topic_averages:
                topic_averages[topic_name] = []
            if qa.marks_obtained is not None and qa.question.marks > 0:
                topic_averages[topic_name].append(qa.marks_obtained / qa.question.marks * 100)

        self._topic_averages_cache = topic_averages
        return topic_averages

    def _calculate_behavioral_insights(
        self, submission: ContestSubmission, question_activities: List[ContestQuestionActivity]
    ) -> Dict[str, Any]:
        """Calculate behavioral and proctoring insights."""
        total_violations = sum(qa.violation_count for qa in question_activities)
        questions_with_violations = sum(1 for qa in question_activities if qa.has_violations)

        # Count specific proctoring events
        tab_switches = 0
        focus_loss = 0
        
        for qa in question_activities:
            for activity in qa.navigation_activities:
                if activity.get('activity_type') == 'tab_switched':
                    tab_switches += 1
                elif activity.get('activity_type') in ['window_blur', 'window_lost_focus']:
                    focus_loss += 1

        # Calculate integrity score (100 - penalty for violations)
        integrity_score = max(0, 100 - (total_violations * 5))  # 5 points penalty per violation

        return {
            "total_violations": total_violations,
            "questions_with_violations": questions_with_violations,
            "tab_switches": tab_switches,
            "focus_loss_count": focus_loss,
            "integrity_score": integrity_score,
            "has_suspicious_activity": total_violations > 5,
        }


    def get_college_analytics(self, college_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive analytics for a college's performance in the contest.
        
        Args:
            college_id: UUID of the college
            
        Returns:
            Dictionary containing all college analytics data
        """
        try:
            college = College.objects.get(id=college_id)
        except College.DoesNotExist:
            raise ValueError(f"College with id {college_id} does not exist")

        # Get all submissions from this college
        college_submissions = ContestSubmission.objects.filter(
            contest=self.contest,
            user__profile__college=college
        ).exclude(
            status=ContestSubmission.STATUS_CANCELLED
        ).select_related('user', 'user__profile', 'user__profile__department')

        if not college_submissions.exists():
            raise ValueError("No submissions found for this college in this contest")

        # Calculate college-level metrics
        college_overview = self._calculate_college_overview(college, college_submissions)
        department_breakdown = self._calculate_department_breakdown(college_submissions)
        student_list = self._calculate_college_student_list(college_submissions)
        college_topic_performance = self._calculate_college_topic_performance(college_submissions)
        college_time_metrics = self._calculate_college_time_metrics(college_submissions)
        college_integrity = self._calculate_college_integrity(college_submissions)
        score_distribution = self._calculate_score_distribution(college_submissions)
        did_not_attempt = self._calculate_did_not_attempt(college)

        return {
            "contest_info": {
                "title": self.contest.title,
                "start_time": self.contest.start_datetime,
                "end_time": self.contest.end_datetime,
                "total_marks": self.contest.total_marks,
                "passing_marks": self.contest.passing_marks,
                "duration_minutes": self.contest.duration,
            },
            "college_overview": college_overview,
            "department_breakdown": department_breakdown,
            "student_list": student_list,
            "topic_performance": college_topic_performance,
            "time_metrics": college_time_metrics,
            "integrity_metrics": college_integrity,
            "score_distribution": score_distribution,
            "did_not_attempt": did_not_attempt,
        }

    def _calculate_college_overview(
        self, college: College, college_submissions
    ) -> Dict[str, Any]:
        """Calculate overall college performance metrics."""
        # Get all contest submissions for ranking
        all_submissions = ContestSubmission.objects.filter(
            contest=self.contest
        ).exclude(
            status=ContestSubmission.STATUS_CANCELLED
        )

        # Calculate college statistics
        total_students = college_submissions.count()
        completed_students = college_submissions.filter(
            status__in=[ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED]
        ).count()
        
        college_avg_score = college_submissions.aggregate(avg_marks=Avg('marks'))['avg_marks'] or 0
        college_max_score = college_submissions.aggregate(max_marks=Max('marks'))['max_marks'] or 0
        college_min_score = college_submissions.aggregate(min_marks=Min('marks'))['min_marks'] or 0
        
        completion_rate = (completed_students / total_students * 100) if total_students > 0 else 0

        # Calculate college rank among all colleges — exclude null-college submissions
        college_rankings = all_submissions.exclude(
            user__profile__college__isnull=True
        ).values(
            'user__profile__college__id',
            'user__profile__college__name'
        ).annotate(
            avg_score=Avg('marks'),
            student_count=Count('id')
        ).order_by('-avg_score')

        college_rank = None
        total_colleges = college_rankings.count()
        for idx, ranking in enumerate(college_rankings, 1):
            if str(ranking['user__profile__college__id']) == str(college.id):
                college_rank = idx
                break

        # Get contest average for comparison
        contest_avg = all_submissions.aggregate(avg_marks=Avg('marks'))['avg_marks'] or 0
        vs_contest_avg = college_avg_score - contest_avg

        # Find top performer from college
        top_performer = college_submissions.order_by('-marks', 'submitted_at').first()

        return {
            "college_id": str(college.id),
            "college_name": college.name,
            "total_students": total_students,
            "completed_students": completed_students,
            "completion_rate": round(completion_rate, 2),
            "average_score": round(college_avg_score, 2),
            "max_score": college_max_score,
            "min_score": college_min_score,
            "college_rank": college_rank,
            "total_colleges": total_colleges,
            "contest_average": round(contest_avg, 2),
            "vs_contest_avg": round(vs_contest_avg, 2),
            "performance_status": "Above Average" if vs_contest_avg > 0 else "Below Average" if vs_contest_avg < 0 else "Average",
            "top_performer": {
                "name": top_performer.user.get_full_name() if top_performer else None,
                "score": top_performer.marks if top_performer else None,
                "user_id": str(top_performer.user.id) if top_performer else None,
            } if top_performer else None,
        }

    def _calculate_department_breakdown(self, college_submissions) -> List[Dict[str, Any]]:
        """Calculate performance breakdown by department within the college."""
        department_data = college_submissions.values(
            'user__profile__department__id',
            'user__profile__department__name'
        ).annotate(
            student_count=Count('id'),
            avg_score=Avg('marks'),
            max_score=Max('marks'),
            min_score=Min('marks'),
            completed_count=Count('id', filter=Q(
                status__in=[ContestSubmission.STATUS_SUBMITTED, ContestSubmission.STATUS_COMPLETED]
            ))
        ).order_by('-avg_score')

        passing_marks = self.contest.passing_marks or 0

        results = []
        for dept in department_data:
            if dept['user__profile__department__name']:  # Skip null departments
                completion_rate = (dept['completed_count'] / dept['student_count'] * 100) if dept['student_count'] > 0 else 0

                # Pass rate: students in this dept who scored >= passing_marks
                dept_submissions = college_submissions.filter(
                    user__profile__department__id=dept['user__profile__department__id']
                )
                passed_count = dept_submissions.filter(marks__gte=passing_marks).count() if passing_marks > 0 else 0
                pass_rate = (passed_count / dept['student_count'] * 100) if dept['student_count'] > 0 and passing_marks > 0 else None

                # Avg time for this department
                dept_time_total = 0
                dept_time_count = 0
                for sub in dept_submissions:
                    if sub.submitted_at and sub.started_at:
                        dept_time_total += (sub.submitted_at - sub.started_at).total_seconds()
                        dept_time_count += 1
                dept_avg_time = (dept_time_total / dept_time_count) if dept_time_count > 0 else 0

                results.append({
                    "department_id": dept['user__profile__department__id'],
                    "department_name": dept['user__profile__department__name'],
                    "student_count": dept['student_count'],
                    "completed_count": dept['completed_count'],
                    "completion_rate": round(completion_rate, 2),
                    "average_score": round(dept['avg_score'] or 0, 2),
                    "max_score": dept['max_score'] or 0,
                    "min_score": dept['min_score'] or 0,
                    "passed_count": passed_count,
                    "pass_rate": round(pass_rate, 2) if pass_rate is not None else None,
                    "avg_time_minutes": round(dept_avg_time / 60, 1) if dept_avg_time > 0 else None,
                })

        return results

    def _calculate_college_student_list(self, college_submissions) -> List[Dict[str, Any]]:
        """Generate list of all students from the college with their performance."""
        students = []
        
        # Get all non-cancelled submissions for global rank calculation
        all_submissions = ContestSubmission.objects.filter(
            contest=self.contest
        ).exclude(status=ContestSubmission.STATUS_CANCELLED)

        ordered_submissions = college_submissions.order_by('-marks', 'submitted_at')
        
        for idx, submission in enumerate(ordered_submissions, 1):
            user = submission.user
            profile = user.profile
            student_marks = submission.marks or 0

            # Global rank via DB count (no full table iteration)
            global_rank = all_submissions.filter(
                Q(marks__gt=student_marks) |
                Q(marks=student_marks, submitted_at__lt=submission.submitted_at)
            ).count() + 1

            students.append({
                "rank": idx,  # rank within college
                "global_rank": global_rank,
                "user_id": str(user.id),
                "name": user.get_full_name(),
                "email": user.email,
                "department": profile.department.name if profile.department else "N/A",
                "score": student_marks,
                "percentage": round(student_marks / self.contest.total_marks * 100, 2) if self.contest.total_marks > 0 else 0,
                "status": submission.status,
                "submitted_at": submission.submitted_at,
                "time_taken_minutes": round((submission.submitted_at - submission.started_at).total_seconds() / 60, 2) if submission.submitted_at and submission.started_at else None,
            })

        return students

    def _calculate_college_topic_performance(self, college_submissions) -> List[Dict[str, Any]]:
        """Aggregate topic-wise performance for the college."""
        # Get all question activities for college submissions
        submission_ids = college_submissions.values_list('id', flat=True)
        activities = ContestQuestionActivity.objects.filter(
            contest_submission_id__in=submission_ids,
            is_final_answer=True
        ).select_related('question', 'question__topic')

        topic_data = {}
        
        for qa in activities:
            topic_name = qa.question.topic.name if qa.question.topic else "General"
            
            if topic_name not in topic_data:
                topic_data[topic_name] = {
                    "attempts": 0,
                    "correct": 0,
                    "total_marks": 0,
                    "marks_obtained": 0,
                }
            
            topic_data[topic_name]["attempts"] += 1
            if qa.is_correct:
                topic_data[topic_name]["correct"] += 1
            topic_data[topic_name]["total_marks"] += qa.question.marks
            topic_data[topic_name]["marks_obtained"] += qa.marks_obtained or 0

        # Use cached contest-wide topic averages (single shared DB query)
        topic_averages = self._get_contest_topic_averages()

        # Format results
        results = []
        for topic, data in topic_data.items():
            accuracy = (data["correct"] / data["attempts"] * 100) if data["attempts"] > 0 else 0
            score_percentage = (data["marks_obtained"] / data["total_marks"] * 100) if data["total_marks"] > 0 else 0
            
            topic_avg_list = topic_averages.get(topic, [])
            topic_avg = sum(topic_avg_list) / len(topic_avg_list) if topic_avg_list else 0
            vs_average = score_percentage - topic_avg

            results.append({
                "topic": topic,
                "attempts": data["attempts"],
                "correct": data["correct"],
                "accuracy": round(accuracy, 2),
                "marks_obtained": data["marks_obtained"],
                "max_marks": data["total_marks"],
                "score_percentage": round(score_percentage, 2),
                "contest_avg_percentage": round(topic_avg, 2),
                "vs_average": round(vs_average, 2),
                "performance": "Above Average" if vs_average > 0 else "Below Average" if vs_average < 0 else "Average"
            })

        results.sort(key=lambda x: x["score_percentage"], reverse=True)
        return results

    def _calculate_college_time_metrics(self, college_submissions) -> Dict[str, Any]:
        """Calculate time-related metrics for the college."""
        total_time = 0
        submission_count = 0
        
        for submission in college_submissions:
            if submission.submitted_at and submission.started_at:
                time_taken = (submission.submitted_at - submission.started_at).total_seconds()
                total_time += time_taken
                submission_count += 1

        avg_time = total_time / submission_count if submission_count > 0 else 0
        allocated_time = self.contest.duration * 60

        return {
            "average_time_seconds": round(avg_time, 2),
            "average_time_minutes": round(avg_time / 60, 2),
            "allocated_time_minutes": self.contest.duration,
            "time_efficiency": round((avg_time / allocated_time * 100), 2) if allocated_time > 0 else 0,
        }

    def _calculate_college_integrity(self, college_submissions) -> Dict[str, Any]:
        """Calculate integrity and proctoring metrics for the college."""
        submission_ids = college_submissions.values_list('id', flat=True)
        activities = ContestQuestionActivity.objects.filter(
            contest_submission_id__in=submission_ids,
            is_final_answer=True
        )

        total_violations = sum(qa.violation_count for qa in activities)
        submissions_with_violations = college_submissions.filter(
            id__in=activities.filter(has_violations=True).values_list('contest_submission_id', flat=True).distinct()
        ).count()

        clean_submissions = college_submissions.count() - submissions_with_violations
        clean_percentage = (clean_submissions / college_submissions.count() * 100) if college_submissions.count() > 0 else 0

        # Per-student violation summary for staff follow-up
        flagged_students = []
        for submission in college_submissions:
            sub_violations = activities.filter(contest_submission=submission)
            v_count = sum(qa.violation_count for qa in sub_violations)
            if v_count > 0:
                flagged_students.append({
                    "name": submission.user.get_full_name(),
                    "email": submission.user.email,
                    "violation_count": v_count,
                })
        flagged_students.sort(key=lambda x: x["violation_count"], reverse=True)

        return {
            "total_violations": total_violations,
            "submissions_with_violations": submissions_with_violations,
            "clean_submissions": clean_submissions,
            "clean_percentage": round(clean_percentage, 2),
            "average_violations_per_student": round(total_violations / college_submissions.count(), 2) if college_submissions.count() > 0 else 0,
            "flagged_students": flagged_students,
        }

    def _calculate_score_distribution(self, college_submissions) -> List[Dict[str, Any]]:
        """Bucket scores into ranges for a histogram view."""
        total_marks = self.contest.total_marks
        if total_marks == 0:
            return []

        buckets = [
            {"range": "0–20%", "min_pct": 0, "max_pct": 20, "count": 0},
            {"range": "21–40%", "min_pct": 21, "max_pct": 40, "count": 0},
            {"range": "41–60%", "min_pct": 41, "max_pct": 60, "count": 0},
            {"range": "61–80%", "min_pct": 61, "max_pct": 80, "count": 0},
            {"range": "81–100%", "min_pct": 81, "max_pct": 100, "count": 0},
        ]

        for submission in college_submissions:
            pct = ((submission.marks or 0) / total_marks * 100)
            for bucket in buckets:
                if bucket["min_pct"] <= pct <= bucket["max_pct"]:
                    bucket["count"] += 1
                    break

        return [{"range": b["range"], "count": b["count"]} for b in buckets]

    def _calculate_did_not_attempt(self, college: College) -> List[Dict[str, Any]]:
        """Return students from this college who are enrolled but never started the contest."""
        from authentication.models import Profile

        # Students from this college who have a profile
        college_user_ids = set(
            Profile.objects.filter(college=college).values_list('user_id', flat=True)
        )

        # Students who have any submission (including cancelled) for this contest
        attempted_user_ids = set(
            ContestSubmission.objects.filter(
                contest=self.contest,
                user_id__in=college_user_ids
            ).values_list('user_id', flat=True)
        )

        not_attempted_ids = college_user_ids - attempted_user_ids

        from authentication.models import User as AuthUser
        students = AuthUser.objects.filter(
            id__in=not_attempted_ids,
            role='student'
        ).select_related('profile', 'profile__department')

        return [
            {
                "name": s.get_full_name(),
                "email": s.email,
                "department": s.profile.department.name if hasattr(s, 'profile') and s.profile.department else "N/A",
            }
            for s in students
        ]
