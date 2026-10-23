import os, sys, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ylabs-backend-api.settings")
django.setup()

from django.contrib.admin.sites import site
from skill_evaluation.models import Evaluation

class DummyRequest:
    class user:
        is_active = True
        is_staff = True
        is_superuser = True
    GET = {}
    POST = {}
    META = {}
    method = 'GET'
    resolver_match = None
    
request = DummyRequest()
admin_instance = site._registry[Evaluation]
cl = admin_instance.get_changelist_instance(request)
qs = cl.get_queryset(request)
print("Count:", qs.count())
print("Result count:", cl.result_count)
print("Result list len:", len(cl.result_list))
print("Paginator count:", cl.paginator.count)
print("List per page:", admin_instance.list_per_page)
print("Result list items:", [str(x) for x in cl.result_list])

