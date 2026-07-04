from django.test import Client
from mockinterviews.views import MockInterviewViewSet

original_get_queryset = MockInterviewViewSet.get_queryset

def patched_get_queryset(self):
    qs = original_get_queryset(self)
    print("In get_queryset. User:", self.request.user)
    print("User is authenticated:", self.request.user.is_authenticated)
    print("User role:", getattr(self.request.user, 'role', None))
    print("Queryset count before return:", qs.count())
    return qs

MockInterviewViewSet.get_queryset = patched_get_queryset

c = Client()
response = c.get('/api/interviews/', HTTP_AUTHORIZATION='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgzMDk3ODgyLCJpYXQiOjE3ODMwOTY5ODIsImp0aSI6IjdhZTdkYjk5NjEyMzQ5NWFhOWE0ZWRhYzI1MzE2MThkIiwidXNlcl9pZCI6IjA5ZDhhMzk5LTU0NDgtNGJhNS04YTNmLTNjYjlkYTU4ZjE3NiIsInVzZXJuYW1lIjoibWFuaWthbnRhIiwiZW1haWwiOiJtYW5pa2FudGFAZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6Ik1hbmlrYW50YSIsImxhc3RfbmFtZSI6IlJlZGR5Iiwicm9sZXMiOnsieWNvZGUiOiJzdHVkZW50IiwieWxhYnMiOiJzdHVkZW50In0sInByb2R1Y3RzIjpbInljb2RlIl19.UGNbzpfu99iMwA53x1LDk8ZI1_Q1aq3zuetlNJbqF5c')
print("Status:", response.status_code)
print("Data:", response.content)
