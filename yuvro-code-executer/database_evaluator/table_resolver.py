"""
Per-Evaluation MySQL Table Isolation Resolver

Generates deterministic isolated physical table names for candidate evaluations,
rewrites student and system queries using logical table names, and enforces
strict isolation and security boundaries so that no evaluation can discover or
access another evaluation's tables in a shared MySQL database.
"""

import re
import hashlib
from typing import Dict, List, Set, Tuple, Optional, Any

# Maximum identifier length in MySQL
MYSQL_MAX_IDENTIFIER_LENGTH = 64

# Regex for SQL tokenization respecting comments, quotes, backticks, and operators
SQL_TOKEN_RE = re.compile(
    r"""
      (?P<LINE_COMMENT>--[^\r\n]*|\#[^\r\n]*)
    | (?P<BLOCK_COMMENT>/\*.*?\*/)
    | (?P<STRING_SINGLE>'(?:''|\\\'|[^'])*')
    | (?P<STRING_DOUBLE>"(?:""|\\\"|[^"])*")
    | (?P<BACKTICK_ID>`(?:``|[^`])+`)
    | (?P<WORD>[a-zA-Z_][a-zA-Z0-9_]*)
    | (?P<NUM>[0-9]+(?:\.[0-9]+)?)
    | (?P<DOT>\.)
    | (?P<PUNCT>[,();=<>!+\-*/%&|^~])
    | (?P<SPACE>\s+)
    | (?P<OTHER>.)
    """,
    re.VERBOSE | re.DOTALL
)

SQL_KEYWORDS = {
    "SELECT", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "STRAIGHT_JOIN",
    "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "AS",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "DROP", "ALTER",
    "EXISTS", "NOT", "IF", "INDEX", "VIEW", "DATABASE", "SCHEMA", "DEFAULT", "NULL", "PRIMARY",
    "KEY", "FOREIGN", "REFERENCES", "CONSTRAINT", "AUTO_INCREMENT", "CASCADE", "RESTRICT",
    "AND", "OR", "IN", "IS", "LIKE", "BETWEEN", "CASE", "WHEN", "THEN", "ELSE", "END",
    "ASC", "DESC", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "OVER", "PARTITION",
    "SHOW", "TABLES", "DESCRIBE", "EXPLAIN"
}

# Dangerous administrative keywords forbidden in candidate evaluation queries
RESTRICTED_ADMIN_KEYWORDS = {
    "SHUTDOWN", "GRANT", "REVOKE", "SUPER", "PROCESS", "RELOAD", "REPLICATION"
}


class SecurityException(Exception):
    """Raised when a query attempts to violate the evaluation isolation boundary."""
    pass


def sanitize_identifier(name: str) -> str:
    """Strip whitespace, backticks, and double quotes from a SQL identifier."""
    s = str(name).strip()
    if s.startswith("`") and s.endswith("`"):
        s = s[1:-1].replace("``", "`")
    elif s.startswith('"') and s.endswith('"'):
        s = s[1:-1].replace('""', '"')
    return s.strip()


def validate_uuid_or_identifier(val: str, label: str) -> str:
    """Validate that val contains only safe characters for identifier construction."""
    clean = re.sub(r"[^a-zA-Z0-9_-]", "", str(val).strip())
    if not clean:
        raise ValueError(f"{label} must not be empty and must contain valid characters.")
    return clean


