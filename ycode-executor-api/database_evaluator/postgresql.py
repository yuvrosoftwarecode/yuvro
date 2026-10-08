import os
import re
import json
import asyncio
import urllib.parse
from typing import Dict, Any, Optional, Tuple, List
from .base import BaseDatabaseEvaluator
from .table_resolver import (
    EvaluationTableResolver,
    build_isolated_table_name,
    SecurityException,
    sanitize_identifier
)

class PostgreSqlEvaluator(BaseDatabaseEvaluator):
    """
    PostgreSQL Database Evaluator with Per-Evaluation Table Isolation.
    Executes PostgreSQL queries directly on the provided PostgreSQL connection URL,
    isolates tables by evaluation_id, user_id, and lab_id, and evaluates them
    against scoring rules, system validation queries, and expected analytical output.
    """
    name = "postgresql"
    _resolver_cache: Dict[str, EvaluationTableResolver] = {}

    @staticmethod
    def _serialize_val(val: Any) -> Any:
        import datetime
        from decimal import Decimal
        if val is None:
            return None
        if isinstance(val, (datetime.date, datetime.datetime)):
            return str(val)
        if isinstance(val, Decimal):
            return float(val) if not float(val).is_integer() else int(val)
        if isinstance(val, bytes):
            return val.decode("utf-8", errors="replace")
        return val

    @staticmethod
    def normalize_postgres_url(url: str) -> str:
        """
        Normalize and percent-encode special characters in the password of a PostgreSQL connection URL
        (e.g., '/', '#', '$', '@', '*') so that urllib.parse and psycopg2/libpq parse it cleanly.
        """
        if not url:
            return ""
        url = url.strip()
        m = re.match(r"^(postgres(?:ql)?:\/\/(?:[^:]+)):(.*)@([^@]+)$", url)
        if m:
            prefix, raw_pwd, host_rest = m.groups()
            encoded_pwd = urllib.parse.quote(urllib.parse.unquote(raw_pwd), safe="")
            return f"{prefix}:{encoded_pwd}@{host_rest}"
        return url

    def _execute_postgres_sync(self, connection_url: str, query: str) -> Tuple[str, str, int, Optional[Dict[str, Any]]]:
        import psycopg2

        connection_url = self.normalize_postgres_url(connection_url)
        conn = None
        # Attempt primary connection; fallback to alternative port/host if needed
        urls_to_try = [connection_url]
        try:
            parsed = urllib.parse.urlparse(connection_url)
            if parsed.hostname in ("ylabs-db", "localhost", "127.0.0.1"):
                if parsed.hostname == "ylabs-db":
                    # Host fallback when executing from host machine
                    alt_url = connection_url.replace("@ylabs-db:5432", "@localhost:5434").replace("@ylabs-db", "@localhost:5434")
                    urls_to_try.append(alt_url)
                elif parsed.hostname in ("localhost", "127.0.0.1") and parsed.port == 5434:
                    # Container fallback when executing inside docker network
                    alt_url = connection_url.replace("@localhost:5434", "@ylabs-db:5432").replace("@127.0.0.1:5434", "@ylabs-db:5432")
                    urls_to_try.append(alt_url)
        except Exception:
            pass

        last_err = None
        for try_url in urls_to_try:
            try:
                conn = psycopg2.connect(try_url, connect_timeout=15)
                conn.autocommit = True
                break
            except Exception as e:
                last_err = e
                conn = None

        if conn is None:
            return "", f"PostgreSQL Error: {str(last_err)}", 1, None

        try:
            with conn.cursor() as cur:
                cur.execute(query)

                if cur.description:
                    columns = [desc[0] for desc in cur.description]
                    rows = cur.fetchall()

                    if not rows:
                        data = {"columns": columns, "rows": []}
                        return "0 rows returned.", "", 0, data

                    # Format clean tabular output
                    col_widths = [len(str(c)) for c in columns]
                    for row in rows:
                        for idx, val in enumerate(row):
                            col_widths[idx] = max(col_widths[idx], len(str(val if val is not None else "NULL")))

                    header = " | ".join(str(c).ljust(col_widths[idx]) for idx, c in enumerate(columns))
                    separator = "-+-".join("-" * col_widths[idx] for idx in range(len(columns)))

                    row_lines = []
                    row_dicts = []
                    for row in rows:
                        row_line = " | ".join(str(val if val is not None else "NULL").ljust(col_widths[idx]) for idx, val in enumerate(row))
                        row_lines.append(row_line)
                        row_dicts.append(dict(zip(columns, [self._serialize_val(v) for v in row])))

                    out_text = f"{header}\n{separator}\n" + "\n".join(row_lines) + f"\n({len(rows)} row{'s' if len(rows) != 1 else ''})"
                    data = {"columns": columns, "rows": row_dicts}
                    return out_text, "", 0, data
                else:
                    affected = cur.rowcount
                    data = {"columns": [], "rows": [], "affected_rows": affected}
                    if affected >= 0:
                        return f"Query executed successfully. {affected} row(s) affected.", "", 0, data
                    return "Query executed successfully.", "", 0, data
        except Exception as e:
            return "", f"PostgreSQL Error: {str(e)}", 1, None
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

    def _ensure_meta_table(self, connection_url: str):
        """Ensure the internal tracking table _yuvro_evaluation_tables exists in PostgreSQL."""
        meta_ddl = """
        CREATE TABLE IF NOT EXISTS _yuvro_evaluation_tables (
            id BIGSERIAL PRIMARY KEY,
            evaluation_uuid VARCHAR(64) NOT NULL,
            user_uuid VARCHAR(64) NOT NULL,
            lab_uuid VARCHAR(64) NOT NULL,
            logical_table_name VARCHAR(64) NOT NULL,
            physical_table_name VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uniq_eval_pg_table UNIQUE (evaluation_uuid, user_uuid, logical_table_name)
        );
        CREATE INDEX IF NOT EXISTS idx_pg_eval_lookup ON _yuvro_evaluation_tables (evaluation_uuid, user_uuid, lab_uuid);
        """
        self._execute_postgres_sync(connection_url, meta_ddl)

    def _load_registered_tables(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str
    ) -> Dict[str, str]:
        """Fetch existing logical -> physical table mappings from _yuvro_evaluation_tables."""
        try:
            self._ensure_meta_table(connection_url)
            query = f"""
            SELECT logical_table_name, physical_table_name
            FROM _yuvro_evaluation_tables
            WHERE evaluation_uuid = '{evaluation_uuid}'
              AND user_uuid = '{user_uuid}'
              AND lab_uuid = '{lab_uuid}';
            """
            _, _, exit_code, data = self._execute_postgres_sync(connection_url, query)
            table_map = {}
            if exit_code == 0 and data and data.get("rows"):
                for row in data["rows"]:
                    l_name = row.get("logical_table_name")
                    p_name = row.get("physical_table_name")
                    if l_name and p_name:
                        table_map[l_name.lower()] = p_name
            return table_map
        except Exception:
            return {}

    def _find_seed_sql(self, workspace_dir: str) -> Optional[str]:
        """Locate seed.sql within the current workspace directory or its parent tree."""
        if not workspace_dir:
            return None
        ws_path = str(workspace_dir)
        direct = os.path.join(ws_path, "seed.sql")
        if os.path.exists(direct):
            return direct

        # Check subdirectories
        for root, _, files in os.walk(ws_path):
            if "seed.sql" in files:
                return os.path.join(root, "seed.sql")

        # Walk up parent directories (up to 3 levels)
        curr = os.path.abspath(ws_path)
        for _ in range(3):
            parent = os.path.dirname(curr)
            if parent == curr:
                break
            cand = os.path.join(parent, "seed.sql")
            if os.path.exists(cand):
                return cand
            for root, _, files in os.walk(parent):
                if "seed.sql" in files:
                    return os.path.join(root, "seed.sql")
            curr = parent
        return None

    def initialize_evaluation_tables(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str, workspace_dir: str
    ) -> EvaluationTableResolver:
        """
        Ensure isolated PostgreSQL tables are created and seeded for this evaluation attempt.
        Returns an initialized EvaluationTableResolver.
        """
        connection_url = self.normalize_postgres_url(connection_url)
        cache_key = f"{evaluation_uuid}_{user_uuid}_{lab_uuid}"
        if cache_key in self._resolver_cache:
            return self._resolver_cache[cache_key]

        table_map = self._load_registered_tables(connection_url, evaluation_uuid, user_uuid, lab_uuid)
        resolver = EvaluationTableResolver(evaluation_uuid, user_uuid, lab_uuid, table_map, dialect="postgresql")

        # If tables are already registered, physically exist, and contain data, return immediately
        if table_map:
            sample_tbl = list(table_map.values())[0]
            check_q = f'SELECT 1 FROM "{sample_tbl}" LIMIT 1;'
            _, _, exit_c, data = self._execute_postgres_sync(connection_url, check_q)
            if exit_c == 0 and data and data.get("rows"):
                self._resolver_cache[cache_key] = resolver
                return resolver

        # Locate seed.sql to extract and seed tables
        seed_path = self._find_seed_sql(workspace_dir)
        if not seed_path:
            return resolver

        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                seed_content = f.read()
        except Exception:
            return resolver

        # Normalizations if needed
        clean_seed = re.sub(r'PRAGMA\s+[^;]+;', '', seed_content, flags=re.IGNORECASE)

        # Discover logical tables from seed
        logical_tables = resolver.extract_logical_tables_from_seed(clean_seed)
        for t in logical_tables:
            resolver.get_physical_table_name(t)

        # Rewrite seed SQL with isolated physical table names
        rewritten_seed = resolver.rewrite(clean_seed)

        # Execute rewritten seed against PostgreSQL
        out_str, err_str, exit_code, _ = self._execute_postgres_sync(connection_url, rewritten_seed)

        # Record mappings into _yuvro_evaluation_tables
        if exit_code == 0:
            insert_rows = []
            for l_tbl, p_tbl in resolver.logical_to_physical.items():
                insert_rows.append(
                    f"('{evaluation_uuid}', '{user_uuid}', '{lab_uuid}', '{l_tbl}', '{p_tbl}')"
                )
            if insert_rows:
                ins_sql = f"""
                INSERT INTO _yuvro_evaluation_tables
                (evaluation_uuid, user_uuid, lab_uuid, logical_table_name, physical_table_name)
                VALUES {', '.join(insert_rows)}
                ON CONFLICT (evaluation_uuid, user_uuid, logical_table_name) DO NOTHING;
                """
                self._execute_postgres_sync(connection_url, ins_sql)

        self._resolver_cache[cache_key] = resolver
        return resolver

    def cleanup_evaluation_tables(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str
    ) -> Dict[str, Any]:
        """
        Drop isolated physical tables and remove entries from _yuvro_evaluation_tables.
        """
        connection_url = self.normalize_postgres_url(connection_url)
        cache_key = f"{evaluation_uuid}_{user_uuid}_{lab_uuid}"
        self._resolver_cache.pop(cache_key, None)
        table_map = self._load_registered_tables(connection_url, evaluation_uuid, user_uuid, lab_uuid)
        if not table_map:
            return {"status": "success", "dropped_tables": []}

        # Drop each table safely using CASCADE
        dropped = []
        try:
            tbl_names = ", ".join(f'"{p}"' for p in table_map.values())
            drop_stmt = f"DROP TABLE IF EXISTS {tbl_names} CASCADE;"
            self._execute_postgres_sync(connection_url, drop_stmt)
            dropped = list(table_map.values())

            del_stmt = f"""
            DELETE FROM _yuvro_evaluation_tables
            WHERE evaluation_uuid = '{evaluation_uuid}'
              AND user_uuid = '{user_uuid}'
              AND lab_uuid = '{lab_uuid}';
            """
            self._execute_postgres_sync(connection_url, del_stmt)
        except Exception as e:
            return {"status": "partial", "error": str(e), "dropped_tables": dropped}

        return {"status": "success", "dropped_tables": dropped}

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
                    "stderr": "PostgreSQL connection URL is required. Please configure your Database Connection.",
                    "exit_code": 1
                }

            # Check if this query is executed within an evaluation or user-isolated context
            evaluation_id = getattr(body, 'evaluation_id', None)
            user_id = getattr(body, 'user_id', None)
            lab_id = getattr(body, 'lab_id', None)

            is_isolated_eval = bool(evaluation_id and user_id and lab_id)
            resolver: Optional[EvaluationTableResolver] = None

            if is_isolated_eval:
                resolver = await asyncio.to_thread(
                    self.initialize_evaluation_tables,
                    connection_url.strip(),
                    str(evaluation_id),
                    str(user_id),
                    str(lab_id),
                    str(workspace_dir)
                )

                # Check if this is a Schema Explorer query (information_schema.columns)
                is_schema_query = bool("information_schema.columns" in query.lower() or "information_schema.tables" in query.lower())
                if is_schema_query:
                    rewritten_query = resolver.rewrite_schema_query(query) or query
                else:
                    # Validate security boundary
                    try:
                        resolver.validate_sql_security(query)
                    except SecurityException as se:
                        return {
                            "stdout": "",
                            "stderr": f"Security Violation: {str(se)}",
                            "exit_code": 1
                        }
                    # Rewrite candidate query to use isolated tables
                    rewritten_query = resolver.rewrite(query)
            else:
                rewritten_query = query
            
            # Execute on remote PostgreSQL connection URL
            exec_res = await asyncio.to_thread(
                self._execute_postgres_sync, connection_url.strip(), rewritten_query
            )
            out_str, err_str, exit_code = exec_res[0], exec_res[1], exec_res[2]
            data = exec_res[3] if len(exec_res) > 3 else None

            # If this was a schema query and isolated, reverse-map physical table names in output back to logical table names
            if is_isolated_eval and resolver and data and data.get("rows") and "information_schema" in query.lower():
                for row in data["rows"]:
                    table_val = row.get("table") or row.get("TABLE_NAME") or row.get("table_name")
                    if table_val:
                        logical = resolver.get_logical_table_name(str(table_val))
                        if logical:
                            if "table" in row: row["table"] = logical
                            if "TABLE_NAME" in row: row["TABLE_NAME"] = logical
                            if "table_name" in row: row["table_name"] = logical
            
            result = {
                "stdout": out_str,
                "stderr": err_str,
                "exit_code": exit_code,
                "data": data
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
                        "exit_code": exit_code,
                        "data": data
                    }
                )
                result["evaluation"] = eval_res
                
            return result
            
        except asyncio.TimeoutError:
            return {"stdout": "", "stderr": "PostgreSQL query timed out", "exit_code": -1}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}

    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        exit_code = execution_result.get("exit_code", 0)
        user_output = execution_result.get("out_str", "")
        actual_result = execution_result.get("actual_result", "")
        data = execution_result.get("data")
        
        scoring_rules = getattr(body, 'scoring_rules', {}) or {}
        if not isinstance(scoring_rules, dict):
            scoring_rules = {}

        expected_query = (getattr(body, 'expected_query', None) or scoring_rules.get('expected_query') or scoring_rules.get('system_query') or "").strip()
        user_query = (getattr(body, 'query', None) or "").strip()
        expected_output = getattr(body, 'expected_output', None)
        if expected_output is None:
            expected_output = scoring_rules.get('expected_output')
        system_query = getattr(body, 'system_query', None) or scoring_rules.get('system_query')
        expected_result = getattr(body, 'expected_result', None) or scoring_rules.get('expected_result')
        
        def normalize_str(s: str) -> str:
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
        if exit_code != 0 or "error:" in user_output.lower() or "syntax error" in user_output.lower():
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

        # Check primary keywords
        primary_keyword_match = True
        if norm_expected:
            if norm_expected.startswith(("select", "with")):
                if "select" not in norm_user and "with" not in norm_user:
                    primary_keyword_match = False
            else:
                keywords = ["insert", "update", "delete", "create", "drop", "alter"]
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

        is_mutation_task = any(kw in norm_expected for kw in ["insert", "update", "delete", "create", "drop", "alter"])

        # 1. Output Validation
        output_is_valid = False
        if expected_output is None or expected_output == "":
            output_is_valid = True
        else:
            exp_data = expected_output
            if isinstance(expected_output, str):
                try:
                    exp_data = json.loads(expected_output)
                except Exception:
                    exp_data = expected_output.strip()

            # Extract actual rows and columns
            actual_rows: Optional[list] = None
            if data and isinstance(data, dict) and "rows" in data and data["rows"] is not None:
                raw_rows = data["rows"]
                if raw_rows and isinstance(raw_rows[0], dict):
                    actual_rows = raw_rows
                elif raw_rows and isinstance(raw_rows[0], (list, tuple)):
                    cols = data.get("columns", [])
                    actual_rows = [dict(zip(cols, r)) for r in raw_rows]
                elif not raw_rows:
                    actual_rows = []

            # If structured data was not passed, parse tabular output from user_output string
            if actual_rows is None and user_output:
                lines = [l.strip() for l in user_output.strip().splitlines() if l.strip()]
                if len(lines) >= 3 and "-+-" in lines[1] and lines[-1].startswith("(") and lines[-1].endswith(")"):
                    cols = [c.strip() for c in lines[0].split("|")]
                    raw_data_rows = lines[2:-1]
                    actual_rows = []
                    for rline in raw_data_rows:
                        vals = [v.strip() for v in rline.split("|")]
                        actual_rows.append(dict(zip(cols, vals)))

            if isinstance(exp_data, list) and actual_rows is not None:
                if len(exp_data) == len(actual_rows):
                    if len(exp_data) == 0:
                        output_is_valid = True
                    else:
                        all_match = True
                        for i, exp_row in enumerate(exp_data):
                            act_row = actual_rows[i]
                            if isinstance(exp_row, dict):
                                act_row_lower = {k.lower(): v for k, v in act_row.items()}
                                for exp_k, exp_v in exp_row.items():
                                    exp_k_lower = exp_k.lower()
                                    if exp_k_lower not in act_row_lower:
                                        all_match = False
                                        break
                                    act_v = act_row_lower[exp_k_lower]
                                    if exp_v is None:
                                        if act_v is not None and str(act_v).upper() != "NULL":
                                            all_match = False
                                            break
                                        continue
                                    if isinstance(exp_v, (int, float)):
                                        try:
                                            act_float = float(act_v)
                                            exp_float = float(exp_v)
                                            if abs(act_float - exp_float) > 1e-2:
                                                all_match = False
                                                break
                                        except (ValueError, TypeError):
                                            all_match = False
                                            break
                                    else:
                                        if str(act_v).strip().lower() != str(exp_v).strip().lower():
                                            all_match = False
                                            break
                            else:
                                if str(act_row).strip().lower() != str(exp_row).strip().lower():
                                    all_match = False
                                    break
                            if not all_match:
                                break
                        output_is_valid = all_match
                else:
                    output_is_valid = False
            else:
                # Fallback for scalar/text or unstructured comparison
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

        # 2. Query Match & Alternative Formulations
        query_matches = False
        if not is_mutation_task and output_is_valid:
            # For read-only SELECT tasks, if output is accurate, valid alternative formulations pass
            query_matches = True
        elif norm_expected and norm_user:
            if norm_expected in norm_user:
                query_matches = True
            else:
                required_clauses = ["select", "from", "group by", "order by", "having", "join", "where", "over", "partition by", "with"]
                clause_match_count = 0
                total_clauses = 0
                for clause in required_clauses:
                    if clause in norm_expected:
                        total_clauses += 1
                        if clause in norm_user:
                            clause_match_count += 1
                if total_clauses > 0 and (clause_match_count / total_clauses) >= 0.75:
                    query_matches = True

        # 3. System Validation Match
        system_is_valid = False
        if is_mutation_task and system_query and expected_result:
            if actual_result and expected_result.strip().lower() in actual_result.strip().lower():
                system_is_valid = True
        elif not is_mutation_task:
            system_is_valid = output_is_valid

        # 4. Score Calculation
        if not is_mutation_task:
            # Read-only evaluation tasks: full score requires output correctness
            passed = output_is_valid and query_matches
            score_pct = 1.0 if passed else 0.0
            query_matches = passed
            output_is_valid = passed
            system_is_valid = passed
        else:
            # Mutation tasks: standard breakdown
            score_pct = 0.0
            if query_matches:
                score_pct += 0.25
            if output_is_valid:
                score_pct += 0.50
            if system_is_valid:
                score_pct += 0.25
            if query_matches and output_is_valid and system_is_valid:
                score_pct = 1.0
            passed = score_pct >= 1.0

        return {
            "query_matches": query_matches,
            "output_matches": output_is_valid,
            "system_matches": system_is_valid,
            "earned_percentage": score_pct,
            "final_score_pct": score_pct,
            "passed": passed,
            "actual_result": actual_result,
            "expected_result": expected_result
        }

    async def get_system_query_result(self, body: Any, workspace_dir: str) -> str:
        system_query = getattr(body, 'system_query', '')
        if not system_query:
            return ""
            
        connection_url = getattr(body, 'connection_url', None) or getattr(body, 'uri', None)
        if not connection_url or not connection_url.strip():
            return "PostgreSQL connection URL is required for system query validation."

        evaluation_id = getattr(body, 'evaluation_id', None)
        user_id = getattr(body, 'user_id', None)
        lab_id = getattr(body, 'lab_id', None)

        rewritten_system_query = system_query
        if evaluation_id and user_id and lab_id:
            table_map = self._load_registered_tables(connection_url.strip(), str(evaluation_id), str(user_id), str(lab_id))
            resolver = EvaluationTableResolver(str(evaluation_id), str(user_id), str(lab_id), table_map, dialect="postgresql")
            rewritten_system_query = resolver.rewrite(system_query)
            
        exec_res = await asyncio.to_thread(
            self._execute_postgres_sync, connection_url.strip(), rewritten_system_query
        )
        out_str, err_str, exit_code = exec_res[0], exec_res[1], exec_res[2]
        return out_str if exit_code == 0 else err_str
