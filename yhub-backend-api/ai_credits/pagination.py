from rest_framework.pagination import PageNumberPagination


class CreditHistoryPagination(PageNumberPagination):
    """
    Standard pagination for credit ledger and usage audit streams.
    Prevents unbounded queries while allowing flexible client page size requests.
    """
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
