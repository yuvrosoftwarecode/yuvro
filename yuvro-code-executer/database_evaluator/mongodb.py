import os
import re
import json
import asyncio
import copy
from typing import Dict, Any, Optional, Tuple, List, Union
from .base import BaseDatabaseEvaluator
from .table_resolver import (
    EvaluationCollectionResolver,
    SecurityException,
    sanitize_identifier
)

class MongoDbEvaluator(BaseDatabaseEvaluator):
    """
    MongoDB Database Evaluator with PyMongo execution, Per-Evaluation Collection Isolation,
    Structured/Shell Query Parsing, BSON Normalization, and Result Validation.
    """
    name = "mongodb"
    _resolver_cache: Dict[str, EvaluationCollectionResolver] = {}
    _client_cache: Dict[str, Any] = {}

    @classmethod
    def get_mongo_client(cls, connection_url: str):
        """Get or initialize cached PyMongo MongoClient."""
        if connection_url in cls._client_cache:
            return cls._client_cache[connection_url]
        import pymongo
        client = pymongo.MongoClient(
            connection_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        cls._client_cache[connection_url] = client
        return client

    @classmethod
    def get_database(cls, connection_url: str):
        """Get the target database from a connection URL, supporting MongoDB Atlas SRV URIs."""
        client = cls.get_mongo_client(connection_url)
        try:
            db = client.get_default_database()
            if db is not None:
                return db
        except Exception:
            pass

        import urllib.parse
        try:
            from pymongo.uri_parser import parse_uri
            parsed = parse_uri(connection_url, warn=False)
            db_name = parsed.get("database")
            if db_name:
                return client[db_name]
        except Exception:
            pass

        try:
            u = urllib.parse.urlparse(connection_url)
            path = u.path.lstrip("/")
            if path:
                db_name = path.split("?")[0].strip()
                if db_name:
                    return client[db_name]
        except Exception:
            pass

        return client["hospital_analytics"]

    @staticmethod
    def normalize_bson(val: Any) -> Any:
        """
        Normalize MongoDB/BSON values into deterministic, JSON-compatible values.
        Handles ObjectId, datetime, date, Decimal128, Decimal, float, int, list, dict.
        """
        import datetime
        from decimal import Decimal
        from bson import ObjectId, Decimal128

        if val is None:
            return None
        if isinstance(val, ObjectId):
            return str(val)
        if isinstance(val, (datetime.datetime, datetime.date)):
            return str(val.isoformat())
        if isinstance(val, Decimal128):
            d = val.to_decimal()
            f = float(d)
            return int(f) if f.is_integer() else round(f, 4)
        if isinstance(val, Decimal):
            f = float(val)
            return int(f) if f.is_integer() else round(f, 4)
        if isinstance(val, float):
            return int(val) if val.is_integer() else round(val, 4)
        if isinstance(val, dict):
            return {str(k): MongoDbEvaluator.normalize_bson(v) for k, v in val.items()}
        if isinstance(val, (list, tuple)):
            return [MongoDbEvaluator.normalize_bson(x) for x in val]
        return val

    @staticmethod
    def _js_to_py_val(js_code: str) -> Any:
        """Parse JavaScript object/array literals safely into Python dicts/lists/values."""
        import ast
        js_code = js_code.strip()
        js_code = re.sub(r'//.*', '', js_code)
        js_code = re.sub(r'/\*.*?\*/', '', js_code, flags=re.DOTALL).strip()

        token_re = re.compile(
            r"""
              (?P<STR_DOUBLE>"(?:\\.|[^"\\])*")
            | (?P<STR_SINGLE>'(?:\\.|[^'\\])*')
            | (?P<WORD>[a-zA-Z_$][a-zA-Z0-9_$]*)
            | (?P<NUM>[0-9]+(?:\.[0-9]+)?)
            | (?P<PUNCT>[\{\}\[\]\:\,\.\-\+\(\)])
            | (?P<SPACE>\s+)
            """,
            re.VERBOSE
        )
        tokens = []
        for m in token_re.finditer(js_code):
            tok_type = m.lastgroup
            val = m.group()
            if tok_type == "SPACE":
                tokens.append(val)
            elif tok_type == "STR_SINGLE":
                content = val[1:-1].replace('"', '\\"').replace(r"\'", "'")
                tokens.append(f'"{content}"')
            elif tok_type == "STR_DOUBLE":
                tokens.append(val)
            elif tok_type == "WORD":
                if val == "true":
                    tokens.append("True")
                elif val == "false":
                    tokens.append("False")
                elif val == "null":
                    tokens.append("None")
                else:
                    tokens.append(f"__ID__{val}__")
            else:
                tokens.append(val)

        res_str = "".join(tokens)
        res_str = re.sub(r'__ID__([a-zA-Z0-9_$]+)__\s*:', r'"\1":', res_str)
        res_str = re.sub(r'__ID__([a-zA-Z0-9_$]+)__', r'"\1"', res_str)
        return ast.literal_eval(res_str)

    @classmethod
    def parse_mongo_query(cls, raw_query: str) -> Dict[str, Any]:
        """
        Parse student's MongoDB submission into structured query representation.
        Accepts:
        1. JSON / JS object:
           {
             "collection": "patients",
             "operation": "find",
             "filter": { ... },
             "projection": { ... },
             "sort": { ... },
             "limit": 10
           }
        2. Shell syntax:
           db.patients.find({ city: 'Hyderabad' }, { _id: 0 }).sort({ age: -1 }).limit(10)
           db.appointments.aggregate([ { $match: { ... } }, { $group: { ... } } ])
        """
        s = raw_query.strip().rstrip(";")
        s = re.sub(r'//.*', '', s)
        s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL).strip()

        if not s:
            raise ValueError("Query string is empty.")

        # Check for JSON/structured object
        if s.startswith("{") and ("operation" in s or "collection" in s):
            data = cls._js_to_py_val(s)
            if not isinstance(data, dict):
                raise ValueError("Structured query must be a JSON object.")
            if "collection" not in data:
                raise ValueError("Structured query must specify 'collection'.")
            if "operation" not in data:
                raise ValueError("Structured query must specify 'operation'.")
            return data

        # Check for show collections
        if s.lower() in ("show collections", "show dbs", "show databases"):
            return {"operation": "show_collections", "collection": ""}

        # Shell syntax: db.<collection>.<method>(...)
        m = re.match(r"^db\.([a-zA-Z0-9_]+)\.", s)
        if not m:
            raise ValueError(
                f"Invalid MongoDB query format. Must start with db.<collection> or structured JSON. Received: {s[:60]}"
            )

        collection = m.group(1)
        rest = s[m.end():]

        # Tokenize method calls
        calls: List[Tuple[str, str]] = []
        idx = 0
        n = len(rest)
        while idx < n:
            m_name = re.match(r"([a-zA-Z0-9_$]+)\s*\(", rest[idx:])
            if not m_name:
                break
            fn_name = m_name.group(1)
            start_paren = idx + m_name.end() - 1
            paren_depth = 0
            in_single = False
            in_double = False
            escape = False
            end_paren = -1
            for j in range(start_paren, n):
                ch = rest[j]
                if escape:
                    escape = False
                    continue
                if ch == "\\":
                    escape = True
                    continue
                if ch == "'" and not in_double:
                    in_single = not in_single
                elif ch == '"' and not in_single:
                    in_double = not in_double
                elif not in_single and not in_double:
                    if ch == "(":
                        paren_depth += 1
                    elif ch == ")":
                        paren_depth -= 1
                        if paren_depth == 0:
                            end_paren = j
                            break
            if end_paren == -1:
                raise ValueError(f"Mismatched parentheses in query: {rest[idx:]}")
            raw_args = rest[start_paren + 1:end_paren].strip()
            calls.append((fn_name, raw_args))
            idx = end_paren + 1
            if idx < n and rest[idx] == ".":
                idx += 1

        if not calls:
            raise ValueError(f"No operations specified after db.{collection}.")

        main_op, main_args = calls[0]
        parsed: Dict[str, Any] = {"collection": collection, "operation": main_op}

        if main_op == "find":
            c_args: List[str] = []
            if main_args:
                curr: List[str] = []
                depth_brace = 0
                depth_bracket = 0
                in_s = False
                in_d = False
                esc = False
                for c in main_args:
                    if esc:
                        esc = False
                        curr.append(c)
                        continue
                    if c == "\\":
                        esc = True
                        curr.append(c)
                        continue
                    if c == "'" and not in_d:
                        in_s = not in_s
                    elif c == '"' and not in_s:
                        in_d = not in_d
                    elif not in_s and not in_d:
                        if c in "{(":
                            depth_brace += 1
                        elif c in "})":
                            depth_brace -= 1
                        elif c == "[":
                            depth_bracket += 1
                        elif c == "]":
                            depth_bracket -= 1
                        elif c == "," and depth_brace == 0 and depth_bracket == 0:
                            c_args.append("".join(curr).strip())
                            curr = []
                            continue
                    curr.append(c)
                if curr:
                    c_args.append("".join(curr).strip())

                if len(c_args) >= 1 and c_args[0]:
                    parsed["filter"] = cls._js_to_py_val(c_args[0])
                else:
                    parsed["filter"] = {}
                if len(c_args) >= 2 and c_args[1]:
                    parsed["projection"] = cls._js_to_py_val(c_args[1])
            else:
                parsed["filter"] = {}

            # Process chained calls
            for fn_name, fn_arg in calls[1:]:
                if fn_name == "sort":
                    parsed["sort"] = cls._js_to_py_val(fn_arg)
                elif fn_name == "limit":
                    parsed["limit"] = int(fn_arg.strip())
                elif fn_name == "skip":
                    parsed["skip"] = int(fn_arg.strip())
                elif fn_name == "project":
                    parsed["projection"] = cls._js_to_py_val(fn_arg)
                elif fn_name in ("toArray", "pretty"):
                    pass
                else:
                    raise ValueError(f"Unsupported find cursor chain '.{fn_name}()'.")

        elif main_op == "aggregate":
            if not main_args:
                parsed["pipeline"] = []
            else:
                parsed["pipeline"] = cls._js_to_py_val(main_args)
            for fn_name, _ in calls[1:]:
                if fn_name not in ("toArray", "pretty"):
                    raise ValueError(f"Unsupported aggregate cursor chain '.{fn_name}()'.")
        else:
            raise ValueError(f"Unsupported operation '{main_op}'. Supported operations: find, aggregate")

        return parsed

    @staticmethod
    def _find_seed_file(workspace_dir: str) -> Optional[str]:
        """Locate seed.json in workspace or parent directories."""
        ws_path = str(workspace_dir)
        direct = os.path.join(ws_path, "seed.json")
        if os.path.exists(direct):
            return direct

        for root, _, files in os.walk(ws_path):
            if "seed.json" in files:
                return os.path.join(root, "seed.json")

        curr = os.path.abspath(ws_path)
        for _ in range(4):
            parent = os.path.dirname(curr)
            if parent == curr:
                break
            cand = os.path.join(parent, "seed.json")
            if os.path.exists(cand):
                return cand
            for root, _, files in os.walk(parent):
                if "seed.json" in files:
                    return os.path.join(root, "seed.json")
            curr = parent

        # Fallback to packaged seed_hospital.json in database_evaluator directory
        bundled = os.path.join(os.path.dirname(__file__), "seed_hospital.json")
        if os.path.exists(bundled):
            return bundled

        return None

    def _load_registered_collections(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str
    ) -> Dict[str, str]:
        """Query MongoDB registry collection _yuvro_evaluation_collections."""
        try:
            db = self.get_database(connection_url)
            reg = db["_yuvro_evaluation_collections"]
            docs = reg.find({
                "evaluation_uuid": str(evaluation_uuid),
                "user_uuid": str(user_uuid),
                "lab_uuid": str(lab_uuid)
            })
            mapping = {}
            for d in docs:
                mapping[d["logical_collection_name"]] = d["physical_collection_name"]
            return mapping
        except Exception:
            return {}

    def initialize_evaluation_collections(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str, workspace_dir: str
    ) -> EvaluationCollectionResolver:
        """
        Ensure isolated collections are created and seeded for this evaluation attempt.
        Stores mapping in _yuvro_evaluation_collections.
        Returns an initialized EvaluationCollectionResolver.
        """
        cache_key = f"{evaluation_uuid}_{user_uuid}_{lab_uuid}"
        if cache_key in self._resolver_cache:
            return self._resolver_cache[cache_key]

        col_map = self._load_registered_collections(connection_url, evaluation_uuid, user_uuid, lab_uuid)
        resolver = EvaluationCollectionResolver(evaluation_uuid, user_uuid, lab_uuid, col_map)
        db = self.get_database(connection_url)

        # Check if already seeded and non-empty
        if col_map:
            sample_col = list(col_map.values())[0]
            if sample_col in db.list_collection_names() and db[sample_col].count_documents({}) > 0:
                self._resolver_cache[cache_key] = resolver
                return resolver

        seed_path = self._find_seed_file(workspace_dir)
        if not seed_path:
            return resolver

        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                seed_data = json.load(f)
        except Exception:
            return resolver

        collections_data = seed_data.get("collections", {})
        if not collections_data and isinstance(seed_data, dict):
            # If seed_data is directly { 'patients': [...], 'doctors': [...] }
            collections_data = seed_data

        reg = db["_yuvro_evaluation_collections"]
        for logical_name, docs in collections_data.items():
            physical_name = resolver.get_physical_collection_name(logical_name)
            col = db[physical_name]
            if col.count_documents({}) == 0 and docs:
                # Insert deep copy to prevent mutating seed
                docs_copy = copy.deepcopy(docs)
                col.insert_many(docs_copy)

            reg.update_one(
                {
                    "evaluation_uuid": str(evaluation_uuid),
                    "user_uuid": str(user_uuid),
                    "logical_collection_name": str(logical_name).lower()
                },
                {
                    "$set": {
                        "evaluation_uuid": str(evaluation_uuid),
                        "user_uuid": str(user_uuid),
                        "lab_uuid": str(lab_uuid),
                        "logical_collection_name": str(logical_name).lower(),
                        "physical_collection_name": physical_name
                    }
                },
                upsert=True
            )

        self._resolver_cache[cache_key] = resolver
        return resolver

    def cleanup_evaluation_tables(
        self, connection_url: str, evaluation_uuid: str, user_uuid: str, lab_uuid: str
    ) -> Dict[str, Any]:
        """Drop isolated physical collections and remove registry entries."""
        cache_key = f"{evaluation_uuid}_{user_uuid}_{lab_uuid}"
        self._resolver_cache.pop(cache_key, None)

        try:
            db = self.get_database(connection_url)
            col_map = self._load_registered_collections(connection_url, evaluation_uuid, user_uuid, lab_uuid)
            dropped = []
            for physical in col_map.values():
                db[physical].drop()
                dropped.append(physical)

            reg = db["_yuvro_evaluation_collections"]
            reg.delete_many({
                "evaluation_uuid": str(evaluation_uuid),
                "user_uuid": str(user_uuid),
                "lab_uuid": str(lab_uuid)
            })
            return {"status": "success", "dropped_collections": dropped}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def execute_mongo_operation(
        self,
        connection_url: str,
        parsed_query: Dict[str, Any],
        resolver: Optional[EvaluationCollectionResolver] = None
    ) -> Tuple[str, str, int, Optional[Dict[str, Any]]]:
        """Execute validated and rewritten MongoDB operation using PyMongo."""
        try:
            db = self.get_database(connection_url)

            operation = parsed_query.get("operation", "find")

            # Handle show collections (Schema Explorer)
            if operation in ("show_collections", "show collections"):
                all_cols = db.list_collection_names()
                if resolver:
                    cols = [
                        resolver.get_logical_collection_name(c)
                        for c in all_cols
                        if resolver.is_physical_collection_for_this_eval(c)
                    ]
                    cols = sorted([c for c in cols if c])
                else:
                    cols = sorted([c for c in all_cols if not c.startswith("system.") and not c.startswith("_yuvro_")])

                rows = [{"name": c, "table": c} for c in cols]
                data = {"columns": ["name"], "rows": rows}
                out_lines = "\n".join(cols)
                return out_lines, "", 0, data

            logical_col = parsed_query.get("collection", "")
            if not logical_col:
                raise ValueError("Collection name is required.")

            if resolver:
                physical_col = resolver.validate_collection_access(logical_col)
            else:
                physical_col = logical_col

            col = db[physical_col]

            if operation == "find":
                filt = parsed_query.get("filter", {})
                proj = parsed_query.get("projection")
                cursor = col.find(filt, proj)

                sort_spec = parsed_query.get("sort")
                if sort_spec:
                    if isinstance(sort_spec, dict):
                        sort_list = list(sort_spec.items())
                        cursor = cursor.sort(sort_list)
                    elif isinstance(sort_spec, (list, tuple)):
                        cursor = cursor.sort(sort_spec)

                skip_spec = parsed_query.get("skip")
                if skip_spec and isinstance(skip_spec, int):
                    cursor = cursor.skip(skip_spec)

                limit_spec = parsed_query.get("limit")
                if limit_spec and isinstance(limit_spec, int):
                    cursor = cursor.limit(limit_spec)

                raw_results = list(cursor)

            elif operation == "aggregate":
                pipeline = parsed_query.get("pipeline", [])
                if not isinstance(pipeline, list):
                    raise ValueError("Aggregation pipeline must be a list of stage objects.")

                if resolver:
                    rewritten_pipeline = resolver.rewrite_pipeline(pipeline)
                else:
                    rewritten_pipeline = pipeline

                raw_results = list(col.aggregate(rewritten_pipeline))

            else:
                raise ValueError(f"Unsupported MongoDB operation '{operation}'. Only find and aggregate are supported.")

            normalized_results = self.normalize_bson(raw_results)
            columns = []
            if normalized_results and isinstance(normalized_results[0], dict):
                columns = list(normalized_results[0].keys())

            data = {
                "columns": columns,
                "rows": normalized_results
            }
            stdout_str = json.dumps(normalized_results, indent=2)
            return stdout_str, "", 0, data

        except SecurityException as se:
            return "", f"Security Violation: {str(se)}", 1, None
        except Exception as e:
            return "", f"MongoDB Error: {str(e)}", 1, None

    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        """Execute student MongoDB query against connection URL or workspace."""
        try:
            task_file = getattr(body, "task_file", None)
            if task_file:
                file_path = os.path.join(str(workspace_dir), task_file)
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        body.query = f.read()
                else:
                    return {"stdout": "", "stderr": f"Task file {task_file} not found", "exit_code": -1}

            query = getattr(body, "query", "") or ""
            connection_url = getattr(body, "connection_url", None) or getattr(body, "uri", None)

            if not connection_url or not connection_url.strip():
                return {
                    "stdout": "",
                    "stderr": "MongoDB connection URL is required. Please configure your Database Connection.",
                    "exit_code": 1
                }

            evaluation_id = getattr(body, "evaluation_id", None)
            user_id = getattr(body, "user_id", None)
            lab_id = getattr(body, "lab_id", None)

            is_isolated_eval = bool(evaluation_id and user_id and lab_id)
            resolver: Optional[EvaluationCollectionResolver] = None

            if is_isolated_eval:
                resolver = await asyncio.to_thread(
                    self.initialize_evaluation_collections,
                    connection_url.strip(),
                    str(evaluation_id),
                    str(user_id),
                    str(lab_id),
                    str(workspace_dir)
                )

            # Parse student query
            try:
                parsed_query = self.parse_mongo_query(query)
            except Exception as pe:
                return {
                    "stdout": "",
                    "stderr": f"Query Parse Error: {str(pe)}",
                    "exit_code": 1
                }

            # Execute via PyMongo
            exec_res = await asyncio.to_thread(
                self.execute_mongo_operation,
                connection_url.strip(),
                parsed_query,
                resolver if is_isolated_eval else None
            )
            out_str, err_str, exit_code, data = exec_res

            result = {
                "stdout": out_str,
                "stderr": err_str,
                "exit_code": exit_code,
                "data": data
            }

            if (
                getattr(body, "scoring_rules", None) is not None
                or getattr(body, "expected_query", None)
                or getattr(body, "expected_output", None)
                or getattr(body, "system_query", None)
            ):
                actual_result = err_str if exit_code != 0 else out_str
                if getattr(body, "system_query", None) and exit_code == 0:
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
            return {"stdout": "", "stderr": "MongoDB query timed out", "exit_code": -1}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}

    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate student result against expected output and scoring rules."""
        exit_code = execution_result.get("exit_code", 0)
        user_output = execution_result.get("out_str", "")
        actual_result = execution_result.get("actual_result", "")
        data = execution_result.get("data")

        scoring_rules = getattr(body, "scoring_rules", {}) or {}
        if not isinstance(scoring_rules, dict):
            scoring_rules = {}

        expected_query = (
            getattr(body, "expected_query", None)
            or scoring_rules.get("expected_query")
            or scoring_rules.get("system_query")
            or ""
        ).strip()
        user_query = (getattr(body, "query", None) or "").strip()
        expected_output = getattr(body, "expected_output", None)
        if expected_output is None:
            expected_output = scoring_rules.get("expected_output")
        system_query = getattr(body, "system_query", None) or scoring_rules.get("system_query")
        expected_result = getattr(body, "expected_result", None) or scoring_rules.get("expected_result")

        def normalize_str(s: str) -> str:
            s = re.sub(r'//.*', '', s)
            s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL)
            s = re.sub(r'\s+', ' ', s).strip().lower()
            s = re.sub(r'\s*\(\s*', '(', s)
            s = re.sub(r'\s*\)\s*', ')', s)
            s = re.sub(r'\s*,\s*', ',', s)
            s = re.sub(r'\s*;\s*', ';', s)
            return s.rstrip(';')

        norm_expected = normalize_str(expected_query)
        norm_user = normalize_str(user_query)

        if exit_code != 0 or "error:" in user_output.lower():
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

        # Check required primary operation (find / aggregate)
        if norm_expected:
            if "find" in norm_expected and "find" not in norm_user and "aggregate" not in norm_user:
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

        # Compare outputs
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

            actual_rows: Optional[List[Dict[str, Any]]] = None
            if data and isinstance(data, dict) and "rows" in data and isinstance(data["rows"], list):
                actual_rows = data["rows"]
            elif user_output:
                try:
                    parsed_user_out = json.loads(user_output)
                    if isinstance(parsed_user_out, list):
                        actual_rows = parsed_user_out
                except Exception:
                    pass

            if isinstance(exp_data, list) and actual_rows is not None:
                if len(exp_data) == len(actual_rows):
                    if len(exp_data) == 0:
                        output_is_valid = True
                    else:
                        all_match = True
                        for i, exp_row in enumerate(exp_data):
                            act_row = actual_rows[i]
                            if isinstance(exp_row, dict) and isinstance(act_row, dict):
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
                                    elif isinstance(exp_v, (int, float)) and isinstance(act_v, (int, float)):
                                        if round(float(exp_v), 2) != round(float(act_v), 2):
                                            all_match = False
                                            break
                                    elif str(exp_v).strip().lower() != str(act_v).strip().lower():
                                        all_match = False
                                        break
                            elif exp_row != act_row:
                                all_match = False
                                break
                            if not all_match:
                                break
                        output_is_valid = all_match
                else:
                    output_is_valid = False
            else:
                user_norm = " ".join(user_output.lower().split())
                if isinstance(exp_data, list):
                    all_rows_matched = True
                    for item in exp_data:
                        if isinstance(item, dict):
                            for val in item.values():
                                if val is None:
                                    continue
                                if str(val).strip().lower() not in user_norm:
                                    all_rows_matched = False
                                    break
                        elif str(item).strip().lower() not in user_norm:
                            all_rows_matched = False
                            break
                        if not all_rows_matched:
                            break
                    output_is_valid = all_rows_matched
                else:
                    output_is_valid = str(exp_data).strip().lower() in user_norm

        # Check system validation
        system_is_valid = output_is_valid
        if system_query and expected_result and actual_result:
            if expected_result.strip().lower() in actual_result.strip().lower():
                system_is_valid = True

        query_matches = output_is_valid
        passed = output_is_valid and (system_is_valid or not system_query)
        score_pct = 1.0 if passed else 0.0

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
        """Run system_query to get validation output."""
        system_query = getattr(body, "system_query", "")
        if not system_query:
            return ""

        try:
            eval_body = type(body)(
                **{**body.__dict__, "query": system_query, "task_file": None, "system_query": None}
            )
            res = await self.execute(eval_body, workspace_dir)
            return res.get("stdout", "")
        except Exception:
            return ""