def build_isolated_table_name(
    evaluation_uuid: str,
    user_uuid: str,
    lab_uuid: str,
    logical_table_name: str,
    dialect: str = "mysql"
) -> str:
    """
    Build a deterministic isolated physical table name.
    
    Standard format:
      evaluation_{evaluation_uuid}_user_{user_uuid}_lab_{lab_uuid}_{logical_table_name}
      
    Example:
      evaluation_abc123_user_user456_lab_lab789_users
      
    If the full name exceeds the identifier limit (63 for PostgreSQL, 64 for MySQL),
    it generates a deterministic compressed identifier guaranteed to fit in <= max_len characters:
      eval_{eval_short}_{user_short}_{lab_short}_{hash8}_{table}
    """
    clean_eval = re.sub(r"[^a-zA-Z0-9_]", "", str(evaluation_uuid))
    clean_user = re.sub(r"[^a-zA-Z0-9_]", "", str(user_uuid))
    clean_lab = re.sub(r"[^a-zA-Z0-9_]", "", str(lab_uuid))
    clean_table = re.sub(r"[^a-zA-Z0-9_]", "", sanitize_identifier(logical_table_name)).lower()

    if not clean_table:
        raise ValueError("Logical table name cannot be empty.")

    max_len = 63 if str(dialect).lower() in ("postgresql", "postgres") else MYSQL_MAX_IDENTIFIER_LENGTH

    # Try exact template
    full_name = f"evaluation_{clean_eval}_user_{clean_user}_lab_{clean_lab}_{clean_table}"
    if len(full_name) <= max_len:
        return full_name

    # Long UUIDs: deterministically shorten while keeping readable components and hash
    h = hashlib.sha256(f"{clean_eval}_{clean_user}_{clean_lab}".encode()).hexdigest()[:8]
    eval_short = clean_eval[:8]
    user_short = clean_user[:8]
    lab_short = clean_lab[:8]

    candidate = f"eval_{eval_short}_{user_short}_{lab_short}_{h}_{clean_table}"
    if len(candidate) <= max_len:
        return candidate

    # If clean_table itself is exceptionally long:
    prefix = f"eval_{eval_short}_{user_short}_{lab_short}_{h}_"
    avail = max_len - len(prefix)
    return f"{prefix}{clean_table[:avail]}"


