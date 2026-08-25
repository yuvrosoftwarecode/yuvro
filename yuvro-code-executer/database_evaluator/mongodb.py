import os
import re
import asyncio
import tempfile
import json
from typing import Dict, Any, Optional
from pathlib import Path
from .base import BaseDatabaseEvaluator

class MongoDbEvaluator(BaseDatabaseEvaluator):
    """
    MongoDB Database Evaluator
    Executes Mongo shell/JavaScript queries directly on the provided MongoDB connection URL
    and evaluates them against scoring rules, system validation queries, and expected aggregation/CRUD output.
    """
    name = "mongodb"

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
                    "stderr": "MongoDB connection URL is required. Please configure your Database Connection.",
                    "exit_code": 1
                }
            
            # Find possible node_modules locations for mongodb driver
            possible_node_paths = [
                "/app/node_modules",
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "node_modules")),
                str(Path(workspace_dir) / "node_modules"),
                str(Path(workspace_dir).parent / "ylabs-web" / "node_modules"),
                str(Path(__file__).resolve().parent.parent.parent / "ylabs-web" / "node_modules"),
                os.environ.get("NODE_PATH", "")
            ]
            node_path_env = os.pathsep.join([p for p in possible_node_paths if p and os.path.exists(p)])
            
            escaped_uri = json.dumps(connection_url.strip())
            escaped_query = json.dumps(query)
            runner_script = f"""
const fs = require('fs');
const path = require('path');

async function run() {{
    let client;
    try {{
        let MongoClient;
        const candidatePaths = [
            'mongodb',
            '/app/node_modules/mongodb',
            path.join(process.cwd(), 'node_modules', 'mongodb'),
            path.join(__dirname, 'node_modules', 'mongodb')
        ];
        for (const cp of candidatePaths) {{
            try {{
                const mod = require(cp);
                if (mod && mod.MongoClient) {{
                    MongoClient = mod.MongoClient;
                    break;
                }}
            }} catch(e) {{}}
        }}
        if (!MongoClient) {{
            MongoClient = require('mongodb').MongoClient;
        }}

        client = new MongoClient({escaped_uri}, {{ serverSelectionTimeoutMS: 5000 }});
        await client.connect();
        const rawDb = client.db();

        const db = new Proxy(rawDb, {{
            get(target, prop) {{
                if (prop === 'getName') return () => target.databaseName;
                if (prop in target && typeof target[prop] === 'function') {{
                    return target[prop].bind(target);
                }}
                const col = target.collection(prop);
                return new Proxy(col, {{
                    get(colTarget, colProp) {{
                        if (colProp === 'find') {{
                            return (...args) => {{
                                const cursor = colTarget.find(...args);
                                return {{
                                    sort: (...sArgs) => {{ cursor.sort(...sArgs); return cursor; }},
                                    limit: (...lArgs) => {{ cursor.limit(...lArgs); return cursor; }},
                                    skip: (...skArgs) => {{ cursor.skip(...skArgs); return cursor; }},
                                    toArray: () => cursor.toArray(),
                                    then: (resolve, reject) => cursor.toArray().then(resolve, reject),
                                    pretty: () => cursor.toArray()
                                }};
                            }};
                        }}
                        if (colProp === 'aggregate') {{
                            return (...args) => {{
                                const cursor = colTarget.aggregate(...args);
                                return {{
                                    toArray: () => cursor.toArray(),
                                    then: (resolve, reject) => cursor.toArray().then(resolve, reject)
                                }};
                            }};
                        }}
                        if (typeof colTarget[colProp] === 'function') {{
                            return colTarget[colProp].bind(colTarget);
                        }}
                        return colTarget[colProp];
                    }}
                }});
            }}
        }});

        let result = eval({escaped_query});
        if (result && typeof result.then === 'function') {{
            result = await result;
        }} else if (result && typeof result.toArray === 'function') {{
            result = await result.toArray();
        }}

        if (result !== undefined) {{
            console.log(typeof result === 'object' ? JSON.stringify(result, null, 2) : result);
        }}
    }} catch (err) {{
        console.error('MongoDB Error: ' + err.message);
        process.exit(1);
    }} finally {{
        if (client) {{
            try {{ await client.close(); }} catch(e) {{}}
        }}
    }}
}}

run();
"""
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
                f.write(runner_script)
                temp_path = f.name
                
            env = os.environ.copy()
            if node_path_env:
                env["NODE_PATH"] = node_path_env
                
            proc = await asyncio.create_subprocess_shell(
                f'node "{temp_path}"',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace_dir),
                env=env
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            if os.path.exists(temp_path):
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
            return {"stdout": "", "stderr": "MongoDB query timed out", "exit_code": -1}
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
        
        # 1. Check Query Match
        query_matches = False
        if norm_expected and norm_user:
            required_stages = ["aggregate", "find", "$match", "$group", "$sort", "$lookup", "$unwind", "$project", "$sum", "$addfields"]
            stage_match_count = 0
            total_stages = 0
            for stage in required_stages:
                if stage in norm_expected:
                    total_stages += 1
                    if stage in norm_user:
                        stage_match_count += 1
            
            if total_stages > 0 and (stage_match_count / total_stages) >= 0.75:
                query_matches = True
            elif norm_expected in norm_user:
                query_matches = True

        # 2. Check Output Match
        output_is_valid = False
        if exit_code == 0 and "error:" not in user_output.lower() and "syntaxerror" not in user_output.lower():
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
        is_mutation_task = any(kw in norm_expected for kw in ["insert", "update", "delete", "create", "drop"])
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
            
        try:
            eval_body = type(body)(
                **{**body.__dict__, 'query': system_query, 'task_file': None, 'system_query': None}
            )
            res = await self.execute(eval_body, workspace_dir)
            return res.get("stdout", "")
        except Exception:
            return ""
