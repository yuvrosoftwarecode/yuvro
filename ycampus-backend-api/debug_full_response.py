import json
from core.models import StudentProfile, AttendanceRecord
from course.models import SemesterSubject, SectionSubjectFaculty, Subject, SubUnit, UserSubjectProgress
from django.db.models import Sum

u_id = 'f53a3ff7-5cab-4834-9f1a-17fcb405d342'
prof = StudentProfile.objects.get(user_id=u_id)
user_to_query = prof.user

def get_stats(user_to_query):
    student_profile = StudentProfile.objects.filter(user=user_to_query).first()
    relevant_subject_ids = set()
    if student_profile:
        if student_profile.semester:
            relevant_subject_ids.update(SemesterSubject.objects.filter(semester=student_profile.semester).values_list('subject_id', flat=True))
        if student_profile.section:
            relevant_subject_ids.update(SectionSubjectFaculty.objects.filter(section=student_profile.section).values_list('semester_subject__subject_id', flat=True))
    
    attendance_qs = AttendanceRecord.objects.filter(student__user=user_to_query)
    if relevant_subject_ids:
        attendance_qs = attendance_qs.filter(session__section_subject_faculty__semester_subject__subject_id__in=relevant_subject_ids)
    
    total_sessions = attendance_qs.count()
    overall_attendance = 0
    active_days = 0
    if total_sessions > 0:
        present_records = attendance_qs.filter(is_present=True)
        overall_attendance = round((present_records.count() / total_sessions) * 100)
        active_days = present_records.values('session__date').distinct().count()
    
    return {
        'overall_attendance': overall_attendance,
        'active_days': active_days,
        'avg_progress': 0 # We know this is 0
    }

def get_progress(user_to_query):
    subject_ids = set()
    student_profile = StudentProfile.objects.filter(user=user_to_query).first()
    if student_profile:
        if student_profile.semester:
            for ss in SemesterSubject.objects.filter(semester=student_profile.semester):
                subject_ids.add(ss.subject_id)
    
    results = []
    for sid in subject_ids:
        subject = Subject.objects.get(id=sid)
        subject_sessions = AttendanceRecord.objects.filter(
            student__user=user_to_query,
            session__section_subject_faculty__semester_subject__subject_id=sid
        ).count()
        attendance_pct = 0
        if subject_sessions > 0:
            present_count = AttendanceRecord.objects.filter(
                student__user=user_to_query,
                is_present=True,
                session__section_subject_faculty__semester_subject__subject_id=sid
            ).count()
            attendance_pct = round((present_count / subject_sessions) * 100)
        
        results.append({
            'subject_id': str(sid),
            'subject_name': subject.subject_name,
            'attendance_pct': attendance_pct,
            'tasks_total': SubUnit.objects.filter(unit__subject_id=sid).count()
        })
    return results

print('--- STATS ---')
print(json.dumps(get_stats(user_to_query)))
print('--- PROGRESS ---')
print(json.dumps(get_progress(user_to_query)))
