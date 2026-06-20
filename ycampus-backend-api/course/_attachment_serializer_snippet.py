
from .models import Attachment
from core.serializers import DepartmentBasicSerializer

class AttachmentSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.subject_name", read_only=True)
    department_details = DepartmentBasicSerializer(source="departments", many=True, read_only=True)
    section_details = SectionBasicSerializer(source="sections", many=True, read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = Attachment
        fields = [
            "id",
            "file_name",
            "file",
            "file_type",
            "file_size",
            "batch",
            "batch_name",
            "departments",
            "department_details",
            "subject",
            "subject_name",
            "sections",
            "section_details",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
            "updated_at"
        ]
        read_only_fields = ["id", "uploaded_by", "created_at", "updated_at"]
