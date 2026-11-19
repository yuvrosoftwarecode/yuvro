from rest_framework import serializers


class SuggestTaskSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    existing_tasks = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class StandardizeTaskSerializer(serializers.Serializer):
    raw_task = serializers.DictField(required=True)
    lab_context = serializers.DictField(required=False, default=dict)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class BulkTasksSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    count = serializers.IntegerField(required=False, default=3, min_value=2, max_value=4)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class EstimateDurationSerializer(serializers.Serializer):
    task = serializers.DictField(required=True)
    lab_context = serializers.DictField(required=False, default=dict)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class GenerateScoringRulesSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    tasks = serializers.ListField(child=serializers.DictField(), required=True)
    repo_files = serializers.DictField(required=False, default=dict)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class PushScoringRulesSerializer(serializers.Serializer):
    repo_identifier = serializers.CharField(required=True)
    files = serializers.DictField(required=True)
    branch = serializers.CharField(required=False, default="main")
    installation_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    commit_message = serializers.CharField(required=False, default="feat(eval): add yuvro scoring rules for automated grading")


class GenerateLifecycleCommandsSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    tasks = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class InspectRepoSerializer(serializers.Serializer):
    repo_identifier = serializers.CharField(required=True)
    branch = serializers.CharField(required=False, default="main", allow_blank=True)
    installation_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    include_clone_token = serializers.BooleanField(required=False, default=False)


class TaskChatSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    current_tasks = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    messages = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    user_message = serializers.CharField(required=True)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class GeneratePassSolutionSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    tasks = serializers.ListField(child=serializers.DictField(), required=True)
    scoring_files = serializers.DictField(required=True)
    repo_files = serializers.DictField(required=False, default=dict)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class RepairScoringRulesSerializer(serializers.Serializer):
    lab_context = serializers.DictField(required=True)
    tasks = serializers.ListField(child=serializers.DictField(), required=True)
    scoring_files = serializers.DictField(required=True)
    repo_files = serializers.DictField(required=False, default=dict)
    fail_case_output = serializers.DictField(required=False, allow_null=True)
    pass_case_output = serializers.DictField(required=False, allow_null=True)
    feedback = serializers.CharField(required=False, default="", allow_blank=True)
    provider = serializers.CharField(required=False, default="deepseek")
    model_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)

