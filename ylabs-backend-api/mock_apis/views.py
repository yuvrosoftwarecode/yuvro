from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter


STATIC_BOOKS_DATABASE = {
    "9780132350884": {
        "isbn": "9780132350884",
        "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
        "author": "Robert C. Martin",
        "publisher": "Prentice Hall",
        "publication_year": 2008,
        "page_count": 464,
        "categories": ["Computers", "Software Engineering"],
        "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        "in_stock": True,
    },
    "9780201616224": {
        "isbn": "9780201616224",
        "title": "The Pragmatic Programmer: From Journeyman to Master",
        "author": "Andrew Hunt, David Thomas",
        "publisher": "Addison-Wesley Professional",
        "publication_year": 1999,
        "page_count": 352,
        "categories": ["Computers", "Programming"],
        "description": "Straight from the programming trenches, The Pragmatic Programmer cuts through the increasing specialization of modern software development.",
        "in_stock": True,
    },
    "9780134494166": {
        "isbn": "9780134494166",
        "title": "Clean Architecture: A Craftsman's Guide to Software Structure and Design",
        "author": "Robert C. Martin",
        "publisher": "Prentice Hall",
        "publication_year": 2017,
        "page_count": 432,
        "categories": ["Computers", "Software Architecture"],
        "description": "Building upon the success of best-sellers Clean Code and The Clean Coder, legendary software craftsman Robert C. Martin reveals universal rules of software architecture.",
        "in_stock": True,
    },
    "9780596007126": {
        "isbn": "9780596007126",
        "title": "Head First Design Patterns",
        "author": "Eric Freeman, Elisabeth Robson, Bert Bates, Kathy Sierra",
        "publisher": "O'Reilly Media",
        "publication_year": 2004,
        "page_count": 694,
        "categories": ["Computers", "Design Patterns"],
        "description": "A brain-friendly guide to design patterns in software development.",
        "in_stock": True,
    },
    "9781449355739": {
        "isbn": "9781449355739",
        "title": "Learning Python: Powerful Object-Oriented Programming",
        "author": "Mark Lutz",
        "publisher": "O'Reilly Media",
        "publication_year": 2013,
        "page_count": 1600,
        "categories": ["Computers", "Python"],
        "description": "Get a comprehensive, in-depth introduction to the core Python language with this hands-on book.",
        "in_stock": True,
    },
}


class MockBookListView(APIView):
    """
    Mock 3rd-party endpoint returning static book catalog data.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="List Mock Book Catalog",
        description="Returns a static list of books from mock 3rd-party service.",
    )
    def get(self, request):
        return Response(
            {
                "service": "Yuvro Mock Book Catalog API",
                "status": "success",
                "total_results": len(STATIC_BOOKS_DATABASE),
                "books": list(STATIC_BOOKS_DATABASE.values()),
            },
            status=status.HTTP_200_OK,
        )


class MockISBNLookupView(APIView):
    """
    Mock 3rd-party endpoint looking up book metadata by ISBN.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Lookup Book Metadata by ISBN",
        description="Looks up static book details for a given ISBN from the mock 3rd-party provider.",
        parameters=[
            OpenApiParameter(
                name="isbn",
                type=str,
                location=OpenApiParameter.PATH,
                description="13-character ISBN string",
            )
        ],
    )
    def get(self, request, isbn):
        book = STATIC_BOOKS_DATABASE.get(isbn)
        if not book:
            return Response(
                {
                    "service": "Yuvro Mock Book Catalog API",
                    "status": "error",
                    "error_code": "BOOK_NOT_FOUND",
                    "message": f"No book found with ISBN: {isbn}",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "service": "Yuvro Mock Book Catalog API",
                "status": "success",
                "data": book,
            },
            status=status.HTTP_200_OK,
        )
