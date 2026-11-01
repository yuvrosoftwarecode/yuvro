import json
import re
import shutil
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from authentication.permissions import IsAdminUser
from .models import (
    Lab, LabStatus, LabSprint, LabSprintTicket,
    UserLabEnrollment, UserLabSprintTicketSubmission,
    TicketProgressStatus, UserLabActivity, SystemDesign, LabType
)
from .serializers import (
    LabSerializer,
    LabSprintSerializer,
    LabSprintTicketSerializer,
    UserLabEnrollmentSerializer,
    UserLabSprintTicketSubmissionSerializer,
    SystemDesignSerializer,
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

        is_passed = (float(eval_percentage) >= 70.0) if is_submit else False
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
        return qs

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
        'rank': rank
    })


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

