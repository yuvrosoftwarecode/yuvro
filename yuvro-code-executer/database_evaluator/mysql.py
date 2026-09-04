import os
import re
import json
import asyncio
import urllib.parse
from typing import Dict, Any, Optional, Tuple
from .base import BaseDatabaseEvaluator

class MySqlEvaluator(BaseDatabaseEvaluator):
    """
    MySQL Database Evaluator
    Executes MySQL queries directly on the provided MySQL connection URL
    and evaluates them against scoring rules, system validation queries, and expected analytical output.
    """
    name = "mysql"

    def _execute_mysql_sync(self, connection_url: str, query: str) -> Tuple[str, str, int]:
        import pymysql
        from pymysql.constants import CLIENT

        conn = None
        try:
            url = urllib.parse.urlparse(connection_url)
            database = url.path.lstrip('/') if url.path else None
            # Strip query params from db name if any
            if database and '?' in database:
                database = database.split('?')[0]
            
            username = urllib.parse.unquote(url.username) if url.username else 'root'
            password = urllib.parse.unquote(url.password) if url.password else ''
            hostname = url.hostname or 'localhost'
            port = url.port or 3306

            try:
                conn = pymysql.connect(
                    host=hostname,
                    user=username,
                    password=password,
                    port=port,
                    database=database,
                    autocommit=True,
                    client_flag=CLIENT.MULTI_STATEMENTS | CLIENT.SSL,
                    connect_timeout=10,
                    ssl={'check_hostname': False}
                )
            except Exception:
                conn = pymysql.connect(
                    host=hostname,
                    user=username,
                    password=password,
                    port=port,
                    database=database,
                    autocommit=True,
                    client_flag=CLIENT.MULTI_STATEMENTS,
                    connect_timeout=10
                )
            with conn.cursor() as cur:
                cur.execute(query)

                if cur.description:
                    columns = [desc[0] for desc in cur.description]
                    rows = cur.fetchall()
                    
                    if not rows:
                        return "0 rows returned.", "", 0
                    
                    # Format as clean tabular output
                    col_widths = [len(str(c)) for c in columns]
                    for row in rows:
                        for idx, val in enumerate(row):
                            col_widths[idx] = max(col_widths[idx], len(str(val if val is not None else "NULL")))
                    
                    header = " | ".join(str(c).ljust(col_widths[idx]) for idx, c in enumerate(columns))
                    separator = "-+-".join("-" * col_widths[idx] for idx in range(len(columns)))
                    
                    row_lines = []
                    for row in rows:
                        row_line = " | ".join(str(val if val is not None else "NULL").ljust(col_widths[idx]) for idx, val in enumerate(row))
                        row_lines.append(row_line)
                    
                    out_text = f"{header}\n{separator}\n" + "\n".join(row_lines) + f"\n({len(rows)} row{'s' if len(rows) != 1 else ''})"
                    return out_text, "", 0
                else:
                    affected = cur.rowcount
                    if affected >= 0:
                        return f"Query executed successfully. {affected} row(s) affected.", "", 0
                    return "Query executed successfully.", "", 0
        except Exception as e:
            return "", f"MySQL Error: {str(e)}", 1
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        try:
            task_file = getattr(body, 'task_file', None)
            if task_file:
                file_path = os.path.join(str(workspace_dir), task_file)
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        body.query = f.read()
                else:
                    return {"stdout": "", "stderr": f"Task file {task_file} not found", "exit_code": -1}
            
            query = getattr(body, 'query', '') or ''
            connection_url = getattr(body, 'connection_url', None) or getattr(body, 'uri', None)
            
            if not connection_url or not connection_url.strip():
                return {
                    "stdout": "",
                    "stderr": "MySQL connection URL is required. Please configure your Database Connection.",
                    "exit_code": 1
                }
            
            # Execute directly on remote MySQL connection URL
            out_str, err_str, exit_code = await asyncio.to_thread(
                self._execute_mysql_sync, connection_url.strip(), query
            )
            
            result = {
                "stdout": out_str,
                "stderr": err_str,
                "exit_code": exit_code
            }
            
            if getattr(body, 'scoring_rules', None) is not None or getattr(body, 'expected_query', None) or getattr(body, 'expected_output', None) or getattr(body, 'system_query', None):
                actual_result = err_str if exit_code != 0 else out_str
                
                if getattr(body, 'system_query', None) and exit_code == 0:
                    actual_result = await self.get_system_query_result(body, workspace_dir)
                        
                eval_res = self.evaluate(
                    body=body,
                    execution_result={
                        "out_str": err_str if exit_code != 0 else out_str,
                        "actual_result": actual_result,
                        "exit_code": exit_code
                    }
                )
                result["evaluation"] = eval_res
                
            return result
            
        except asyncio.TimeoutError:
            return {"stdout": "", "stderr": "MySQL query timed out", "exit_code": -1}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}

    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        exit_code = execution_result.get("exit_code", 0)
        user_output = execution_result.get("out_str", "")
        actual_result = execution_result.get("actual_result", "")
        
        expected_query = (getattr(body, 'expected_query', None) or "").strip()
        user_query = (getattr(body, 'query', None) or "").strip()
        expected_output = getattr(body, 'expected_output', None)
        system_query = getattr(body, 'system_query', None)
        expected_result = getattr(body, 'expected_result', None)
        
        def normalize_str(s: str) -> str:
            s = re.sub(r'--.*', '', s)
            s = re.sub(r'#.*', '', s)
            s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL)
            s = re.sub(r'\s+', ' ', s).strip().lower()
            s = re.sub(r'\s*\(\s*', '(', s)
            s = re.sub(r'\s*\)\s*', ')', s)
            s = re.sub(r'\s*,\s*', ',', s)
            s = re.sub(r'\s*;\s*', ';', s)
            return s.rstrip(';')

        norm_expected = normalize_str(expected_query)
        norm_user = normalize_str(user_query)
        
        # 1. Check Query Match
        query_matches = False
        if norm_expected and norm_user:
            required_clauses = ["select", "from", "group by", "order by", "having", "join", "where", "over", "partition by"]
            clause_match_count = 0
            total_clauses = 0
            for clause in required_clauses:
                if clause in norm_expected:
                    total_clauses += 1
                    if clause in norm_user:
                        clause_match_count += 1
            
            if total_clauses > 0 and (clause_match_count / total_clauses) >= 0.75:
                query_matches = True
            elif norm_expected in norm_user:
                query_matches = True

        # Check primary keywords
        primary_keyword_match = True
        if norm_expected:
            keywords = ["select", "insert", "update", "delete", "create", "drop", "alter", "with"]
            for kw in keywords:
                if norm_expected.startswith(kw):
                    if kw not in norm_user:
                        primary_keyword_match = False
                    break

        if not primary_keyword_match:
            query_matches = False

        # 2. Check Output Match
        output_is_valid = False
        if exit_code == 0 and "error:" not in user_output.lower():
            if expected_output is None or expected_output == "":
                output_is_valid = True
            else:
                exp_data = expected_output
                if isinstance(expected_output, str):
                    try:
                        exp_data = json.loads(expected_output)
                    except Exception:
                        exp_data = expected_output.strip()

                user_norm = " ".join(user_output.lower().split())
                if isinstance(exp_data, list):
                    if len(exp_data) == 0:
                        output_is_valid = True
                    else:
                        all_rows_matched = True
                        for item in exp_data:
                            if isinstance(item, dict):
                                for val in item.values():
                                    if val is None:
                                        continue
                                    if isinstance(val, (int, float)):
                                        val_str = str(val)
                                        val_int_str = str(int(val)) if float(val).is_integer() else str(val)
                                        if val_str.lower() not in user_norm and val_int_str.lower() not in user_norm:
                                            all_rows_matched = False
                                            break
                                    else:
                                        if str(val).strip().lower() not in user_norm:
                                            all_rows_matched = False
                                            break
                            else:
                                if str(item).strip().lower() not in user_norm:
                                    all_rows_matched = False
                                    break
                            if not all_rows_matched:
                                break
                        output_is_valid = all_rows_matched
                elif isinstance(exp_data, dict):
                    all_fields_matched = True
                    for val in exp_data.values():
                        if val is None:
                            continue
                        if isinstance(val, (int, float)):
                            val_str = str(val)
                            val_int_str = str(int(val)) if float(val).is_integer() else str(val)
                            if val_str.lower() not in user_norm and val_int_str.lower() not in user_norm:
                                all_fields_matched = False
                                break
                        else:
                            if str(val).strip().lower() not in user_norm:
                                all_fields_matched = False
                                break
                    output_is_valid = all_fields_matched
                else:
                    exp_str = str(exp_data).strip().lower()
                    output_is_valid = exp_str in user_norm

        # 3. System Validation Match
        system_is_valid = False
        is_mutation_task = any(kw in norm_expected for kw in ["insert", "update", "delete", "create", "drop", "alter"])
        if exit_code == 0:
            if is_mutation_task and system_query and expected_result:
                if actual_result and expected_result.strip().lower() in actual_result.strip().lower():
                    system_is_valid = True
            elif not is_mutation_task:
                system_is_valid = output_is_valid

        # Calculate final percentage
        if exit_code != 0:
            score_pct = 0.0
            query_matches = False
            output_is_valid = False
            system_is_valid = False
        else:
            score_pct = 0.0
            if query_matches:
                score_pct += 0.25
            if output_is_valid:
                score_pct += 0.50
            if system_is_valid:
                score_pct += 0.25
            
            if query_matches and output_is_valid and system_is_valid:
                score_pct = 1.0

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
        system_query = getattr(body, 'system_query', '')
        if not system_query:
            return ""
            
        connection_url = getattr(body, 'connection_url', None) or getattr(body, 'uri', None)
        if not connection_url or not connection_url.strip():
            return "MySQL connection URL is required for system query validation."
            
        out_str, err_str, exit_code = await asyncio.to_thread(
            self._execute_mysql_sync, connection_url.strip(), system_query
        )
        return out_str if exit_code == 0 else err_str
