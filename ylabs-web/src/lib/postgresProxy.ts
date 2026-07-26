import { createServerFn } from "@tanstack/react-start";

export const executeRemotePostgresQuery = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;

    if (!query.trim()) {
      return { columns: [], rows: [], note: "No query provided.", ms: 0 };
    }

    const { Client } = await import("pg");
    const client = new Client({ connectionString: uri });

    try {
      const start = Date.now();
      await client.connect();

      const result = await client.query(query);
      const ms = Date.now() - start;

      // pg might return an array of results for multi-statement queries
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
      throw new Error(`PostgreSQL Error: ${err.message}`);
    } finally {
      await client.end();
    }
  },
);
