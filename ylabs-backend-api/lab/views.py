import json
import re
import shutil
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.permissions import IsAdminUser
from .models import (
    Lab, LabStatus, LabSprint, LabSprintTicket,
    UserLabEnrollment, UserLabSprintTicketSubmission,
    TicketProgressStatus, UserLabActivity, SystemDesign, LabType,
    LearnRecurringTask, LearnRecurringTaskEnrollment,
    WeeklyTask, WeeklyTaskEnrollment
)
from .serializers import (
    LabSerializer,
    LabSprintSerializer,
    LabSprintTicketSerializer,
    UserLabEnrollmentSerializer,
    UserLabSprintTicketSubmissionSerializer,
    SystemDesignSerializer,
    LearnRecurringTaskSerializer,
    LearnRecurringTaskEnrollmentSerializer,
    WeeklyTaskSerializer,
    WeeklyTaskEnrollmentSerializer,
)
from .system_design_utils import (
    normalize_system_design,
    evaluate_system_design,
    evaluate_system_design_with_ai,
)
from rest_framework.decorators import api_view, permission_classes, action
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
import threading
import logging
from .github_client import GithubClient
from .workspace_manager import provision_user_lab_repo, get_repo_name_from_url, provision_lab_starter_repo, run_git_with_token

logger = logging.getLogger(__name__)
import os
import subprocess
from django.conf import settings
from rest_framework.exceptions import ValidationError
from .services import evaluate_and_score_submission
import threading
from .frontend_validator import validate_frontend_ticket
import requests as http_requests

class FrontendValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ticket_slug = request.data.get("ticket_slug")
        user_html   = request.data.get("user_html", "")
        user_css    = request.data.get("user_css", "")
        user_js     = request.data.get("user_js", "")
        # Falls back to the legacy "frontend-portfolio" folder if not provided.
        lab_id      = request.data.get("lab_id", "")

        if not ticket_slug:
            return Response({"error": "ticket_slug is required"}, status=status.HTTP_400_BAD_REQUEST)

        executor_url = os.environ.get("CODE_EXECUTOR_URL", "http://yuvro-yuvro-code-executor-1:8009")
        try:
            resp = http_requests.post(
                f"{executor_url}/workspace/ui-validate",
                json={
                    "ticket_slug": ticket_slug,
                    "user_html":   user_html,
                    "user_css":    user_css,
                    "user_js":     user_js,
                    "lab_name":    "frontend-portfolio",  # legacy fallback
                    "lab_id":      lab_id,                # new canonical lookup
                },
                timeout=60, 
            )
            if resp.status_code == 404:
                return Response(
                    {"error": f"Base files not found for ticket '{ticket_slug}'. "
                              "Ensure the starter repo has been cloned and contains tickets/<ticket_slug>/index.html."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if not resp.ok:
                return Response(
                    {"error": f"Executor error: {resp.text[:500]}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            return Response(resp.json())
        except Exception as e:
            return Response({"error": f"Could not reach executor: {e}"}, status=status.HTTP_502_BAD_GATEWAY)



class LabViewSet(viewsets.ModelViewSet):
    queryset = Lab.objects.all()
    serializer_class = LabSerializer
    
    def get_queryset(self):
        from django.db.models import Count
        queryset = Lab.objects.annotate(total_tickets=Count('sprints__tasks'))
        user = self.request.user
        is_admin = bool(
            user.is_authenticated and (
                user.is_staff or 
                user.is_superuser or 
                getattr(user, 'role', '') == 'admin'
            )
        )
        if not is_admin:
            queryset = queryset.filter(status__in=[LabStatus.ACTIVE, LabStatus.UPCOMING])
        else:
            status_param = self.request.query_params.get('status')
            if status_param:
                queryset = queryset.filter(status=status_param)
        return queryset

    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        lab = serializer.save(created_by=self.request.user)
        if lab.git_repo_starter_url:
            threading.Thread(target=provision_lab_starter_repo, args=(lab.id, lab.git_repo_starter_url)).start()

    def perform_update(self, serializer):
        lab = serializer.save()
        if lab.git_repo_starter_url:
            threading.Thread(target=provision_lab_starter_repo, args=(lab.id, lab.git_repo_starter_url)).start()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_payment(self, request, pk=None):
        lab = self.get_object()
        enrollment, created = UserLabEnrollment.objects.get_or_create(
            user=request.user,
            lab=lab
        )
        enrollment.is_unlocked = True
        enrollment.save(update_fields=['is_unlocked'])
        return Response({"status": "success", "message": "Lab unlocked successfully."})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_unlocks(self, request):
        enrollments = UserLabEnrollment.objects.filter(user=request.user, is_unlocked=True)
        unlocked_lab_ids = list(enrollments.values_list('lab_id', flat=True))
        return Response({"unlocked_lab_ids": [str(lid) for lid in unlocked_lab_ids]})

class LabSprintViewSet(viewsets.ModelViewSet):
    queryset = LabSprint.objects.all()
    serializer_class = LabSprintSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        lab_id = self.request.query_params.get('lab')
        if lab_id:
            queryset = queryset.filter(lab_id=lab_id)
        return queryset
    
    def get_queryset(self):
        queryset = LabSprint.objects.all()
        lab = self.request.query_params.get('lab')
        if lab is not None:
            queryset = queryset.filter(lab=lab)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

def commit_ticket_to_github(user, lab=None, ticket=None, files=None, design=None, commit_message=None, sprint_no=None, ticket_no=None):
    # 1. Resolve Lab
    if not lab and ticket and ticket.sprint:
        lab = ticket.sprint.lab
    if not lab and ticket:
        lab = getattr(ticket, 'lab', None)
    if not lab:
        lab = Lab.objects.filter(type=LabType.SYSTEM_DESIGN).first() or Lab.objects.filter(title__icontains="System Design").first()
    if not lab:
        raise ValidationError("Lab not found for this ticket.")

    # 2. Authenticate GitHub client
    client = GithubClient(user.id)
    if not client._fetch_token():
        raise ValidationError("GitHub account not connected. Please connect your GitHub account.")

    # 3. Resolve or create enrollment
    enrollment = UserLabEnrollment.objects.filter(user=user, lab=lab).first()
    if not enrollment:
        clean_title = re.sub(r'[^a-zA-Z0-9_-]', '_', lab.title.lower()).strip('_')
        repo_name = f"yuvro_{clean_title}"
        try:
            repo_data = client.create_repository(repo_name, private=True)
            enrollment = UserLabEnrollment.objects.create(
                user=user,
                lab=lab,
                github_repo_name=repo_data['name'],
                github_repo_url=repo_data['url'],
                default_branch=repo_data.get('default_branch') or 'main'
            )
        except Exception as e:
            raise ValidationError(f"Failed to create GitHub repository: {str(e)}")

    # 4. Resolve workspace directory
    workspace_dir = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab.id), "users", str(user.id))
    os.makedirs(workspace_dir, exist_ok=True)

    # 5. File generation
    is_system_design = (lab.type == LabType.SYSTEM_DESIGN) or (ticket and getattr(ticket, 'ticket_type', None) == 'system_design') or bool(design)

    if is_system_design:
        clean_design = normalize_system_design(design or {})
        title = ticket.title if ticket else lab.title
        hld_notes = clean_design.get("notes", {}).get("hld", "")
        seq_code = clean_design.get("seq", "")
        seq_notes = clean_design.get("notes", {}).get("sequence", "")
        schema_code = clean_design.get("schema", "")
        schema_notes = clean_design.get("notes", {}).get("schema", "")
        apis = clean_design.get("apis", [])
        api_notes = clean_design.get("notes", {}).get("api", "")

        api_table_lines = ["| Method | Path | Summary | Response Status |", "| --- | --- | --- | --- |"]
        if apis:
            for a in apis:
                m = a.get("method", "GET")
                p = a.get("path", "/")
                s = (a.get("summary") or "-").replace("|", "\\|")
                st = (a.get("status") or "200 OK").replace("|", "\\|")
                api_table_lines.append(f"| `{m}` | `{p}` | {s} | `{st}` |")
        else:
            api_table_lines.append("| - | - | *No endpoints defined* | - |")
        api_table_md = "\n".join(api_table_lines)

        readme_content = f"""# {title}

Welcome to the **{title}** specification document.

## 🏛️ High-Level Architecture (HLD)
- **Components:** {len(clean_design.get('nodes', []))} services / datastores
- **Connections:** {len(clean_design.get('edges', []))} network flows

{hld_notes}

## 🔄 Interaction Flows (Mermaid Sequence)
```mermaid
{seq_code or '// No sequence diagram defined'}
```
{seq_notes}

## 🗄️ Database Modeling (DBML)
```dbml
{schema_code or '// No database schema defined'}
```
{schema_notes}

## 🌐 REST API Endpoints
{api_table_md}

{api_notes}

---
*Created and exported from Yuvro System Design Studio*
"""

        files_to_write = {
            "architecture.json": json.dumps({"title": title, "nodes": clean_design.get("nodes", []), "edges": clean_design.get("edges", []), "notes": hld_notes}, indent=2),
            "sequence.mmd": seq_code or "// No sequence diagram defined",
            "schema.dbml": schema_code or "// No DBML schema defined",
            "endpoints.json": json.dumps({"endpoints": apis, "notes": api_notes}, indent=2),
            "system-design.json": json.dumps(clean_design, indent=2),
            "README.md": readme_content,
        }

        # Write root files
        for filename, content in files_to_write.items():
            with open(os.path.join(workspace_dir, filename), "w", encoding="utf-8") as f:
                f.write(content)

        # Write ticket-specific snapshot under designs/<ticket_slug>/
        ticket_slug = getattr(ticket, "ticket_slug", None) or (str(ticket.id) if ticket else "sd-overview")
        ticket_dir = os.path.join(workspace_dir, "designs", ticket_slug)
        os.makedirs(ticket_dir, exist_ok=True)
        for filename, content in files_to_write.items():
            with open(os.path.join(ticket_dir, filename), "w", encoding="utf-8") as f:
                f.write(content)

        # Sync SystemDesign model
        SystemDesign.objects.update_or_create(
            user=user,
            ticket=ticket,
            defaults={
                "title": f"{title} - {user.email}",
                "lab": lab,
                "design": clean_design,
            }
        )
    else:
        # Code / Algo / DSA Ticket Commit
        # 1. Parse sprint/ticket number from commit_message if present: feat(S1-T1)
        parsed_sprint = None
        parsed_ticket = None
        if commit_message:
            match = re.search(r'feat\(S(\d+)-T(\d+)\)', commit_message, re.IGNORECASE)
            if match:
                try:
                    parsed_sprint = int(match.group(1))
                    parsed_ticket = int(match.group(2))
                except (ValueError, TypeError):
                    pass

        # 2. Resolve sprint_no (prefer explicit param or parsed commit message, then order_index)
        resolved_sprint = sprint_no or parsed_sprint
        if not resolved_sprint and ticket and ticket.sprint:
            order_idx = getattr(ticket.sprint, 'order_index', None)
            resolved_sprint = order_idx if (order_idx is not None and order_idx > 0) else 1
        if not resolved_sprint:
            resolved_sprint = 1

        # 3. Resolve ticket_no
        resolved_ticket = ticket_no or parsed_ticket
        if not resolved_ticket and ticket and hasattr(ticket, 'order_index') and ticket.order_index is not None:
            order_idx = ticket.order_index
            resolved_ticket = order_idx if (order_idx is not None and order_idx > 0) else 1
        if not resolved_ticket:
            resolved_ticket = 1

        ticket_slug = getattr(ticket, "ticket_slug", None) or (f"ticket_{resolved_ticket}" if ticket else "solution")
        
        ticket_dir_rel = os.path.join(f"sprint_{resolved_sprint}", f"ticket_{resolved_ticket}_{ticket_slug}")
        ticket_dir = os.path.join(workspace_dir, ticket_dir_rel)
        os.makedirs(ticket_dir, exist_ok=True)

        wrote_files = False
        if files and isinstance(files, dict):
            for fname, content in files.items():
                if not fname or not isinstance(content, str):
                    continue
                lower_name = fname.lower()
                if any(x in lower_name for x in ["yuvro_scoring_rules", "scoring_rules", ".git", "__pycache__"]):
                    continue
                # Write to ticket dir
                t_path = os.path.join(ticket_dir, fname)
                os.makedirs(os.path.dirname(t_path), exist_ok=True)
                with open(t_path, "w", encoding="utf-8") as f:
                    f.write(content)
                # Write to root workspace dir
                r_path = os.path.join(workspace_dir, fname)
                os.makedirs(os.path.dirname(r_path), exist_ok=True)
                with open(r_path, "w", encoding="utf-8") as f:
                    f.write(content)
                wrote_files = True

        if not wrote_files and ticket:
            # Fallback: check if workspace on disk exists at /workspaces/labs/{slug}_{ticket.id}/users/{user.id}
            candidate_ws_dirs = [
                os.path.join(settings.WORKSPACES_ROOT, "labs", f"{lab.slug}_{ticket.id}", "users", str(user.id)) if hasattr(lab, 'slug') else None,
                os.path.join(settings.WORKSPACES_ROOT, "labs", f"{lab.id}_{ticket.id}", "users", str(user.id)),
            ]
            for candidate in candidate_ws_dirs:
                if candidate and os.path.exists(candidate):
                    shutil.copytree(candidate, ticket_dir, ignore=shutil.ignore_patterns('.git', 'yuvro_scoring_rules', '__pycache__'), dirs_exist_ok=True)
                    shutil.copytree(candidate, workspace_dir, ignore=shutil.ignore_patterns('.git', 'yuvro_scoring_rules', '__pycache__'), dirs_exist_ok=True)
                    wrote_files = True
                    break

        # Write ticket README.md
        ticket_readme = os.path.join(ticket_dir, "README.md")
        if not os.path.exists(ticket_readme):
            with open(ticket_readme, "w", encoding="utf-8") as f:
                f.write(f"# {ticket.title if ticket else 'Problem'}\n\n{(ticket.description if ticket else '')}\n")

        # Write root README.md if not present
        root_readme = os.path.join(workspace_dir, "README.md")
        if not os.path.exists(root_readme):
            with open(root_readme, "w", encoding="utf-8") as f:
                f.write(f"# {lab.title}\n\n{(lab.description or '')}\n")

        # Sync submission solution code
        if ticket:
            try:
                submission, _ = UserLabSprintTicketSubmission.objects.get_or_create(
                    user=user,
                    lab_sprint_ticket=ticket,
                    defaults={"ticket_status": TicketProgressStatus.IN_PROGRESS}
                )
                if files and isinstance(files, dict):
                    primary_code = files.get("main.py") or files.get("solution.py") or files.get("Solution.java") or next(iter(files.values()), "")
                    if primary_code:
                        submission.solution = primary_code
                        submission.save(update_fields=["solution"])
            except Exception as e:
                logger.warning(f"Failed to sync submission code during git commit: {e}")

    # Write a top-level .gitignore if not present
    gitignore_path = os.path.join(workspace_dir, ".gitignore")
    if not os.path.exists(gitignore_path):
        with open(gitignore_path, "w", encoding="utf-8") as f:
            f.write(".DS_Store\n*.tmp\nnode_modules/\n__pycache__/\n*.pyc\n")

    # 6. Git commands
    git_name = client.github_username or user.username or "Student"
    git_email = f"{client.github_username}@users.noreply.github.com" if client.github_username else (user.email or "student@yuvro.ai")

    subprocess.run(["git", "init"], cwd=workspace_dir, check=True, capture_output=True)
    subprocess.run(["git", "-c", "safe.directory=*", "config", "user.name", git_name], cwd=workspace_dir, check=True)
    subprocess.run(["git", "-c", "safe.directory=*", "config", "user.email", git_email], cwd=workspace_dir, check=True)

    auth_repo_url = enrollment.github_repo_url
    if client.access_token and "github.com" in auth_repo_url and "@" not in auth_repo_url:
        auth_repo_url = auth_repo_url.replace("https://github.com/", f"https://{client.access_token}@github.com/")

    proc = subprocess.run(["git", "remote", "get-url", "origin"], cwd=workspace_dir, capture_output=True, text=True)
    if proc.returncode == 0:
        subprocess.run(["git", "-c", "safe.directory=*", "remote", "set-url", "origin", auth_repo_url], cwd=workspace_dir, check=True)
    else:
        subprocess.run(["git", "-c", "safe.directory=*", "remote", "add", "origin", auth_repo_url], cwd=workspace_dir, check=True)

    subprocess.run(["git", "-c", "safe.directory=*", "branch", "-M", "main"], cwd=workspace_dir, check=True)

    # Try pull with rebase if remote branch exists to keep history clean
    try:
        run_git_with_token(["git", "-c", "safe.directory=*", "pull", "--rebase", "origin", "main"], client.access_token, cwd=workspace_dir)
    except Exception:
        pass

    subprocess.run(["git", "-c", "safe.directory=*", "add", "-A"], cwd=workspace_dir, check=True)

    if not commit_message:
        if ticket:
            sprint_no = (ticket.sprint.order_index + 1) if ticket.sprint else 1
            ticket_no = (ticket.order_index + 1) if ticket.order_index is not None else 1
            commit_message = f"feat(S{sprint_no}-T{ticket_no}) : Solution for {ticket.title}"
        else:
            commit_message = f"feat(Lab) : Update code for {lab.title}"

    subprocess.run(
        ["git", "-c", "safe.directory=*", "commit", "--allow-empty", "-m", commit_message, f"--author={git_name} <{git_email}>"],
        cwd=workspace_dir,
        check=True,
        capture_output=True
    )

    run_git_with_token(["git", "-c", "safe.directory=*", "push", "-u", "origin", "main"], client.access_token, cwd=workspace_dir)

    return {
        "status": "success",
        "message": "Changes committed and pushed to GitHub successfully",
        "github_repo_url": enrollment.github_repo_url,
        "github_repo_name": enrollment.github_repo_name,
        "commit_message": commit_message,
    }


def commit_system_design_to_github(user, lab=None, ticket=None, design=None, commit_message=None):
    return commit_ticket_to_github(user=user, lab=lab, ticket=ticket, design=design, commit_message=commit_message)


class LabSprintTicketViewSet(viewsets.ModelViewSet):
    queryset = LabSprintTicket.objects.all()
    serializer_class = LabSprintTicketSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        sprint_id = self.request.query_params.get('sprint')
        if sprint_id:
            queryset = queryset.filter(sprint_id=sprint_id)
        lab_id = self.request.query_params.get('lab')
        if lab_id:
            queryset = queryset.filter(sprint__lab_id=lab_id)
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='my-stats')
    def my_stats(self, request):
        user = request.user
        
        # We need stats per lab: total tickets and resolved tickets for this user
        from django.db.models import Count, Q
        from .models import Lab, UserLabSprintTicketSubmission
        
        stats = {}
        labs = Lab.objects.all()
        
        for lab in labs:
            total = LabSprintTicket.objects.filter(sprint__lab=lab).count()
            resolved = UserLabSprintTicketSubmission.objects.filter(
                user=user, 
                lab_sprint_ticket__sprint__lab=lab, 
                ticket_status__in=['in_review', 'done']
            ).count()
            stats[str(lab.id)] = {'total_tickets': total, 'resolved_tickets': resolved}
            
        return Response(stats)

    @action(detail=True, methods=['get', 'post'], url_path='system-design')
    def system_design(self, request, pk=None):
        ticket = self.get_object()
        user = request.user

        submission = UserLabSprintTicketSubmission.objects.filter(
            user=user,
            lab_sprint_ticket=ticket,
        ).first()

        if request.method == 'GET':
            template_design = ticket.system_design if ticket.system_design else normalize_system_design({})
            user_design = submission.system_design if (submission and submission.system_design) else None
            return Response({
                "ticket_id": str(ticket.id),
                "ticket_title": ticket.title,
                "template_design": template_design,
                "user_design": user_design,
                "status": submission.ticket_status if submission else TicketProgressStatus.BACKLOG,
                "solution_revealed": submission.solution_revealed if submission else False,
                "yuvro_points": submission.yuvro_points if submission else 0,
                "solution_output": submission.solution_output if submission else "",
            })

        # POST: save, evaluate, or submit design
        raw_design = request.data.get("design") if "design" in request.data else request.data
        clean_design = normalize_system_design(raw_design)

        # Check for Run / Evaluate action
        is_evaluate = (
            request.data.get("action") == "evaluate"
            or request.data.get("run") is True
        )
        if is_evaluate:
            eval_result = evaluate_system_design_with_ai(ticket, clean_design, user=user)
            eval_output_str = json.dumps(eval_result)
            if not submission:
                submission = UserLabSprintTicketSubmission.objects.create(
                    user=user,
                    lab_sprint_ticket=ticket,
                    ticket_status=TicketProgressStatus.IN_PROGRESS,
                    system_design=clean_design,
                    solution=json.dumps(clean_design),
                    solution_output=eval_output_str,
                    yuvro_points=0,
                )
            else:
                submission.system_design = clean_design
                submission.solution = json.dumps(clean_design)
                submission.solution_output = eval_output_str
                if submission.ticket_status == TicketProgressStatus.BACKLOG:
                    submission.ticket_status = TicketProgressStatus.IN_PROGRESS
                submission.save()

            return Response({
                "status": "success",
                "evaluation": eval_result,
                "ticket_status": submission.ticket_status,
                "solution_output": submission.solution_output,
            })

        is_submit = (
            request.data.get("is_submitted") is True
            or request.data.get("submit") is True
            or request.data.get("status") in ["done", "in_review"]
        )

        # Handle solution_output
        solution_output_raw = request.data.get("solution_output")
        if solution_output_raw:
            submission_output_str = json.dumps(solution_output_raw) if isinstance(solution_output_raw, dict) else str(solution_output_raw)
            try:
                parsed_eval = solution_output_raw if isinstance(solution_output_raw, dict) else json.loads(submission_output_str)
                eval_percentage = parsed_eval.get("percentage", parsed_eval.get("total_score", 0))
            except Exception:
                eval_percentage = 0
        else:
            eval_result = evaluate_system_design_with_ai(ticket, clean_design, user=user)
            submission_output_str = json.dumps(eval_result)
            eval_percentage = eval_result.get("percentage", eval_result.get("overall_score", 0))

        client_status = request.data.get("status")
        is_passed = (
            client_status == "done"
            or (float(eval_percentage) >= 70.0)
        ) if is_submit else False
        new_status = TicketProgressStatus.DONE if is_passed else TicketProgressStatus.IN_PROGRESS

        if not submission:
            submission = UserLabSprintTicketSubmission.objects.create(
                user=user,
                lab_sprint_ticket=ticket,
                ticket_status=new_status,
                system_design=clean_design,
                solution=json.dumps(clean_design),
                solution_output=submission_output_str,
                yuvro_points=0,
            )
        else:
            submission.system_design = clean_design
            submission.solution = json.dumps(clean_design)
            submission.solution_output = submission_output_str
            if is_submit:
                submission.ticket_status = new_status
            elif submission.ticket_status == TicketProgressStatus.BACKLOG:
                submission.ticket_status = TicketProgressStatus.IN_PROGRESS
            submission.save()

        if is_submit:
            if not submission.minutes_solved:
                submission.minutes_solved = 1
            evaluate_and_score_submission(submission)
            submission.ticket_status = TicketProgressStatus.DONE if is_passed else TicketProgressStatus.IN_PROGRESS
            submission.save()
            UserLabActivity.objects.get_or_create(
                user=user,
                date=timezone.now().date()
            )

        # Sync to SystemDesign model for centralized storage
        SystemDesign.objects.update_or_create(
            user=user,
            ticket=ticket,
            defaults={
                "title": f"{ticket.title} - {user.email}",
                "lab": ticket.sprint.lab if ticket.sprint else None,
                "design": clean_design,
                "is_submitted": is_submit,
            }
        )

        return Response({
            "status": "success",
            "message": "System design submitted successfully" if is_submit else "System design saved successfully",
            "ticket_status": submission.ticket_status,
            "yuvro_points": submission.yuvro_points,
            "design": clean_design,
            "solution_output": submission.solution_output,
        })

    @action(detail=True, methods=['post'], url_path='github-commit')
    def github_commit(self, request, pk=None):
        ticket = self.get_object()
        user = request.user
        raw_design = request.data.get("design") if "design" in request.data else None
        files = request.data.get("files")
        commit_message = request.data.get("commit_message") or request.data.get("message")
        sprint_no = request.data.get("sprint_no")
        ticket_no = request.data.get("ticket_no")

        try:
            result = commit_ticket_to_github(
                user=user,
                lab=ticket.sprint.lab if ticket.sprint else None,
                ticket=ticket,
                files=files,
                design=raw_design,
                commit_message=commit_message,
                sprint_no=sprint_no,
                ticket_no=ticket_no,
            )
            return Response(result)
        except ValidationError as e:
            return Response({"error": str(e.detail if hasattr(e, 'detail') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to commit ticket to GitHub: {e}")
            return Response({"error": f"Failed to commit to GitHub: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserLabEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin':
            user_id = self.request.query_params.get('user_id')
            lab_id = self.request.query_params.get('lab_id')
            queryset = UserLabEnrollment.objects.all()
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
            return queryset
        return UserLabEnrollment.objects.filter(user=user)

    def perform_create(self, serializer):
        lab = serializer.validated_data.get('lab')
        if lab and lab.status != LabStatus.ACTIVE:
            raise ValidationError(
                f"Cannot enroll in this lab because its status is '{lab.status}'. "
                "Only active labs are open for enrollment."
            )
        requested_repo_name = self.request.data.get('github_repo_name')
        if not requested_repo_name:
            requested_repo_name = f"yuvro_{lab.title.replace(' ', '_').lower()}"



        client = GithubClient(self.request.user.id)
        if not client._fetch_token():
            raise ValidationError("Please connect your GitHub account before starting a lab.")
            
        try:
            repo_data = client.create_repository(requested_repo_name, private=True)
            github_repo_url = repo_data['url']
            default_branch = repo_data['default_branch']
        except Exception as e:
            raise ValidationError(f"Failed to create GitHub repository: {str(e)}")

        enrollment = serializer.save(
            user=self.request.user,
            github_repo_name=repo_data['name'],
            github_repo_url=github_repo_url,
            default_branch=default_branch
        )
        
        starter_repo_path = None
        if lab.git_repo_starter_url:
            starter_repo_name = get_repo_name_from_url(lab.git_repo_starter_url)
            starter_repo_path = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab.id), starter_repo_name)
            
        threading.Thread(
            target=provision_user_lab_repo, 
            args=(lab.id, self.request.user.id, starter_repo_path, github_repo_url, client.access_token, client.github_username)
        ).start()

class UserLabSprintTicketSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserLabSprintTicketSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            user_id = self.request.query_params.get('user_id')
            if user_id:
                qs = UserLabSprintTicketSubmission.objects.filter(user_id=user_id)
            else:
                qs = UserLabSprintTicketSubmission.objects.filter(user=user)
        else:
            qs = UserLabSprintTicketSubmission.objects.filter(user=user)
            
        ticket_id = self.request.query_params.get('lab_sprint_ticket')
        if ticket_id:
            qs = qs.filter(lab_sprint_ticket_id=ticket_id)
        return qs.select_related('lab_sprint_ticket__sprint__lab')

    def perform_create(self, serializer):
        submission = serializer.save(user=self.request.user)
        evaluate_and_score_submission(submission)
        submission.save()
        
        if submission.ticket_status in [TicketProgressStatus.IN_REVIEW, TicketProgressStatus.DONE]:
            UserLabActivity.objects.get_or_create(
                user=self.request.user,
                date=timezone.now().date()
            )

    def perform_update(self, serializer):
        submission = serializer.save()
        
        user_dir = None
        # If the user is submitting (status changed to in_review or done), extract diff
        is_system_design = (
            getattr(submission.lab_sprint_ticket.sprint.lab, 'type', None) == LabType.SYSTEM_DESIGN
            or bool(submission.system_design)
        )
        if not is_system_design and self.request.method == 'PATCH' and self.request.data.get('ticket_status') in ['in_review', 'done']:
            lab_uuid = submission.lab_sprint_ticket.sprint.lab_id
            user_uuid = submission.user_id
            user_dir = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab_uuid), "users", str(user_uuid))
            
            if os.path.exists(user_dir):
                try:
                    # Intend to add all files so untracked files show up in diff
                    subprocess.run(["git", "add", "-A", "-N"], cwd=user_dir, check=True, capture_output=True)
                    
                    sprint_no = submission.lab_sprint_ticket.sprint.order_index + 1
                    ticket_no = submission.lab_sprint_ticket.order_index + 1
                    prefix = f"feat(S{sprint_no}-T{ticket_no})"
                    
                    base_commit = "HEAD"
                    try:
                        log_output = subprocess.check_output(
                            ["git", "log", "--format=%H %s"], 
                            cwd=user_dir, 
                            stderr=subprocess.DEVNULL
                        ).decode().strip().split('\n')
                        
                        for line in log_output:
                            if not line.strip(): continue
                            parts = line.strip().split(' ', 1)
                            if len(parts) == 2:
                                commit_hash, subject = parts
                                if not subject.startswith(prefix):
                                    base_commit = commit_hash
                                    break
                    except Exception:
                        pass
                        
                    # Generate the diff patch against the base_commit
                    diff_output = subprocess.check_output(
                        ["git", "diff", base_commit], 
                        cwd=user_dir,
                        stderr=subprocess.DEVNULL
                    ).decode()
                    
                    submission.solution = diff_output
                except Exception as e:
                    pass

        evaluate_and_score_submission(submission)
        submission.save()
        
        if submission.ticket_status in [TicketProgressStatus.IN_REVIEW, TicketProgressStatus.DONE]:
            UserLabActivity.objects.get_or_create(
                user=self.request.user,
                date=timezone.now().date()
            )

    @action(detail=False, methods=['post'], url_path="reveal-solution")
    def reveal_solution(self, request):
        ticket_id = request.data.get("ticket_id")
        if not ticket_id:
            return Response({"error": "ticket_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ticket = LabSprintTicket.objects.get(id=ticket_id)
        except LabSprintTicket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        submission, created = UserLabSprintTicketSubmission.objects.get_or_create(
            user=request.user,
            lab_sprint_ticket=ticket,
            defaults={"ticket_status": TicketProgressStatus.BACKLOG}
        )

        submission.yuvro_points = 0
        submission.solution_revealed = True
        submission.save(update_fields=['yuvro_points', 'solution_revealed'])
        raw_solution = ticket.solution or {}
        solutions_list = []
        if isinstance(raw_solution, dict) and isinstance(raw_solution.get("solutions"), list):
            solutions_list = raw_solution.get("solutions")
        elif isinstance(raw_solution, list):
            solutions_list = raw_solution
        elif isinstance(raw_solution, dict):
            lang_map = {
                'py': 'python', 'js': 'javascript', 'jsx': 'javascript',
                'ts': 'typescript', 'tsx': 'typescript', 'sql': 'sql',
                'sh': 'bash', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
                'html': 'html', 'css': 'css', 'json': 'json'
            }
            for file_path, code in raw_solution.items():
                if file_path == "solutions" and isinstance(code, list):
                    solutions_list.extend(code)
                elif isinstance(code, str):
                    ext = file_path.split('.')[-1].lower() if '.' in file_path else ''
                    lang = lang_map.get(ext, 'python')
                    is_file = '.' in file_path or '/' in file_path
                    solutions_list.append({
                        "title": file_path if is_file else "Official Solution",
                        "file_path": file_path if is_file else "",
                        "filePath": file_path if is_file else "",
                        "language": lang,
                        "code": code,
                        "approach": file_path if is_file else "solution"
                    })
        elif isinstance(raw_solution, str) and raw_solution.strip():
            starter_path = ""
            if isinstance(ticket.scoring_rules, dict):
                starter_path = ticket.scoring_rules.get("starter_path") or ""
            solutions_list.append({
                "title": starter_path or "Official Solution",
                "file_path": starter_path,
                "filePath": starter_path,
                "language": "python",
                "code": raw_solution,
                "approach": starter_path if starter_path else "solution"
            })

        return Response({
            "solutions": solutions_list,
            "solution": raw_solution,
            "raw_solution": raw_solution
        })

    @action(detail=False, methods=['post'], url_path="reveal-hint")
    def reveal_hint(self, request):
        ticket_id = request.data.get("ticket_id")
        hint_index = request.data.get("hint_index")
        
        if not ticket_id or hint_index is None:
            return Response({"error": "ticket_id and hint_index are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ticket = LabSprintTicket.objects.get(id=ticket_id)
        except LabSprintTicket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        submission, created = UserLabSprintTicketSubmission.objects.get_or_create(
            user=request.user,
            lab_sprint_ticket=ticket,
            defaults={"ticket_status": TicketProgressStatus.BACKLOG}
        )

        if hint_index not in submission.revealed_hints:
            submission.revealed_hints.append(hint_index)
            
        if not submission.hint_penalty_applied:
            submission.hint_penalty_applied = True
            # Halve current score if it has one
            submission.yuvro_points = submission.yuvro_points // 2
            
        submission.save(update_fields=['revealed_hints', 'hint_penalty_applied', 'yuvro_points'])

        return Response({"status": "success", "revealed_hints": submission.revealed_hints})




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_stats_view(request):
    user = request.user
    
    done_submissions = UserLabSprintTicketSubmission.objects.filter(
        user=user,
        ticket_status__in=['in_review', 'done']
    ).select_related('lab_sprint_ticket')
    
    # Calculate YP based on actual user earned points, not maximum available points
    total_yp = done_submissions.aggregate(
        total_yp=Sum('yuvro_points')
    )['total_yp'] or 0

    # Calculate rank based on total_yp of all users
    rank_count = UserLabSprintTicketSubmission.objects.filter(
        ticket_status__in=['in_review', 'done']
    ).values('user').annotate(
        user_total_yp=Sum('yuvro_points')
    ).filter(user_total_yp__gt=total_yp).count()
    
    rank = rank_count + 1

    # Fetch unique activity dates from the UserLabActivity model
    activities = UserLabActivity.objects.filter(user=user).values_list('date', flat=True)
    sorted_dates = sorted(list(activities), reverse=True)
    
    streak = 0
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    
    current_date_to_check = today
    
    if sorted_dates and sorted_dates[0] == today:
        streak = 1
        current_date_to_check = yesterday
        for d in sorted_dates[1:]:
            if d == current_date_to_check:
                streak += 1
                current_date_to_check -= timedelta(days=1)
            else:
                break
    elif sorted_dates and sorted_dates[0] == yesterday:
        streak = 1
        current_date_to_check = yesterday - timedelta(days=1)
        for d in sorted_dates[1:]:
            if d == current_date_to_check:
                streak += 1
                current_date_to_check -= timedelta(days=1)
            else:
                break
    
    return Response({
        'day_streak': streak,
        'total_yp': total_yp,
        'rank': rank,
        'activity_dates': [d.isoformat() for d in sorted_dates],
    })


@api_view(["GET"])
@permission_classes([])
def public_milestone_view(request, slug, user_id):
    """
    Public milestone showcase endpoint for LinkedIn viewers.
    No auth required. Returns verified details of student's achievement.
    """
    try:
        lab = Lab.objects.get(slug=slug)
    except Lab.DoesNotExist:
        return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)

    from django.contrib.auth import get_user_model
    UserModel = get_user_model()
    try:
        student = UserModel.objects.get(id=user_id)
    except (UserModel.DoesNotExist, ValueError):
        return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

    # Gather lab sprints and tickets
    sprints = lab.sprints.all().prefetch_related("tasks")
    all_ticket_ids = [t.id for s in sprints for t in s.tasks.all()]

    submissions = UserLabSprintTicketSubmission.objects.filter(
        user=student,
        lab_sprint_ticket_id__in=all_ticket_ids
    ).select_related("lab_sprint_ticket")

    sub_map = {str(s.lab_sprint_ticket_id): s for s in submissions}

    completed_tickets_count = 0
    total_earned_yp = 0
    total_max_yp = 0

    sprint_data = []
    for s in sprints:
        s_tasks = s.tasks.all()
        s_completed = 0
        s_score_sum = 0
        for t in s_tasks:
            total_max_yp += t.yuvro_points
            sub = sub_map.get(str(t.id))
            if sub and sub.ticket_status == TicketProgressStatus.DONE:
                s_completed += 1
                completed_tickets_count += 1
                earned = sub.yuvro_points if sub.yuvro_points is not None else t.yuvro_points
                total_earned_yp += earned
                test_score = 100
                if sub.solution_output:
                    try:
                        import json
                        parsed = json.loads(sub.solution_output) if isinstance(sub.solution_output, str) else sub.solution_output
                        test_score = parsed.get("percentage") or parsed.get("total_score") or 100
                    except Exception:
                        test_score = 100
                s_score_sum += test_score
            elif sub and sub.ticket_status == TicketProgressStatus.IN_REVIEW:
                s_completed += 1
                s_score_sum += 75

        s_pct = round(s_score_sum / len(s_tasks)) if s_tasks else 0
        sprint_data.append({
            "id": str(s.id),
            "name": s.title,
            "tickets_total": len(s_tasks),
            "tickets_completed": s_completed,
            "is_completed": s_completed == len(s_tasks) and len(s_tasks) > 0,
            "score": s_pct,
        })

    total_tickets = len(all_ticket_ids)
    overall_progress = round((completed_tickets_count / total_tickets) * 100) if total_tickets else 0

    first_name = student.first_name or ""
    last_name = student.last_name or ""
    display_name = f"{first_name} {last_name}".strip() or student.username

    return Response({
        "student": {
            "name": display_name,
            "username": student.username,
            "profile_image": getattr(student, "profile_image", None),
        },
        "lab": {
            "id": str(lab.id),
            "slug": lab.slug,
            "title": lab.title,
            "description": lab.description,
            "difficulty": lab.difficulty,
            "language": lab.language,
            "tags": lab.tags,
            "total_sprints": len(sprints),
            "total_tickets": total_tickets,
        },
        "achievement": {
            "completed_tickets": completed_tickets_count,
            "total_tickets": total_tickets,
            "overall_progress": overall_progress,
            "earned_yp": total_earned_yp,
            "max_yp": total_max_yp,
            "sprints": sprint_data,
        }
    })


@api_view(["GET"])
@permission_classes([])
def public_user_stats_view(request, username):
    clean_username = (username or "").strip()
    if not clean_username:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth import get_user_model
    UserModel = get_user_model()
    student = UserModel.objects.filter(username__iexact=clean_username).first()

    default_stats = {
        "labsCompleted": 0,
        "sprintsShipped": 0,
        "ticketsClosed": 0,
        "mockInterviews": 0,
        "stats": {
            "total": 0,
            "activeDays": 0,
            "currentStreak": 0,
            "longestStreak": 0,
        },
        "activityDates": [],
        "verifiedSkills": [],
    }

    if not student:
        return Response(default_stats, status=status.HTTP_200_OK)

    submissions = list(UserLabSprintTicketSubmission.objects.filter(
        user=student,
        ticket_status__in=['in_review', 'done']
    ).select_related('lab_sprint_ticket', 'lab_sprint_ticket__sprint', 'lab_sprint_ticket__sprint__lab'))

    closed_submissions = [s for s in submissions if s.ticket_status == 'done']
    tickets_closed = len(closed_submissions)

    sprint_set = set()
    for s in submissions:
        sprint_id = getattr(s, 'sprint_id', None) or (s.lab_sprint_ticket.sprint_id if s.lab_sprint_ticket else None)
        if sprint_id:
            sprint_set.add(str(sprint_id))
    sprints_shipped = len(sprint_set)

    # Count completed labs: labs where user has completed all tickets
    completed_enrollments = 0
    enrollments = UserLabEnrollment.objects.filter(user=student).select_related('lab')
    for enr in enrollments:
        lab = enr.lab
        total_tickets = LabSprintTicket.objects.filter(sprint__lab=lab).count()
        if total_tickets > 0:
            done_tickets = sum(1 for s in closed_submissions if s.lab_sprint_ticket and s.lab_sprint_ticket.sprint and s.lab_sprint_ticket.sprint.lab_id == lab.id)
            if done_tickets >= total_tickets:
                completed_enrollments += 1

    activities = list(UserLabActivity.objects.filter(user=student).values_list('date', flat=True))
    sorted_dates = sorted(activities, reverse=True)

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    streak = 0
    if sorted_dates and sorted_dates[0] == today:
        streak = 1
        current_check = yesterday
        for d in sorted_dates[1:]:
            if d == current_check:
                streak += 1
                current_check -= timedelta(days=1)
            else:
                break
    elif sorted_dates and sorted_dates[0] == yesterday:
        streak = 1
        current_check = yesterday - timedelta(days=1)
        for d in sorted_dates[1:]:
            if d == current_check:
                streak += 1
                current_check -= timedelta(days=1)
            else:
                break

    count_per_lab = {}
    lab_names = {}
    for s in submissions:
        lab_obj = None
        if s.lab_sprint_ticket and s.lab_sprint_ticket.sprint and s.lab_sprint_ticket.sprint.lab:
            lab_obj = s.lab_sprint_ticket.sprint.lab
        lab_id = str(lab_obj.id) if lab_obj else "core"
        lab_name = lab_obj.title if lab_obj else "Engineering Lab"
        count_per_lab[lab_id] = count_per_lab.get(lab_id, 0) + 1
        lab_names[lab_id] = lab_name

    verified_skills = []
    for lab_id, count in count_per_lab.items():
        level = "Advanced" if count >= 15 else ("Intermediate" if count >= 5 else "Beginner")
        verified_skills.append({
            "id": f"vs-{lab_id}",
            "name": lab_names.get(lab_id, f"Engineering Lab #{lab_id}"),
            "level": level,
            "tasksCount": count,
        })

    event_dates = []
    for d in sorted_dates:
        event_dates.append(d.isoformat())
    for s in submissions:
        dt = s.updated_at or s.created_at
        if dt:
            event_dates.append(dt.isoformat() if hasattr(dt, 'isoformat') else str(dt))

    unique_active_days = len(set(d.split("T")[0] for d in event_dates))
    total_contributions = len(event_dates)

    return Response({
        "labsCompleted": completed_enrollments,
        "sprintsShipped": sprints_shipped,
        "ticketsClosed": tickets_closed,
        "mockInterviews": 0,
        "stats": {
            "total": total_contributions,
            "activeDays": unique_active_days,
            "currentStreak": streak,
            "longestStreak": streak,
        },
        "activityDates": event_dates,
        "verifiedSkills": verified_skills,
    }, status=status.HTTP_200_OK)


class SystemDesignViewSet(viewsets.ModelViewSet):
    serializer_class = SystemDesignSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SystemDesign.objects.all()
        if not (user.is_staff or getattr(user, 'role', '') == 'admin'):
            qs = qs.filter(user=user)
        ticket_id = self.request.query_params.get("ticket")
        if ticket_id:
            qs = qs.filter(ticket_id=ticket_id)
        lab_id = self.request.query_params.get("lab")
        if lab_id:
            qs = qs.filter(lab_id=lab_id)
        is_template = self.request.query_params.get("is_template")
        if is_template is not None:
            qs = qs.filter(is_template=is_template.lower() in ["true", "1"])
        return qs

    def perform_create(self, serializer):
        design = serializer.save(user=self.request.user)
        if design.ticket:
            UserLabSprintTicketSubmission.objects.update_or_create(
                user=self.request.user,
                lab_sprint_ticket=design.ticket,
                defaults={
                    "system_design": design.design,
                    "solution": json.dumps(design.design),
                    "ticket_status": TicketProgressStatus.DONE if design.is_submitted else TicketProgressStatus.IN_PROGRESS,
                }
            )

    def perform_update(self, serializer):
        design = serializer.save()
        if design.ticket:
            UserLabSprintTicketSubmission.objects.update_or_create(
                user=self.request.user,
                lab_sprint_ticket=design.ticket,
                defaults={
                    "system_design": design.design,
                    "solution": json.dumps(design.design),
                    "ticket_status": TicketProgressStatus.DONE if design.is_submitted else TicketProgressStatus.IN_PROGRESS,
                }
            )

    @action(detail=False, methods=['post'], url_path='github-commit')
    def github_commit(self, request):
        user = request.user
        raw_design = request.data.get("design") if "design" in request.data else request.data
        clean_design = normalize_system_design(raw_design)
        commit_message = request.data.get("commit_message") or request.data.get("message")
        ticket_id = request.data.get("ticket_id") or request.data.get("ticket")
        lab_id = request.data.get("lab_id") or request.data.get("lab")

        ticket = None
        if ticket_id:
            ticket = LabSprintTicket.objects.filter(id=ticket_id).first()

        lab = None
        if lab_id:
            lab = Lab.objects.filter(id=lab_id).first()
        elif ticket and ticket.sprint:
            lab = ticket.sprint.lab

        try:
            result = commit_system_design_to_github(
                user=user,
                lab=lab,
                ticket=ticket,
                design=clean_design,
                commit_message=commit_message,
            )
            return Response(result)
        except ValidationError as e:
            return Response({"error": str(e.detail if hasattr(e, 'detail') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to commit system design to GitHub: {e}")
            return Response({"error": f"Failed to commit to GitHub: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LearnRecurringTaskViewSet(viewsets.ModelViewSet):
    queryset = LearnRecurringTask.objects.all().select_related('lab')
    serializer_class = LearnRecurringTaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin'):
            queryset = queryset.filter(is_active=True)
        lab_id = self.request.query_params.get('lab')
        if lab_id:
            queryset = queryset.filter(lab_id=lab_id)
        task_type = self.request.query_params.get('type')
        if task_type:
            queryset = queryset.filter(type=task_type)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=(is_active.lower() in ['true', '1']))
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        if self.action in ['enroll', 'complete_day']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='active')
    def active_tasks(self, request):
        queryset = LearnRecurringTask.objects.filter(is_active=True).select_related('lab')
        task_type = request.query_params.get('type')
        if task_type:
            queryset = queryset.filter(type=task_type)
        tasks = queryset.order_by('-created_at')
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        today = timezone.now().date()
        task_type = request.query_params.get('type', 'weekly')

        # 1. Enrolled task that is active
        enrolled = LearnRecurringTaskEnrollment.objects.filter(
            user=request.user,
            recurring_task__is_active=True,
            recurring_task__type=task_type
        ).select_related('recurring_task', 'recurring_task__lab').first()

        task = None
        if enrolled:
            task = enrolled.recurring_task
        else:
            # 2. Active task covering today
            task = LearnRecurringTask.objects.filter(
                is_active=True,
                type=task_type,
                start_date__lte=today,
                end_date__gte=today
            ).select_related('lab').first()

            if not task:
                # 3. Most recently started active task
                task = LearnRecurringTask.objects.filter(
                    is_active=True,
                    type=task_type
                ).select_related('lab').order_by('-start_date').first()

        if not task:
            return Response({"detail": f"No active {task_type} task found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='enroll')
    def enroll(self, request, pk=None):
        task = self.get_object()
        enrollment, created = LearnRecurringTaskEnrollment.objects.get_or_create(
            user=request.user,
            recurring_task=task
        )
        return Response({
            "status": "enrolled",
            "created": created,
            "enrollment_id": str(enrollment.id),
            "task_id": str(task.id),
            "weekly_task_id": str(task.id),
            "recurring_task_id": str(task.id)
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def _compute_leaderboard_and_stats(self, task, current_user=None):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        total_days = 7 if getattr(task, 'type', 'weekly') == 'weekly' else 30
        days_list = task.days if isinstance(task.days, list) else []

        day_ticket_ids_map = {}
        all_task_ticket_ids = set()

        for i, d in enumerate(days_list):
            day_idx = d.get('day_index', i)
            tids = set()
            if d.get('ticket_ids') and isinstance(d['ticket_ids'], list):
                for x in d['ticket_ids']:
                    if x:
                        tids.add(str(x).strip())
            elif d.get('ticket_id'):
                tids.add(str(d['ticket_id']).strip())

            if isinstance(d.get('tickets'), list):
                for tk in d['tickets']:
                    tid = tk.get('ticket_id', '') if isinstance(tk, dict) else tk
                    if tid:
                        tids.add(str(tid).strip())

            day_ticket_ids_map[day_idx] = tids
            all_task_ticket_ids.update(tids)

        enrolled_user_ids = set(
            task.enrollments.values_list('user_id', flat=True)
        )

        submission_user_ids = set()
        if all_task_ticket_ids:
            submission_user_ids = set(
                UserLabSprintTicketSubmission.objects.filter(
                    lab_sprint_ticket_id__in=all_task_ticket_ids
                ).values_list('user_id', flat=True)
            )

        candidate_user_ids = enrolled_user_ids | submission_user_ids
        if current_user and getattr(current_user, 'is_authenticated', False):
            candidate_user_ids.add(current_user.id)

        users_dict = {
            u.id: u for u in User.objects.filter(id__in=candidate_user_ids)
        }
        if current_user and getattr(current_user, 'is_authenticated', False) and current_user.id not in users_dict:
            users_dict[current_user.id] = current_user

        user_submissions = {uid: [] for uid in users_dict.keys()}
        if all_task_ticket_ids and users_dict:
            subs_qs = UserLabSprintTicketSubmission.objects.filter(
                user_id__in=users_dict.keys(),
                lab_sprint_ticket_id__in=all_task_ticket_ids,
                ticket_status__in=['done', 'in_review']
            ).values(
                'user_id', 'lab_sprint_ticket_id', 'minutes_solved',
                'yuvro_points', 'solution_output', 'updated_at'
            )
            for s in subs_qs:
                uid = s['user_id']
                if uid in user_submissions:
                    user_submissions[uid].append(s)

        today = timezone.now().date()
        if task.start_date:
            today_offset = (today - task.start_date).days
            today_idx = min(max(0, today_offset), total_days - 1)
        else:
            today_idx = (today.weekday()) % total_days

        user_scores = []
        for uid, u in users_dict.items():
            is_you = bool(current_user and getattr(current_user, 'is_authenticated', False) and current_user.id == uid)
            is_staff_user = getattr(u, 'is_staff', False) or getattr(u, 'is_superuser', False) or getattr(u, 'role', '') == 'admin'
            if is_staff_user and not is_you:
                continue

            subs = user_submissions.get(uid, [])
            done_ticket_ids = {str(s['lab_sprint_ticket_id']) for s in subs}

            completed_days = []
            for day_idx, tids in day_ticket_ids_map.items():
                if tids and tids.issubset(done_ticket_ids):
                    completed_days.append(day_idx)

            days_done = len(completed_days)
            points = days_done * 10 + (20 if days_done == total_days and total_days > 0 else 0)

            minutes_list = [s['minutes_solved'] for s in subs if s.get('minutes_solved')]
            avg_minutes = round(sum(minutes_list) / len(minutes_list)) if minutes_list else None

            scores_list = []
            for s in subs:
                output = s.get('solution_output')
                if output:
                    try:
                        parsed = json.loads(output) if isinstance(output, str) else output
                        if isinstance(parsed, dict):
                            pct = parsed.get('percentage', parsed.get('score', parsed.get('overall_score', parsed.get('total_score'))))
                            if pct is not None:
                                scores_list.append(float(pct))
                    except Exception:
                        pass
            avg_score_pct = round(sum(scores_list) / len(scores_list)) if scores_list else (85 if days_done > 0 else None)

            done_set = set(completed_days)
            streak = 0
            check_day = today_idx if today_idx in done_set else today_idx - 1
            while check_day >= 0 and check_day in done_set:
                streak += 1
                check_day -= 1

            first = (getattr(u, 'first_name', '') or '').strip()
            last = (getattr(u, 'last_name', '') or '').strip()
            if first and last:
                name = f"{first} {last[0].upper()}."
            elif first:
                name = first
            elif getattr(u, 'username', '') and '@' not in u.username:
                name = u.username
            elif getattr(u, 'email', ''):
                name = u.email.split('@')[0].capitalize()
            else:
                name = "Learner"

            is_you = bool(current_user and getattr(current_user, 'is_authenticated', False) and current_user.id == uid)

            latest_updated = max([s['updated_at'] for s in subs], default=getattr(u, 'created_at', None))

            user_scores.append({
                'user_id': str(uid),
                'name': name,
                'days_done': days_done,
                'total_days': total_days,
                'points': points,
                'avg_minutes': avg_minutes,
                'avg_score_pct': avg_score_pct,
                'streak': streak,
                'is_you': is_you,
                'latest_updated': latest_updated,
                'is_enrolled': uid in enrolled_user_ids,
            })

        user_scores.sort(
            key=lambda x: (
                -x['points'],
                -x['days_done'],
                x['avg_minutes'] if x['avg_minutes'] is not None else 999999,
                0 if x['is_enrolled'] else 1,
                x['latest_updated'] or timezone.now()
            )
        )

        for idx, item in enumerate(user_scores):
            item['rank'] = idx + 1

        total_enrolled = max(len(enrolled_user_ids), len(user_scores), 1)
        current_user_item = next((item for item in user_scores if item['is_you']), None)

        current_user_rank = None
        current_user_stats = {
            'rank': None,
            'total_enrolled': total_enrolled,
            'points': 0,
            'days_completed': 0,
            'streak': 0,
            'avg_minutes': None,
            'avg_score_pct': None,
        }

        if current_user_item:
            if current_user_item['days_done'] > 0 or current_user_item['points'] > 0:
                current_user_rank = current_user_item['rank']

            current_user_stats = {
                'rank': current_user_rank,
                'total_enrolled': total_enrolled,
                'points': current_user_item['points'],
                'days_completed': current_user_item['days_done'],
                'streak': current_user_item['streak'],
                'avg_minutes': current_user_item['avg_minutes'],
                'avg_score_pct': current_user_item['avg_score_pct'],
            }

        top_5 = user_scores[:5]
        top_entries = [
            {
                'rank': item['rank'],
                'name': "You" if item['is_you'] else item['name'],
                'daysDone': item['days_done'],
                'totalDays': item['total_days'],
                'points': item['points'],
                'isYou': item['is_you'],
            }
            for item in top_5
        ]

        user_entry = None
        if current_user_item and current_user_item['rank'] > 5:
            user_entry = {
                'rank': current_user_item['rank'],
                'name': "You",
                'daysDone': current_user_item['days_done'],
                'totalDays': current_user_item['total_days'],
                'points': current_user_item['points'],
                'isYou': True,
            }

        return {
            'top': top_entries,
            'userEntry': user_entry,
            'rank': current_user_rank,
            'totalEnrolled': total_enrolled,
            'stats': current_user_stats,
        }

    @action(detail=True, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request, pk=None):
        task = self.get_object()
        data = self._compute_leaderboard_and_stats(task, request.user)
        return Response({
            "top": data['top'],
            "userEntry": data['userEntry'],
            "rank": data['rank'],
            "totalEnrolled": data['totalEnrolled'],
            "stats": data['stats']
        })

    @action(detail=True, methods=['get'], url_path='stats')
    def task_stats(self, request, pk=None):
        task = self.get_object()
        data = self._compute_leaderboard_and_stats(task, request.user)
        return Response(data['stats'])

    @action(detail=True, methods=['post'], url_path='complete-day')
    def complete_day(self, request, pk=None):
        task = self.get_object()
        day_index = request.data.get('day_index')
        if day_index is None:
            return Response({"error": "day_index is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            day_index = int(day_index)
        except ValueError:
            return Response({"error": "day_index must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        days_list = task.days if isinstance(task.days, list) else []
        if day_index < 0 or day_index >= len(days_list):
            return Response({"error": f"day_index {day_index} out of range"}, status=status.HTTP_400_BAD_REQUEST)

        target_day = days_list[day_index]
        tids = []
        if target_day.get('ticket_ids') and isinstance(target_day['ticket_ids'], list):
            tids.extend([str(x) for x in target_day['ticket_ids'] if x])
        elif target_day.get('ticket_id'):
            tids.append(str(target_day['ticket_id']))

        if isinstance(target_day.get('tickets'), list):
            for tk in target_day['tickets']:
                tid = tk.get('ticket_id', '') if isinstance(tk, dict) else tk
                if tid and str(tid) not in tids:
                    tids.append(str(tid))

        tickets = LabSprintTicket.objects.filter(id__in=tids)
        for ticket in tickets:
            sub, _ = UserLabSprintTicketSubmission.objects.get_or_create(
                user=request.user,
                lab_sprint_ticket=ticket,
            )
            sub.ticket_status = TicketProgressStatus.DONE
            if not sub.yuvro_points:
                sub.yuvro_points = ticket.yuvro_points or 10
            if not sub.minutes_solved:
                sub.minutes_solved = ticket.minutes_max or 25
            sub.save()

        UserLabActivity.objects.get_or_create(
            user=request.user,
            date=timezone.now().date()
        )

        LearnRecurringTaskEnrollment.objects.get_or_create(
            user=request.user,
            recurring_task=task
        )

        data = self._compute_leaderboard_and_stats(task, request.user)
        task_serializer = self.get_serializer(task)
        return Response({
            "status": "success",
            "task": task_serializer.data,
            "leaderboard": {
                "top": data['top'],
                "userEntry": data['userEntry'],
                "rank": data['rank'],
            },
            "stats": data['stats']
        })

    @action(detail=False, methods=['post', 'get'], url_path='seed-simulation')
    def seed_simulation(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # 1. Find or get System Design Lab
        lab = Lab.objects.filter(type=LabType.SYSTEM_DESIGN).first()
        if not lab:
            lab = Lab.objects.filter(title__icontains="System Design").first()
        if not lab:
            return Response({"error": "System Design lab not found"}, status=status.HTTP_404_NOT_FOUND)

        task_id = request.query_params.get("task_id") or request.data.get("task_id")
        task = None
        if task_id:
            task = LearnRecurringTask.objects.filter(id=task_id).first()
        if not task:
            task = LearnRecurringTask.objects.filter(lab=lab, type="weekly", is_active=True).first()
        if not task:
            task = LearnRecurringTask.objects.filter(type="weekly", is_active=True).first()

        today = timezone.now().date()
        start_date = today - timedelta(days=1)
        end_date = start_date + timedelta(days=6)

        tickets = list(LabSprintTicket.objects.filter(sprint__lab=lab).order_by('sprint__order_index', 'order_index'))
        if not tickets:
            tickets = list(LabSprintTicket.objects.all()[:14])

        if not task:
            days_data = []
            for i in range(7):
                tk = tickets[i % len(tickets)]
                days_data.append({
                    "day_index": i,
                    "day_name": (start_date + timedelta(days=i)).strftime("%A"),
                    "sprint_id": str(tk.sprint.id) if tk.sprint else None,
                    "sprint_title": tk.sprint.title if tk.sprint else f"Sprint {i + 1}",
                    "ticket_ids": [str(tk.id)],
                    "tickets": [
                        {
                            "ticket_id": str(tk.id),
                            "title": tk.title,
                            "ticket_slug": tk.ticket_slug,
                            "difficulty": tk.difficulty,
                            "yuvro_points": tk.yuvro_points or 10,
                            "minutes_max": tk.minutes_max or 30
                        }
                    ]
                })
            task = LearnRecurringTask.objects.create(
                name="System Design Challenge",
                description="Master core scalable distributed system patterns, caching, database indexing, and event-driven architectures.",
                lab=lab,
                type="weekly",
                start_date=start_date,
                end_date=end_date,
                days=days_data,
                is_active=True
            )
        else:
            if task.end_date < today or task.start_date > today:
                task.start_date = start_date
                task.end_date = end_date
                task.save()

        # 3. 30 distinct students with different completion levels
        STUDENTS = [
            {"first": "Aarav", "last": "Sharma", "email": "aarav.sharma@yuvro.dev", "completed_days": 7, "avg_min": 21, "score": 96},
            {"first": "Meera", "last": "Krishnan", "email": "meera.krishnan@yuvro.dev", "completed_days": 7, "avg_min": 25, "score": 93},
            {"first": "Rohan", "last": "Verma", "email": "rohan.verma@yuvro.dev", "completed_days": 7, "avg_min": 29, "score": 90},
            {"first": "Priya", "last": "Patel", "email": "priya.patel@yuvro.dev", "completed_days": 6, "avg_min": 24, "score": 89},
            {"first": "Ananya", "last": "Iyer", "email": "ananya.iyer@yuvro.dev", "completed_days": 6, "avg_min": 28, "score": 87},
            {"first": "Daniel", "last": "O'Connor", "email": "daniel.oconnor@yuvro.dev", "completed_days": 6, "avg_min": 32, "score": 85},
            {"first": "Vikram", "last": "Singh", "email": "vikram.singh@yuvro.dev", "completed_days": 6, "avg_min": 35, "score": 84},
            {"first": "Lucas", "last": "Miller", "email": "lucas.miller@yuvro.dev", "completed_days": 5, "avg_min": 27, "score": 88},
            {"first": "Sneha", "last": "Reddy", "email": "sneha.reddy@yuvro.dev", "completed_days": 5, "avg_min": 30, "score": 86},
            {"first": "Aditya", "last": "Nair", "email": "aditya.nair@yuvro.dev", "completed_days": 5, "avg_min": 34, "score": 83},
            {"first": "Tanvi", "last": "Joshi", "email": "tanvi.joshi@yuvro.dev", "completed_days": 5, "avg_min": 36, "score": 82},
            {"first": "Siddharth", "last": "Rao", "email": "siddharth.rao@yuvro.dev", "completed_days": 5, "avg_min": 39, "score": 80},
            {"first": "Neha", "last": "Gupta", "email": "neha.gupta@yuvro.dev", "completed_days": 4, "avg_min": 28, "score": 85},
            {"first": "Rahul", "last": "Menon", "email": "rahul.menon@yuvro.dev", "completed_days": 4, "avg_min": 31, "score": 82},
            {"first": "Pooja", "last": "Kulkarni", "email": "pooja.kulkarni@yuvro.dev", "completed_days": 4, "avg_min": 35, "score": 80},
            {"first": "Karthik", "last": "Subramanian", "email": "karthik.sub@yuvro.dev", "completed_days": 4, "avg_min": 38, "score": 79},
            {"first": "Divya", "last": "Pillai", "email": "divya.pillai@yuvro.dev", "completed_days": 4, "avg_min": 41, "score": 77},
            {"first": "Arjun", "last": "Kapoor", "email": "arjun.kapoor@yuvro.dev", "completed_days": 4, "avg_min": 44, "score": 76},
            {"first": "Shreya", "last": "Das", "email": "shreya.das@yuvro.dev", "completed_days": 3, "avg_min": 33, "score": 81},
            {"first": "Varun", "last": "Deshmukh", "email": "varun.deshmukh@yuvro.dev", "completed_days": 3, "avg_min": 37, "score": 78},
            {"first": "Riya", "last": "Sen", "email": "riya.sen@yuvro.dev", "completed_days": 3, "avg_min": 40, "score": 75},
            {"first": "Nikhil", "last": "Bhat", "email": "nikhil.bhat@yuvro.dev", "completed_days": 3, "avg_min": 43, "score": 74},
            {"first": "Kavya", "last": "Nambiar", "email": "kavya.nambiar@yuvro.dev", "completed_days": 2, "avg_min": 35, "score": 76},
            {"first": "Harsh", "last": "Agarwal", "email": "harsh.agarwal@yuvro.dev", "completed_days": 2, "avg_min": 39, "score": 74},
            {"first": "Ishita", "last": "Roy", "email": "ishita.roy@yuvro.dev", "completed_days": 2, "avg_min": 42, "score": 72},
            {"first": "Gaurav", "last": "Hegde", "email": "gaurav.hegde@yuvro.dev", "completed_days": 2, "avg_min": 45, "score": 70},
            {"first": "Sanya", "last": "Mehta", "email": "sanya.mehta@yuvro.dev", "completed_days": 1, "avg_min": 38, "score": 73},
            {"first": "Tarun", "last": "Chawla", "email": "tarun.chawla@yuvro.dev", "completed_days": 1, "avg_min": 42, "score": 71},
            {"first": "Bhavna", "last": "Mishra", "email": "bhavna.mishra@yuvro.dev", "completed_days": 0, "avg_min": None, "score": None},
            {"first": "Pranav", "last": "Goswami", "email": "pranav.goswami@yuvro.dev", "completed_days": 0, "avg_min": None, "score": None},
        ]

        day_ticket_ids = []
        for i, d in enumerate(task.days):
            tids = []
            if d.get('ticket_ids') and isinstance(d['ticket_ids'], list):
                tids.extend([str(x) for x in d['ticket_ids'] if x])
            elif d.get('ticket_id'):
                tids.append(str(d['ticket_id']))
            if isinstance(d.get('tickets'), list):
                for tk in d['tickets']:
                    tid = tk.get('ticket_id', '') if isinstance(tk, dict) else tk
                    if tid and str(tid) not in tids:
                        tids.append(str(tid))
            day_ticket_ids.append(tids)

        for i in range(len(task.days)):
            if (i >= len(day_ticket_ids) or not day_ticket_ids[i]) and tickets:
                tk = tickets[i % len(tickets)]
                if i >= len(day_ticket_ids):
                    day_ticket_ids.append([str(tk.id)])
                else:
                    day_ticket_ids[i] = [str(tk.id)]
                if isinstance(task.days[i], dict):
                    task.days[i]['ticket_ids'] = [str(tk.id)]
                    task.days[i]['tickets'] = [{
                        'ticket_id': str(tk.id),
                        'title': tk.title,
                        'ticket_slug': tk.ticket_slug,
                        'difficulty': tk.difficulty,
                        'yuvro_points': tk.yuvro_points or 10,
                        'minutes_max': tk.minutes_max or 30
                    }]
        task.save()

        created_users_count = 0
        enrollments_count = 0
        submissions_count = 0

        if request.user and request.user.is_authenticated:
            LearnRecurringTaskEnrollment.objects.get_or_create(user=request.user, recurring_task=task)

        for s_data in STUDENTS:
            uname_candidate = s_data["email"].split("@")[0].replace(".", "_")
            u = User.objects.filter(email=s_data["email"]).first()
            if not u:
                u = User.objects.filter(username=uname_candidate).first()
            if not u:
                u = User.objects.filter(username=s_data["email"].split("@")[0]).first()

            created = False
            if not u:
                uname = uname_candidate
                counter = 1
                while User.objects.filter(username=uname).exists():
                    uname = f"{uname_candidate}_{counter}"
                    counter += 1
                u = User.objects.create(
                    email=s_data["email"],
                    username=uname,
                    first_name=s_data["first"],
                    last_name=s_data["last"],
                    is_active=True,
                    is_staff=False,
                    is_superuser=False,
                )
                created = True
            else:
                u.first_name = s_data["first"]
                u.last_name = s_data["last"]
                u.is_staff = False
                u.is_superuser = False
                u.save()

            if created:
                created_users_count += 1

            _, enr_created = LearnRecurringTaskEnrollment.objects.get_or_create(user=u, recurring_task=task)
            if enr_created:
                enrollments_count += 1

            num_days = s_data["completed_days"]
            for d_idx in range(min(num_days, len(day_ticket_ids))):
                tids_for_day = day_ticket_ids[d_idx]
                day_date = task.start_date + timedelta(days=d_idx)
                for tid in tids_for_day:
                    ticket_obj = LabSprintTicket.objects.filter(id=tid).first()
                    if not ticket_obj:
                        continue
                    sub, sub_created = UserLabSprintTicketSubmission.objects.get_or_create(
                        user=u,
                        lab_sprint_ticket=ticket_obj,
                    )
                    sub.ticket_status = TicketProgressStatus.DONE
                    sub.yuvro_points = ticket_obj.yuvro_points or 10
                    sub.minutes_solved = s_data["avg_min"] or 25
                    sub.solution_output = json.dumps({"percentage": s_data["score"] or 85, "status": "passed"})
                    sub.save()
                    if sub_created:
                        submissions_count += 1

                try:
                    UserLabActivity.objects.get_or_create(user=u)
                except Exception:
                    pass

        data = self._compute_leaderboard_and_stats(task, request.user)
        return Response({
            "status": "success",
            "task_id": str(task.id),
            "task_name": task.name,
            "created_users_count": created_users_count,
            "total_enrolled": data["totalEnrolled"],
            "submissions_created": submissions_count,
            "leaderboard": data
        })


class LearnRecurringTaskEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = LearnRecurringTaskEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin':
            task_id = self.request.query_params.get('recurring_task') or self.request.query_params.get('weekly_task')
            user_id = self.request.query_params.get('user')
            queryset = LearnRecurringTaskEnrollment.objects.all().select_related('user', 'recurring_task', 'recurring_task__lab')
            if task_id:
                queryset = queryset.filter(recurring_task_id=task_id)
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            return queryset
        return LearnRecurringTaskEnrollment.objects.filter(user=user).select_related('recurring_task', 'recurring_task__lab')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Backward compatibility aliases
WeeklyTaskViewSet = LearnRecurringTaskViewSet
WeeklyTaskEnrollmentViewSet = LearnRecurringTaskEnrollmentViewSet


