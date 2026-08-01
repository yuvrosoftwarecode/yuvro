import os
import re
import asyncio
import tempfile
from typing import Dict, Any, Optional
from .base import BaseDatabaseEvaluator

class MongodbEvaluator(BaseDatabaseEvaluator):
    name = "mongodb"
    
    def _build_mongosh_cmd(self, db_file: str, temp_path: str) -> str:
        # Disable telemetry and prompts just in case
        return f'mongosh "{db_file}" --quiet --file "{temp_path}"'

    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        try:
            db_uri = getattr(body, 'db_file', getattr(body, 'db_uri', ''))
            cmd_args = ["mongosh", db_uri, "--quiet", "--eval", body.query]
            
            proc = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir)
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            
            out_str = stdout.decode(errors="replace").strip()
            err_str = stderr.decode(errors="replace").strip()
            exit_code = proc.returncode
            
            # mongosh sometimes outputs to stderr for deprecation warnings, but actual errors have specific keywords
            if exit_code != 0 or "MongoServerError" in out_str or "SyntaxError" in out_str or "TypeError" in out_str:
                exit_code = 1 if exit_code == 0 else exit_code
            
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
            # For mongo, strip comments
            s = re.sub(r'//.*', '', s)
            s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL)
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
        
        if "MongoServerError" in user_output or "SyntaxError" in user_output or "TypeError" in user_output or "ReferenceError" in user_output:
            output_matches = False

        primary_keyword_match = True
        if norm_expected:
            keywords = ["db.", "use", "show", "insert", "update", "delete", "create", "drop", "aggregate", "find"]
            for kw in keywords:
                if norm_expected.startswith(kw):
                    if kw not in norm_user:
                        primary_keyword_match = False
                    break
        
        score_pct = 0.0
        
        if query_matches:
            score_pct += 0.25
            
        system_is_valid = False
        if system_query:
            if expected_result:
                if actual_result is not None and expected_result.strip() in actual_result.strip():
                    system_is_valid = True
                    score_pct += 0.50
            else:
                is_error = False
                if not actual_result or actual_result.strip() == "":
                    is_error = True
                elif actual_result:
                    act_up = actual_result.upper()
                    if "ERROR" in act_up or "EXCEPTION" in act_up:
                        is_error = True
                if not is_error:
                    system_is_valid = True
                    score_pct += 0.50
            
        output_is_valid = output_matches
        if expected_output is not None and output_is_valid:
            if expected_output == "":
                # mongosh returns JSON for mutations (e.g. { acknowledged: true, ... })
                # Ignore this output when checking for empty string expected output.
                stripped_out = re.sub(r'\{.*?acknowledged:.*?\}', '', user_output, flags=re.IGNORECASE|re.DOTALL).strip()
                if stripped_out != "" or (not query_matches and not system_is_valid):
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
        import asyncio
        db_uri = getattr(body, 'db_file', getattr(body, 'db_uri', ''))
        system_query = getattr(body, 'system_query', '')
        
        if not system_query:
            return ""
            
        try:
            cmd_args = ["mongosh", db_uri, "--quiet", "--eval", system_query]
            proc = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir)
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            
            out_str = stdout.decode(errors="replace").strip()
            err_str = stderr.decode(errors="replace").strip()
            return err_str if proc.returncode != 0 else out_str
        except Exception as e:
            return str(e)
