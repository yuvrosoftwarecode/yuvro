import os
import re
import asyncio
import tempfile
from typing import Dict, Any, Optional
from .base import BaseDatabaseEvaluator

class SqliteEvaluator(BaseDatabaseEvaluator):
    name = "sqlite"

    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        
        try:
            task_file = getattr(body, 'task_file', None)
            if task_file:
                file_path = os.path.join(str(workspace_dir), task_file)
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        body.query = f.read()
                else:
                    return {"stdout": "", "stderr": f"Task file {task_file} not found", "exit_code": -1}
            
            query = getattr(body, 'query', '') or ''
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                f.write(query)
                temp_path = f.name
                
            proc = await asyncio.create_subprocess_shell(
                f'sqlite3 "{body.db_file}" < "{temp_path}"',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir)
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            os.unlink(temp_path)
            
            out_str = stdout.decode(errors="replace")
            err_str = stderr.decode(errors="replace")
            exit_code = proc.returncode
            
            result = {
                "stdout": out_str,
                "stderr": err_str,
                "exit_code": exit_code
            }
            
            if getattr(body, 'scoring_rules', None) is not None or getattr(body, 'expected_query', None) or getattr(body, 'expected_output', None) or getattr(body, 'system_query', None):
                actual_result = err_str if exit_code != 0 else out_str
                
                system_result = ""
                if getattr(body, 'system_query', None):
                    system_result = await self.get_system_query_result(body, workspace_dir)
                        
                eval_res = self.evaluate(
                    body=body,
                    execution_result={
                        "out_str": err_str if exit_code != 0 else out_str,
                        "actual_result": actual_result,
                        "system_result": system_result
                    }
                )
                result["evaluation"] = eval_res
                
            return result
            
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except:
                pass
            return {"stdout": "", "stderr": "Query timed out", "exit_code": -1}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}

    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        scoring_rules = getattr(body, 'scoring_rules', {}) or {}
        
        expected_query = (getattr(body, 'expected_query', None) or "").strip()
        user_query = (getattr(body, 'query', None) or "").strip()
        user_output = execution_result.get("out_str", "")
        system_result = execution_result.get("system_result", "")
        actual_result = execution_result.get("actual_result", "")
        expected_output = getattr(body, 'expected_output', None)
        system_query = getattr(body, 'system_query', None) or ""
        expected_result = getattr(body, 'expected_result', None) or ""
        
        def normalize_str(s):
            s = re.sub(r'--.*', '', s)
            s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL)
            s = re.sub(r'\s+', ' ', s).strip().lower()
            s = re.sub(r'\s*\(\s*', '(', s)
            s = re.sub(r'\s*\)\s*', ')', s)
            s = re.sub(r'\s*,\s*', ',', s)
            s = re.sub(r'\s*;\s*', ';', s)
            return s.rstrip(';')

        norm_expected = normalize_str(expected_query)
        norm_user = normalize_str(user_query)
        
        # Check execution errors
        if "Error:" in user_output or "Parse error" in user_output or re.search(r"exit code [^0]", user_output, re.IGNORECASE) or "Traceback" in user_output:
            return {
                "query_matches": False,
                "output_matches": False,
                "system_matches": False,
                "earned_percentage": 0.0,
                "final_score_pct": 0.0,
                "passed": False,
                "actual_result": actual_result,
                "expected_result": expected_result
            }

        # Primary keyword check
        primary_keyword_match = True
        if norm_expected:
            keywords = ["select", "insert", "update", "delete", "create", "drop", "pragma", "with", "alter"]
            for kw in keywords:
                if norm_expected.startswith(kw):
                    if kw not in norm_user:
                        primary_keyword_match = False
                    break

        if not primary_keyword_match:
            return {
                "query_matches": False,
                "output_matches": False,
                "system_matches": False,
                "earned_percentage": 0.0,
                "final_score_pct": 0.0,
                "passed": False,
                "actual_result": actual_result,
                "expected_result": expected_result
            }

        # Query Matching (exact match or clause-based match)
        query_matches = False
        if norm_expected and norm_user:
            if norm_expected in norm_user:
                query_matches = True
            else:
                required_clauses = ["select", "from", "group by", "order by", "having", "join", "where", "with", "limit"]
                clause_match_count = 0
                total_clauses = 0
                for clause in required_clauses:
                    if clause in norm_expected:
                        total_clauses += 1
                        if clause in norm_user:
                            clause_match_count += 1
                if total_clauses > 0 and (clause_match_count / total_clauses) >= 0.70:
                    query_matches = True

        # Determine if this is a SELECT (query) task or a state-modifying task
        is_select = norm_user.startswith("select") or norm_user.startswith("with") or norm_expected.startswith("select") or norm_expected.startswith("with")

        if is_select:
            result_matches = False
            if expected_result:
                if expected_result.strip().lower() in user_output.lower():
                    result_matches = True
            elif expected_output:
                if str(expected_output).strip() != "":
                    try:
                        if re.search(str(expected_output), user_output, re.IGNORECASE) or str(expected_output).strip().lower() in user_output.lower():
                            result_matches = True
                    except re.error:
                        if str(expected_output).strip().lower() in user_output.lower():
                            result_matches = True
            else:
                result_matches = query_matches or (user_output.strip() != "")

            score_pct = 1.0 if result_matches else 0.0
            passed = result_matches
            output_matches = result_matches
            system_matches = result_matches
            if result_matches:
                query_matches = True
        else:
            # State-modifying query (INSERT, UPDATE, DELETE, etc.)
            system_matches = False
            if system_query and expected_result:
                target_check = system_result if system_result else actual_result
                if target_check and expected_result.strip().lower() in str(target_check).strip().lower():
                    system_matches = True
            elif not system_query:
                system_matches = True

            score_pct = 1.0 if system_matches else 0.0
            passed = system_matches
            output_matches = system_matches

        return {
            "query_matches": query_matches,
            "output_matches": output_matches,
            "system_matches": system_matches,
            "earned_percentage": score_pct,
            "final_score_pct": score_pct,
            "passed": passed,
            "actual_result": actual_result,
            "expected_result": expected_result
        }

    async def get_system_query_result(self, body: Any, workspace_dir: str) -> str:
        import os, tempfile, asyncio
        db_file = getattr(body, 'db_file', 'lab.db')
        system_query = getattr(body, 'system_query', '')
        
        if not system_query:
            return ""
            
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                f.write(system_query)
                temp_path = f.name
            
            proc = await asyncio.create_subprocess_shell(
                f'sqlite3 "{db_file}" < "{temp_path}"',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir)
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            os.unlink(temp_path)
            
            if proc.returncode == 0:
                return stdout.decode(errors="replace").strip()
            else:
                return stderr.decode(errors="replace").strip()
        except Exception as e:
            return str(e)
