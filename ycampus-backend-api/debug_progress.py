from core.models import StudentProfile, AttendanceRecord
from course.models import SemesterSubject, SectionSubjectFaculty, Subject, SubUnit, UserSubjectProgress
from django.db.models import Sum
from django.db.models.functions import Coalesce

u_id = 'f53a3ff7-5cab-4834-9f1a-17fcb405d342'
prof = StudentProfile.objects.get(user_id=u_id)
user_to_query = prof.user

print(f'Student: {prof.user.first_name} {prof.user.last_name}')
print(f'Semester: {prof.semester}')
print(f'Section: {prof.section}')

subject_ids = set()
if prof.semester:
    semester_subs = SemesterSubject.objects.filter(semester=prof.semester)
    for ss in semester_subs:
        subject_ids.add(ss.subject_id)
        print(f'Found sub from semester: {ss.subject.subject_name}')

if prof.section:
    section_subs = SectionSubjectFaculty.objects.filter(section=prof.section)
    for ssf in section_subs:
        subject_ids.add(ssf.semester_subject.subject_id)
        print(f'Found sub from section: {ssf.semester_subject.subject.subject_name}')

progress_records = UserSubjectProgress.objects.filter(user=user_to_query).select_related('subject')
for p in progress_records:
    subject_ids.add(p.subject_id)
    print(f'Found sub from progress: {p.subject.subject_name}')

print(f'Final subject_ids: {subject_ids}')

results = []
subjects_map = {s.id: s for s in Subject.objects.filter(id__in=subject_ids)}

for sid in subject_ids:
    subject = subjects_map.get(sid)
    if not subject:
        print(f'Subject {sid} not found in subjects_map')
        continue
    
    total_subs = SubUnit.objects.filter(unit__subject_id=sid).count()
    print(f'Subject: {subject.subject_name}, Total SubUnits: {total_subs}')
    results.append({'subj': subject.subject_name, 'total_subs': total_subs})

print(f'Results: {results}')
