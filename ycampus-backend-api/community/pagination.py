from rest_framework.pagination import CursorPagination
from rest_framework.response import Response

class StandardPostPagination(CursorPagination):
    page_size = 10
    page_size_query_param = 'limit'
    ordering = '-created_at'
    cursor_query_param = 'cursor'

    def get_paginated_response(self, data):
        return Response({
            'nextCursor': self.get_next_link(),
            'previousCursor': self.get_previous_link(),
            'posts': data
        })
