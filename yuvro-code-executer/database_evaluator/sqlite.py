import os
import re
import asyncio
import tempfile
from typing import Dict, Any, Optional
from .base import BaseDatabaseEvaluator

class SqliteEvaluator(BaseDatabaseEvaluator):
    name = "sqlite"

    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        """
        Execute a raw SQLite query inside the sprint's workspace.
        """
        import tempfile
        
        try:
            # Write query to temp file to prevent escaping issues
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                f.write(body.query)
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
                    try:
                        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
                            f.write(body.system_query)
                            temp_path2 = f.name
                        
                        sys_proc = await asyncio.create_subprocess_shell(
                            f'sqlite3 "{body.db_file}" < "{temp_path2}"',
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=str(workspace_dir)
                        )
                        s_out, s_err = await asyncio.wait_for(sys_proc.communicate(), timeout=10.0)
                        os.unlink(temp_path2)
                        actual_result = s_out.decode(errors="replace").strip() if sys_proc.returncode == 0 else s_err.decode(errors="replace").strip()
                    except Exception as e:
                        actual_result = str(e)
                        
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
        
        # Check for obvious errors
        if "Error:" in user_output or "Parse error" in user_output or re.search(r"exit code [^0]", user_output) or "Traceback" in user_output:
            output_matches = False

        # If there is a system_query and expected_result, evaluate using that
        if system_query and expected_result:
            if not actual_result or expected_result.strip() not in actual_result.strip():
                output_matches = False
        elif expected_output and output_matches:
            try:
                if not re.search(expected_output, user_output, re.IGNORECASE) and expected_output not in user_output:
                    output_matches = False
            except re.error:
                if expected_output not in user_output:
                    output_matches = False

        earned_percentage = 0.0
        if query_matches and output_matches:
            earned_percentage = 1.0
        elif query_matches or output_matches:
            earned_percentage = 0.5
            
        final_score_pct = logic_score_weight * earned_percentage
        
        return {
            "query_matches": query_matches,
            "output_matches": output_matches,
            "earned_percentage": earned_percentage,
            "final_score_pct": final_score_pct,
            "actual_result": actual_result,
            "expected_result": expected_result
        }
