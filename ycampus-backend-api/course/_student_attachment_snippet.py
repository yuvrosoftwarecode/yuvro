
class StudentAttachmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Students to view Faculty Attachments (Faculty Reports).
    """
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["file_name", "subject__subject_name"]
    filterset_fields = ["batch", "subject"]

    def get_queryset(self):
        user = self.request.user
        qs = Attachment.objects.select_related(
            "batch", "subject", "uploaded_by"
        ).prefetch_related("departments", "sections")

        if hasattr(user, "student_profile"):
            student = user.student_profile
            # Provide access to attachments for the student's batch and section
            # Adjust according to how attachments are mapped to students
            qs = qs.filter(
                Q(batch=student.batch) |
                Q(sections=student.section)
            ).distinct()
        else:
            qs = Attachment.objects.none()

        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject_id=subject)

        return qs

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        attachment = self.get_object()
        try:
            file_handle = attachment.file.open()
            mime_type = attachment.file_type or "application/octet-stream"
            response = FileResponse(file_handle, content_type=mime_type)
            response["Content-Disposition"] = (
                f'attachment; filename="{attachment.file_name}"'
            )
            return response
        except Exception:
            return Response(
                {"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND
            )
