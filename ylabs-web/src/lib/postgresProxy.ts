import { createServerFn } from "@tanstack/react-start";

export const executeRemotePostgresQuery = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;

    if (!query || !query.trim()) {
      return { columns: [], rows: [], note: "No query provided.", ms: 0 };
    }

    if (!uri || !uri.trim()) {
      return { error: "PostgreSQL connection URL is required.", columns: [], rows: [], note: "", ms: 0 };
    }

    const { Client } = await import("pg");

    let clientConfig: any;
    try {
      const parsedUrl = new URL(uri.trim());
      clientConfig = {
        host: parsedUrl.hostname || "localhost",
        port: Number(parsedUrl.port) || 5432,
        user: decodeURIComponent(parsedUrl.username || "postgres"),
        password: decodeURIComponent(parsedUrl.password || ""),
        database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, "") : undefined,
        ssl: uri.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      };
    } catch (e) {
      clientConfig = {
        connectionString: uri.trim(),
        ssl: uri.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      };
    }

    const client = new Client(clientConfig);

    try {
      const start = Date.now();
      await client.connect();

      const result = await client.query(query);
      const ms = Date.now() - start;

      let finalResult = result;
      if (Array.isArray(result)) {
        finalResult = result[result.length - 1];
      }

      if (!finalResult.rows || finalResult.rows.length === 0) {
        const count = finalResult.rowCount;
        if (count !== null && count !== undefined) {
          return { columns: [], rows: [], note: `Query executed. ${count} row(s) affected.`, ms };
        }
        return { columns: [], rows: [], note: "Query executed successfully. 0 rows returned.", ms };
      }

      const rows = finalResult.rows;
      const columns = finalResult.fields
        ? finalResult.fields.map((f: any) => f.name)
        : Object.keys(rows[0] || {});

      const safeResult = JSON.parse(JSON.stringify(rows));
      return {
        columns,
        rows: safeResult,
        note: `${safeResult.length} row(s) returned`,
        ms,
      };
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === "string" ? err : "Database connection failed");
      return {
        error: `PostgreSQL Error: ${errMsg}`,
        columns: [],
        rows: [],
        note: "",
        ms: 0,
      };
    } finally {
      try {
        await client.end();
      } catch (e) {}
    }
  },
);

export const fetchRemotePostgresSchema = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string } }) => {
    const { uri } = data;
    if (!uri || !uri.trim()) return [];

    const pg = await import("pg");
    const Client = pg.default?.Client || pg.Client;

    let client;
    try {
      const parsedUrl = new URL(uri.trim());
      const sslMode = parsedUrl.searchParams.get("sslmode");
      const useSsl = sslMode !== "disable" && (sslMode === "require" || sslMode === "prefer" || parsedUrl.hostname !== "localhost");

      const connConfig: any = {
        host: parsedUrl.hostname || "localhost",
        port: Number(parsedUrl.port) || 5432,
        user: decodeURIComponent(parsedUrl.username || "postgres"),
        password: decodeURIComponent(parsedUrl.password || ""),
        database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, "") : "postgres",
        connectionTimeoutMillis: 8000,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      };

      try {
        client = new Client(connConfig);
        await client.connect();
      } catch (sslErr) {
        if (connConfig.ssl) {
          const { ssl, ...noSsl } = connConfig;
          client = new Client(noSsl);
          await client.connect();
        } else {
          throw sslErr;
        }
      }

      const dbRes = await client.query("SELECT current_database() as db_name;");
      const dbName = dbRes.rows?.[0]?.db_name || connConfig.database || "postgres_db";

      const colRes = await client.query(`
        SELECT 
            c.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN 'PK' ELSE '-' END as key_type
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name, c.ordinal_position;
      `);

      const tablesMap = new Map<string, any>();
      for (const row of colRes.rows) {
        const tName = row.table_name;
        if (!tablesMap.has(tName)) {
          tablesMap.set(tName, {
            name: tName,
            columns: [],
            ddl: "",
          });
        }
        const tbl = tablesMap.get(tName);
        tbl.columns.push({
          name: row.column_name,
          type: String(row.data_type).toUpperCase(),
          nullable: row.is_nullable === "YES" ? "YES" : "NO",
          default: row.column_default !== null && row.column_default !== undefined ? String(row.column_default) : "-",
          key: row.key_type,
        });
      }

      const tables = Array.from(tablesMap.values()).map((tbl) => {
        const colLines = tbl.columns.map((c: any) => `  ${c.name} ${c.type}${c.nullable === "NO" ? " NOT NULL" : ""}${c.key === "PK" ? " PRIMARY KEY" : ""}`);
        tbl.ddl = `-- Table: ${tbl.name}\nCREATE TABLE ${tbl.name} (\n${colLines.join(",\n")}\n);`;
        return tbl;
      });

      return [{
        name: dbName,
        type: "PostgreSQL",
        tables,
      }];
    } catch (err: any) {
      console.error("fetchRemotePostgresSchema error:", err.message);
      return [];
    } finally {
      if (client) {
        try { await client.end(); } catch (e) {}
      }
    }
  }
);

