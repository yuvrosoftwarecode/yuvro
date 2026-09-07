import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMysqlQuery = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;

    if (!query || !query.trim()) {
      return { columns: [], rows: [], note: "No query provided.", ms: 0 };
    }

    if (!uri || !uri.trim()) {
      return { error: "MySQL connection URL is required.", columns: [], rows: [], note: "", ms: 0 };
    }

    const mysql = await import("mysql2/promise");

    let connection;
    try {
      const start = Date.now();
      
      // Parse URI into explicit parameters to ensure SSL/TLS settings are properly applied
      let connConfig: any;
      try {
        const parsedUrl = new URL(uri.trim());
        connConfig = {
          host: parsedUrl.hostname || "localhost",
          port: Number(parsedUrl.port) || 3306,
          user: decodeURIComponent(parsedUrl.username || "root"),
          password: decodeURIComponent(parsedUrl.password || ""),
          database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, "") : undefined,
          multipleStatements: true,
          connectTimeout: 10000,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      } catch (e) {
        connConfig = {
          uri: uri.trim(),
          multipleStatements: true,
          connectTimeout: 10000,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      }

      try {
        connection = await mysql.createConnection(connConfig);
      } catch (sslErr: any) {
        // Fallback without SSL for local non-SSL MySQL instances
        const { ssl, ...noSslConfig } = connConfig;
        connection = await mysql.createConnection(noSslConfig);
      }

      const [rows, fields] = await connection.query(query);
      const ms = Date.now() - start;

      let dataRows: any = Array.isArray(rows) ? rows : [rows];

      // Handling multi-statements if multiple queries are sent
      if (dataRows.length > 0 && Array.isArray(dataRows[0])) {
        dataRows = dataRows[dataRows.length - 1]; // return last result
      }

      // If it's an update/insert, it might return a ResultSetHeader instead of an array
      if (!Array.isArray(dataRows) && typeof dataRows === "object" && "affectedRows" in dataRows) {
        return {
          columns: [],
          rows: [],
          note: `Query executed. ${(dataRows as any).affectedRows} row(s) affected.`,
          ms,
        };
      }

      if (dataRows.length === 0) {
        return { columns: [], rows: [], note: "Query executed successfully. 0 rows returned.", ms };
      }

      const columns = Object.keys(dataRows[0] || {});
      const safeResult = JSON.parse(JSON.stringify(dataRows));

      return {
        columns,
        rows: safeResult,
        note: `${safeResult.length} row(s) returned`,
        ms,
      };
    } catch (err: any) {
      const errMsg = err?.message || err?.sqlMessage || (typeof err === "string" ? err : "Database connection failed");
      return {
        error: `MySQL Error: ${errMsg}`,
        columns: [],
        rows: [],
        note: "",
        ms: 0,
      };
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (e) {}
      }
    }
  },
);

export const fetchRemoteMysqlSchema = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string } }) => {
    const { uri } = data;
    if (!uri || !uri.trim()) return [];

    const mysql = await import("mysql2/promise");
    let connection;
    try {
      let connConfig: any;
      try {
        const parsedUrl = new URL(uri.trim());
        connConfig = {
          host: parsedUrl.hostname || "localhost",
          port: Number(parsedUrl.port) || 3306,
          user: decodeURIComponent(parsedUrl.username || "root"),
          password: decodeURIComponent(parsedUrl.password || ""),
          database: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, "") : undefined,
          multipleStatements: true,
          connectTimeout: 8000,
          ssl: { rejectUnauthorized: false },
        };
      } catch (e) {
        connConfig = { uri: uri.trim(), multipleStatements: true, connectTimeout: 8000 };
      }

      try {
        connection = await mysql.createConnection(connConfig);
      } catch (sslErr) {
        if (connConfig.ssl) {
          const { ssl, ...noSsl } = connConfig;
          connection = await mysql.createConnection(noSsl);
        } else {
          throw sslErr;
        }
      }

      const [dbRows]: any = await connection.query("SELECT DATABASE() as db_name;");
      const dbName = dbRows?.[0]?.db_name || connConfig.database || "mysql_db";

      const [colRows]: any = await connection.query(`
        SELECT 
            c.TABLE_NAME as table_name,
            c.COLUMN_NAME as column_name,
            c.DATA_TYPE as data_type,
            c.IS_NULLABLE as is_nullable,
            c.COLUMN_DEFAULT as column_default,
            CASE WHEN c.COLUMN_KEY = 'PRI' THEN 'PK' WHEN c.COLUMN_KEY = 'MUL' THEN 'FK' ELSE '-' END as key_type
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
        WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
      `);

      const tablesMap = new Map<string, any>();
      for (const row of colRows) {
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
        type: "MySQL",
        tables,
      }];
    } catch (err: any) {
      console.error("fetchRemoteMysqlSchema error:", err.message);
      return [];
    } finally {
      if (connection) {
        try { await connection.end(); } catch (e) {}
      }
    }
  }
);

