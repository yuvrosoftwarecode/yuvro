import sqlite3
import threading
import os
from typing import Dict, Any, List, Tuple

class SqliteExecutorService:
    DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "databases")

    @staticmethod
    def _clone_to_memory(db_identifier: str) -> sqlite3.Connection:
        """
        Loads the disk database into an in-memory SQLite database
        to ensure isolation and speed.
        """
        disk_path = os.path.join(SqliteExecutorService.DB_DIR, f"{db_identifier}.db")
        if not os.path.exists(disk_path):
            raise FileNotFoundError(f"Database {db_identifier} not found.")

        # Create an in-memory database
        mem_conn = sqlite3.connect(":memory:", check_same_thread=False)
        
        # Load from disk to memory using backup API
        disk_conn = sqlite3.connect(disk_path)
        disk_conn.backup(mem_conn)
        disk_conn.close()
        
        # Enable foreign keys
        mem_conn.execute("PRAGMA foreign_keys = ON;")
        return mem_conn

    @staticmethod
    def _execute_query(conn: sqlite3.Connection, query: str, timeout: float = 2.0) -> Tuple[List[str], List[tuple]]:
        """
        Executes a query with a strict timeout wrapper.
        Uses conn.interrupt() to safely abort run-away queries.
        """
        result = None
        error = None
        columns = None

        def target():
            nonlocal result, error, columns
            try:
                cursor = conn.cursor()
                # We use execute script to allow multiple statements (e.g. PRAGMA + SELECT)
                # but if we want result sets, we should just use execute for the main query.
                cursor.execute(query)
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                    result = cursor.fetchall()
                else:
                    result = []
                    columns = []
                conn.commit()
            except Exception as e:
                error = e

        thread = threading.Thread(target=target)
        thread.start()
        thread.join(timeout)

        if thread.is_alive():
            conn.interrupt()  # Safely abort the SQLite operation
            thread.join()
            raise TimeoutError(f"Query execution timed out (> {timeout}s)")

        if error:
            raise error

        return columns, result

    @staticmethod
    def _normalize_result(columns: List[str], rows: List[tuple], check_columns: bool) -> List[Any]:
        """
        Converts SQLite rows into normalized dictionaries or lists.
        """
        if check_columns and columns:
            return [dict(zip(columns, row)) for row in rows]
        else:
            return [list(row) for row in rows]

    @staticmethod
    def _compare_results(user_res: List[Any], sys_res: List[Any], check_order: bool) -> bool:
        if len(user_res) != len(sys_res):
            return False
            
        if not check_order:
            # Sort both lists by string representation to ignore order
            # Using JSON dump to ensure dicts are sorted deterministically
            import json
            user_res_sorted = sorted(user_res, key=lambda x: json.dumps(x, sort_keys=True))
            sys_res_sorted = sorted(sys_res, key=lambda x: json.dumps(x, sort_keys=True))
            return user_res_sorted == sys_res_sorted
            
        return user_res == sys_res

    @classmethod
    def evaluate_submission(
        cls, 
        user_query: str, 
        system_query: str, 
        db_identifier: str, 
        check_order: bool = False, 
        check_columns: bool = True
    ) -> Dict[str, Any]:
        """
        The main Two-Universe evaluation algorithm.
        """
        import time
        start_time = time.time()
        
        expected_result_normalized = []
        user_result_normalized = []
        
        # -----------------------------------------------------
        # UNIVERSE A: THE SYSTEM (ANSWER KEY)
        # -----------------------------------------------------
        sys_conn = None
        try:
            sys_conn = cls._clone_to_memory(db_identifier)
            sys_cols, sys_rows = cls._execute_query(sys_conn, system_query)
            expected_result_normalized = cls._normalize_result(sys_cols, sys_rows, check_columns)
        except Exception as e:
            if sys_conn: sys_conn.close()
            # If the system query fails, it's a 500 error
            raise RuntimeError(f"System Query Failed: {str(e)}")
        finally:
            if sys_conn: sys_conn.close()

        # -----------------------------------------------------
        # UNIVERSE B: THE STUDENT
        # -----------------------------------------------------
        user_conn = None
        try:
            user_conn = cls._clone_to_memory(db_identifier)
            user_cols, user_rows = cls._execute_query(user_conn, user_query)
            user_result_normalized = cls._normalize_result(user_cols, user_rows, check_columns)
            
            # If it's a DML task (e.g. INSERT), we must run the system_query 
            # to verify the state of the user's universe.
            # But ONLY if the system_query is actually a verification SELECT.
            # For simplicity, if user_cols is empty (DML), we can run the system query to check state.
            if not user_cols and system_query.strip().upper().startswith("SELECT"):
                verify_cols, verify_rows = cls._execute_query(user_conn, system_query)
                user_result_normalized = cls._normalize_result(verify_cols, verify_rows, check_columns)
                
        except Exception as e:
            if user_conn: user_conn.close()
            return {
                "correct": False,
                "error": str(e),
                "execution_time_ms": round((time.time() - start_time) * 1000, 2),
                "user_result": [],
                "expected_result": expected_result_normalized[:5]
            }
        finally:
            if user_conn: user_conn.close()

        # -----------------------------------------------------
        # COMPARISON
        # -----------------------------------------------------
        is_correct = cls._compare_results(user_result_normalized, expected_result_normalized, check_order)
        
        error_msg = None
        if not is_correct:
            if len(user_result_normalized) != len(expected_result_normalized):
                error_msg = f"Row count mismatch: Returned {len(user_result_normalized)} rows, expected {len(expected_result_normalized)}."
            else:
                error_msg = "Data mismatch: Your query returned the wrong data."

        return {
            "correct": is_correct,
            "error": error_msg,
            "execution_time_ms": round((time.time() - start_time) * 1000, 2),
            "user_result": user_result_normalized[:5],  # truncated for API
            "expected_result": expected_result_normalized[:5]
        }
