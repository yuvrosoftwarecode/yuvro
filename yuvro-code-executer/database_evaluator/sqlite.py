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
                
                if getattr(body, 'system_query', None):
                    actual_result = await self.get_system_query_result(body, workspace_dir)
                        
                eval_res = self.evaluate(
                    body=body,
                    execution_result={
                        "out_str": err_str if exit_code != 0 else out_str,
                        "actual_result": actual_result
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
        logic_score_weight = scoring_rules.get("logic_score", 100) / 100.0
        
        expected_query = getattr(body, 'expected_query', None)
        expected_query = (expected_query or "").strip()
        user_query = getattr(body, 'query', None)
        user_query = (user_query or "").strip()
        
        def normalize_str(s):
            s = re.sub(r'--.*', '', s)
            s = re.sub(r'\s+', ' ', s).strip().lower()
            s = re.sub(r'\s*\(\s*', '(', s)
            s = re.sub(r'\s*\)\s*', ')', s)
            s = re.sub(r'\s*,\s*', ',', s)
            s = re.sub(r'\s*;\s*', ';', s)
            s = s.rstrip(';')
            return s

        norm_expected = normalize_str(expected_query)
        norm_user = normalize_str(user_query)
        
        query_matches = (norm_expected in norm_user) if norm_expected else False
        
        output_matches = True
        user_output = execution_result.get("out_str", "")
        actual_result = execution_result.get("actual_result")
        
        expected_output = getattr(body, 'expected_output', None)
        system_query = getattr(body, 'system_query', None)
        expected_result = getattr(body, 'expected_result', None)
        
        if "Error:" in user_output or "Parse error" in user_output or re.search(r"exit code [^0]", user_output) or "Traceback" in user_output:
            output_matches = False

        primary_keyword_match = True
        if norm_expected:
            keywords = ["select", "insert", "update", "delete", "create", "drop", "pragma", "with", "alter"]
            for kw in keywords:
                if norm_expected.startswith(kw):
                    if kw not in norm_user:
                        primary_keyword_match = False
                    break
        
        score_pct = 0.0
        
        if query_matches:
            score_pct += 0.25
            
        system_is_valid = False
        if system_query and expected_result:
            if actual_result and expected_result.strip() in actual_result.strip():
                system_is_valid = True
                score_pct += 0.50
        elif not system_query:
            pass
            
        output_is_valid = output_matches
        if expected_output is not None and output_is_valid:
            if expected_output == "":
                if user_output.strip() != "" or (not query_matches and not system_is_valid):
                    output_is_valid = False
            else:
                try:
                    if not re.search(expected_output, user_output, re.IGNORECASE) and expected_output not in user_output:
                        output_is_valid = False
                except re.error:
                    if expected_output not in user_output:
                        output_is_valid = False
                        
        if output_is_valid:
            score_pct += 0.25
            
        if not system_query and output_is_valid:
            score_pct += 0.50
            system_is_valid = True
                
        if query_matches and system_is_valid and not output_is_valid:
            output_is_valid = True
            score_pct = 1.0
            
        if not primary_keyword_match:
            score_pct = 0.0
            output_is_valid = False
            system_is_valid = False
                
        return {
            "query_matches": query_matches,
            "output_matches": output_is_valid,
            "system_matches": system_is_valid,
            "earned_percentage": score_pct,
            "final_score_pct": score_pct,
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
