from django.urls import path
from .views import MockBookListView, MockISBNLookupView

urlpatterns = [
    path("books/", MockBookListView.as_view(), name="mock-books-list"),
    path("books/<str:isbn>/", MockISBNLookupView.as_view(), name="mock-isbn-lookup"),
]