class EvaluationTableResolver:
    """
    Central abstraction for mapping logical table names to physical isolated table names
    and rewriting SQL queries.
    """

    def __init__(
        self,
        evaluation_uuid: str,
        user_uuid: str,
        lab_uuid: str,
        table_map: Optional[Dict[str, str]] = None,
        dialect: str = "mysql"
    ):
        self.evaluation_uuid = str(evaluation_uuid).strip()
        self.user_uuid = str(user_uuid).strip()
        self.lab_uuid = str(lab_uuid).strip()
        self.dialect = str(dialect).lower().strip()

        # Key: logical table name (lowercase), Value: physical table name
        self.logical_to_physical: Dict[str, str] = {}
        # Key: physical table name (lowercase), Value: logical table name
        self.physical_to_logical: Dict[str, str] = {}

        if table_map:
            for logical, physical in table_map.items():
                self.register_table(logical, physical)

    def register_table(self, logical_name: str, physical_name: Optional[str] = None) -> str:
        """Register a logical table and return its physical name."""
        clean_logical = sanitize_identifier(logical_name).lower()
        if not physical_name:
            physical_name = build_isolated_table_name(
                self.evaluation_uuid,
                self.user_uuid,
                self.lab_uuid,
                clean_logical,
                dialect=self.dialect
            )
        self.logical_to_physical[clean_logical] = physical_name
        self.physical_to_logical[physical_name.lower()] = clean_logical
        return physical_name

    def get_physical_table_name(self, logical_name: str) -> str:
        """Get or generate the physical table name for a logical table."""
        clean_logical = sanitize_identifier(logical_name).lower()
        if clean_logical in self.logical_to_physical:
            return self.logical_to_physical[clean_logical]
        return self.register_table(clean_logical)

    def get_logical_table_name(self, physical_name: str) -> Optional[str]:
        """Reverse map a physical table name back to its logical table name."""
        clean_physical = sanitize_identifier(physical_name).lower()
        return self.physical_to_logical.get(clean_physical)

    def is_physical_table_for_this_eval(self, table_name: str) -> bool:
        """Check if a table name belongs to this evaluation attempt."""
        clean = sanitize_identifier(table_name).lower()
        return clean in self.physical_to_logical

    def validate_sql_security(self, sql: str) -> None:
        """
        Validate that the SQL query does not attempt to escape isolation or access
        unauthorized schemas/tables.
        """
        raw_tokens = []
        for m in SQL_TOKEN_RE.finditer(sql):
            for kind, val in m.groupdict().items():
                if val is not None:
                    raw_tokens.append((kind, val))
                    break

        n = len(raw_tokens)
        for i, (kind, val) in enumerate(raw_tokens):
            if kind == "WORD":
                val_upper = val.upper()

                # Check dangerous administrative keywords
                if val_upper in RESTRICTED_ADMIN_KEYWORDS:
                    raise SecurityException(f"Administrative statement '{val_upper}' is prohibited.")

                # Check DROP DATABASE / CREATE DATABASE / ALTER DATABASE
                if val_upper in ("DATABASE", "SCHEMA"):
                    # check previous token
                    prev_idx = i - 1
                    while prev_idx >= 0 and raw_tokens[prev_idx][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                        prev_idx -= 1
                    if prev_idx >= 0 and raw_tokens[prev_idx][1].upper() in ("CREATE", "DROP", "ALTER"):
                        raise SecurityException("Database-level DDL operations are prohibited.")

                # Check access to system catalogs: information_schema, mysql, performance_schema, sys, pg_catalog
                # (unless this query is specifically internal schema exploration)
                if val.lower() in ("information_schema", "performance_schema", "mysql", "sys", "pg_catalog"):
                    # Check if next token is a dot
                    next_idx = i + 1
                    while next_idx < n and raw_tokens[next_idx][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                        next_idx += 1
                    if next_idx < n and raw_tokens[next_idx][0] == "DOT":
                        raise SecurityException(f"Access to system catalog '{val}' is prohibited.")

                # Check if student is directly querying another evaluation's physical table
                val_clean = sanitize_identifier(val).lower()
                if (val_clean.startswith("evaluation_") or val_clean.startswith("eval_")) and not self.is_physical_table_for_this_eval(val_clean):
                    raise SecurityException("Cross-evaluation table access is strictly prohibited.")

            elif kind == "BACKTICK_ID":
                val_clean = sanitize_identifier(val).lower()
                if (val_clean.startswith("evaluation_") or val_clean.startswith("eval_")) and not self.is_physical_table_for_this_eval(val_clean):
                    raise SecurityException("Cross-evaluation table access is strictly prohibited.")

    @classmethod
    def extract_logical_tables_from_seed(cls, seed_sql: str) -> Set[str]:
        """Extract logical table names from CREATE TABLE and DROP TABLE statements."""
        raw_tokens = []
        for m in SQL_TOKEN_RE.finditer(seed_sql):
            for kind, val in m.groupdict().items():
                if val is not None:
                    raw_tokens.append((kind, val))
                    break

        created_tables = set()
        i = 0
        n = len(raw_tokens)

        while i < n:
            kind, val = raw_tokens[i]
            if kind == "WORD" and val.upper() in ("CREATE", "DROP", "ALTER"):
                j = i + 1
                while j < n and raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                    j += 1
                if j < n and raw_tokens[j][0] == "WORD" and raw_tokens[j][1].upper() == "TABLE":
                    j += 1
                    # Skip IF [NOT] EXISTS
                    while j < n and raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                        j += 1
                    if j < n and raw_tokens[j][0] == "WORD" and raw_tokens[j][1].upper() == "IF":
                        j += 1
                        while j < n and raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                            j += 1
                        if j < n and raw_tokens[j][0] == "WORD" and raw_tokens[j][1].upper() == "NOT":
                            j += 1
                            while j < n and raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                                j += 1
                        if j < n and raw_tokens[j][0] == "WORD" and raw_tokens[j][1].upper() == "EXISTS":
                            j += 1
                            while j < n and raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                                j += 1
                    # Extract table name(s)
                    while j < n:
                        if raw_tokens[j][0] in ("WORD", "BACKTICK_ID", "STRING_DOUBLE"):
                            tbl = sanitize_identifier(raw_tokens[j][1]).lower()
                            if tbl.upper() in SQL_KEYWORDS:
                                break
                            created_tables.add(tbl)
                            j += 1
                        elif raw_tokens[j][0] in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                            j += 1
                        elif raw_tokens[j][0] == "PUNCT" and raw_tokens[j][1] == ",":
                            j += 1
                        else:
                            break
            i += 1
        return created_tables

    def rewrite(self, sql: str, allow_auto_register: bool = True) -> str:
        """
        Rewrite logical table names to physical table names across the SQL query.
        
        Preserves string literals, comments, column names, and unrelated identifiers.
        """
        # Automatically discover any tables created in this query if it contains CREATE TABLE
        if allow_auto_register:
            new_tables = self.extract_logical_tables_from_seed(sql)
            for t in new_tables:
                self.get_physical_table_name(t)

        raw_tokens = []
        for m in SQL_TOKEN_RE.finditer(sql):
            for kind, val in m.groupdict().items():
                if val is not None:
                    raw_tokens.append((kind, val))
                    break

        out: List[str] = []
        i = 0
        n = len(raw_tokens)

        def next_significant(start_idx: int) -> Tuple[Optional[int], Optional[str], Optional[str]]:
            k = start_idx
            while k < n:
                kind, val = raw_tokens[k]
                if kind not in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                    return k, kind, val
                k += 1
            return None, None, None

        def prev_significant(start_idx: int) -> Tuple[Optional[int], Optional[str], Optional[str]]:
            k = start_idx
            while k >= 0:
                kind, val = raw_tokens[k]
                if kind not in ("SPACE", "LINE_COMMENT", "BLOCK_COMMENT"):
                    return k, kind, val
                k -= 1
            return None, None, None

        is_postgres = self.dialect in ("postgresql", "postgres")
        quote_char = '"' if is_postgres else '`'

        while i < n:
            kind, val = raw_tokens[i]

            if kind in ("WORD", "BACKTICK_ID") or (is_postgres and kind == "STRING_DOUBLE"):
                clean_name = sanitize_identifier(val).lower()

                if clean_name in self.logical_to_physical:
                    physical = self.logical_to_physical[clean_name]

                    prev_idx, prev_kind, prev_val = prev_significant(i - 1)
                    next_idx, next_kind, next_val = next_significant(i + 1)

                    prev_word = prev_val.upper() if (prev_kind == "WORD" and prev_val) else ""

                    # Check if this token is in a table-referencing position
                    is_after_table_kw = prev_word in (
                        "FROM", "JOIN", "INTO", "TABLE", "REFERENCES", "UPDATE", "TABLES", "EXISTS"
                    )

                    # Check if it follows 'CREATE TABLE IF NOT EXISTS' or 'DROP TABLE IF EXISTS'
                    # where prev_word might be 'EXISTS'
                    if prev_word == "EXISTS":
                        # Look further back
                        scan = prev_idx
                        while scan is not None and scan >= 0:
                            s_kind, s_val = raw_tokens[scan]
                            if s_kind == "WORD" and s_val.upper() == "TABLE":
                                is_after_table_kw = True
                                break
                            elif s_kind == "WORD" and s_val.upper() in ("SELECT", "WHERE", ";"):
                                break
                            scan -= 1

                    # Check comma-separated tables (e.g. FROM a, b or DROP TABLE a, b)
                    is_comma_table = False
                    if prev_val == ",":
                        scan = prev_idx
                        while scan is not None and scan >= 0:
                            s_kind, s_val = raw_tokens[scan]
                            if s_kind == "WORD":
                                su = s_val.upper()
                                if su in ("FROM", "TABLE", "UPDATE"):
                                    is_comma_table = True
                                    break
                                elif su in ("SELECT", "WHERE", "SET", "GROUP", "ORDER", "HAVING", "LIMIT", "(", ";"):
                                    break
                            scan -= 1

                    # Check qualified column reference: users.id
                    is_table_dot = (next_kind == "DOT")

                    if is_after_table_kw or is_comma_table:
                        # Table in DDL or DML
                        # Check if an explicit alias immediately follows
                        has_alias = False
                        if next_idx is not None and next_kind == "WORD":
                            next_upper = next_val.upper()
                            if next_upper == "AS":
                                has_alias = True
                            elif next_upper not in SQL_KEYWORDS:
                                has_alias = True

                        # For SELECT/DML FROM/JOIN clauses: if no alias is specified,
                        # alias as `physical_table` AS `logical_table` so unaliased column
                        # qualifiers like users.id continue working without modification!
                        # (Note: Do not add AS alias in DDL like CREATE TABLE, DROP TABLE, ALTER TABLE, REFERENCES, or DELETE)
                        is_from_or_join = (prev_word in ("FROM", "JOIN") or (is_comma_table and prev_word != "TABLE"))
                        # Ensure not inside DELETE FROM single-table
                        is_delete = False
                        scan = prev_idx
                        while scan is not None and scan >= 0:
                            s_kind, s_val = raw_tokens[scan]
                            if s_kind == "WORD":
                                if s_val.upper() == "DELETE":
                                    is_delete = True
                                    break
                                elif s_val.upper() in ("SELECT", "INSERT", "UPDATE", ";"):
                                    break
                            scan -= 1

                        if is_from_or_join and not has_alias and not is_delete:
                            out.append(f"{quote_char}{physical}{quote_char} AS {quote_char}{clean_name}{quote_char}")
                        else:
                            out.append(f"{quote_char}{physical}{quote_char}")

                    elif is_table_dot:
                        # Qualified column: e.g. users.id
                        # If table in FROM was aliased AS users, then users.id already resolves to alias users!
                        # Keep it clean
                        out.append(f"{quote_char}{clean_name}{quote_char}")
                    else:
                        out.append(val)
                else:
                    out.append(val)
            else:
                out.append(val)
            i += 1

        return "".join(out)

    def rewrite_schema_query(self, query: str) -> Optional[str]:
        """
        If query is an information_schema.COLUMNS query (Schema Explorer),
        rewrite it to filter only this evaluation's isolated physical tables.
        """
        if "information_schema.columns" not in query.lower() and "information_schema.tables" not in query.lower():
            return None

        # Build list of quoted physical table names
        physical_names = [f"'{p}'" for p in self.logical_to_physical.values()]
        if not physical_names:
            return query

        in_clause = ", ".join(physical_names)
        table_col = "table_name" if "table_name" in query else "TABLE_NAME"

        # If query already has WHERE clause, inject AND table_name IN (...)
        # Otherwise append WHERE table_name IN (...)
        if re.search(r"\bWHERE\b", query, re.IGNORECASE):
            rewritten = re.sub(
                r"(\bWHERE\b\s+)(.*?)(\bORDER\b|\bGROUP\b|;|$)",
                rf"\1(\2) AND {table_col} IN ({in_clause}) \3",
                query,
                flags=re.IGNORECASE | re.DOTALL
            )
            return rewritten
        else:
            rewritten = re.sub(
                r"(\bFROM\s+[^\s;]+)(.*?)(\bORDER\b|\bGROUP\b|;|$)",
                rf"\1 WHERE {table_col} IN ({in_clause})\2\3",
                query,
                flags=re.IGNORECASE | re.DOTALL
            )
            return rewritten


class EvaluationCollectionResolver:
    """
    Central abstraction for mapping logical MongoDB collection names to physical isolated collection names
    and rewriting MongoDB operations/pipelines.
    """

    def __init__(
        self,
        evaluation_uuid: str,
        user_uuid: str,
        lab_uuid: str,
        collection_map: Optional[Dict[str, str]] = None,
    ):
        self.evaluation_uuid = str(evaluation_uuid).strip()
        self.user_uuid = str(user_uuid).strip()
        self.lab_uuid = str(lab_uuid).strip()

        # Key: logical collection name (lowercase), Value: physical collection name
        self.logical_to_physical: Dict[str, str] = {}
        # Key: physical collection name (lowercase), Value: logical collection name
        self.physical_to_logical: Dict[str, str] = {}

        if collection_map:
            for logical, physical in collection_map.items():
                self.register_collection(logical, physical)

    def register_collection(self, logical_name: str, physical_name: Optional[str] = None) -> str:
        """Register a logical collection and return its physical name."""
        clean_logical = sanitize_identifier(logical_name).lower()
        if not physical_name:
            physical_name = build_isolated_table_name(
                self.evaluation_uuid,
                self.user_uuid,
                self.lab_uuid,
                clean_logical,
                dialect="mongodb"
            )
        self.logical_to_physical[clean_logical] = physical_name
        self.physical_to_logical[physical_name.lower()] = clean_logical
        return physical_name

    def get_physical_collection_name(self, logical_name: str) -> str:
        """Get or generate the physical collection name for a logical collection."""
        clean_logical = sanitize_identifier(logical_name).lower()
        if clean_logical in self.logical_to_physical:
            return self.logical_to_physical[clean_logical]
        return self.register_collection(clean_logical)

    def get_logical_collection_name(self, physical_name: str) -> Optional[str]:
        """Reverse map a physical collection name back to its logical collection name."""
        clean_physical = sanitize_identifier(physical_name).lower()
        return self.physical_to_logical.get(clean_physical)

    def is_physical_collection_for_this_eval(self, col_name: str) -> bool:
        """Check if a physical collection name belongs to this evaluation attempt."""
        clean = sanitize_identifier(col_name).lower()
        return clean in self.physical_to_logical

    def validate_collection_access(self, target_collection: str) -> str:
        """
        Validate that the student query targets an authorized collection.
        Raises SecurityException if the student attempts to access unauthorized collections,
        system collections, or other evaluations' physical collections directly.
        """
        clean = sanitize_identifier(target_collection).strip()
        clean_lower = clean.lower()

        # Disallow system collections
        if clean_lower.startswith("system.") or clean_lower.startswith("_yuvro_"):
            raise SecurityException(f"Access to internal collection '{clean}' is prohibited.")

        # Disallow direct access to other evaluation collections or raw physical names
        if clean_lower.startswith("evaluation_") or clean_lower.startswith("eval_"):
            if not self.is_physical_collection_for_this_eval(clean_lower):
                raise SecurityException(f"Access to evaluation collection '{clean}' is prohibited.")
            # Map back to logical
            logical = self.get_logical_table_name(clean_lower)
            if logical:
                return self.get_physical_collection_name(logical)

        if self.logical_to_physical and clean_lower not in self.logical_to_physical:
            allowed = ", ".join(sorted(self.logical_to_physical.keys()))
            raise SecurityException(
                f"Unauthorized collection '{clean}'. Allowed collections for this lab: [{allowed}]"
            )

        return self.get_physical_collection_name(clean_lower)

    def rewrite_pipeline(self, pipeline: list) -> list:
        """
        Recursively rewrite collection references in an aggregation pipeline
        such as $lookup (from), $out, and $merge.
        """
        import copy
        rewritten = copy.deepcopy(pipeline)
        for stage in rewritten:
            if not isinstance(stage, dict):
                continue
            if "$lookup" in stage and isinstance(stage["$lookup"], dict):
                lookup = stage["$lookup"]
                if "from" in lookup:
                    orig_from = lookup["from"]
                    lookup["from"] = self.validate_collection_access(orig_from)
                if "pipeline" in lookup and isinstance(lookup["pipeline"], list):
                    lookup["pipeline"] = self.rewrite_pipeline(lookup["pipeline"])
            elif "$out" in stage and isinstance(stage["$out"], str):
                stage["$out"] = self.validate_collection_access(stage["$out"])
            elif "$merge" in stage:
                if isinstance(stage["$merge"], str):
                    stage["$merge"] = self.validate_collection_access(stage["$merge"])
                elif isinstance(stage["$merge"], dict) and "into" in stage["$merge"]:
                    stage["$merge"]["into"] = self.validate_collection_access(stage["$merge"]["into"])
        return rewritten
