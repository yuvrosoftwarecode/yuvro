from core.models import StudentProfile, AttendanceRecord
from course.models import SemesterSubject, SectionSubjectFaculty, Subject, SubUnit, UserSubjectProgress
from django.db.models import Sum
from django.db.models.functions import Coalesce

u_id = 'f53a3ff7-5cab-4834-9f1a-17fcb405d342'
prof = StudentProfile.objects.get(user_id=u_id)
user_to_query = prof.user

print(f'Student: {prof.user.first_name} {prof.user.last_name}')

subject_ids = set()
if prof.semester:
    semester_subs = SemesterSubject.objects.filter(semester=prof.semester)
    for ss in semester_subs: subject_ids.add(ss.subject_id)

progress_records = UserSubjectProgress.objects.filter(user=user_to_query).select_related('subject')
for p in progress_records: subject_ids.add(p.subject_id)

results = []
for sid in subject_ids:
    subject = Subject.objects.get(id=sid)
    sub_progress = progress_records.filter(subject_id=sid)
    total_subs = SubUnit.objects.filter(unit__subject_id=sid).count()
    
    attendance_pct = 0
    subject_sessions = AttendanceRecord.objects.filter(
        student__user=user_to_query,
        session__section_subject_faculty__semester_subject__subject_id=sid
    ).count()
    if subject_sessions > 0:
        present_count = AttendanceRecord.objects.filter(
            student__user=user_to_query,
            is_present=True,
            session__section_subject_faculty__semester_subject__subject_id=sid
        ).count()
        attendance_pct = round((present_count / subject_sessions) * 100)

    print(f'Subj: {subject.subject_name}, Sessions: {subject_sessions}, Attend%: {attendance_pct}')
