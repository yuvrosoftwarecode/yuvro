import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMysqlQuery = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;
    
    if (!query.trim()) {
      return { columns: [], rows: [], note: "No query provided.", ms: 0 };
    }
    
    const mysql = await import("mysql2");
    
    let connection: any;
    try {
      const start = Date.now();
      const connectionOptions: any = { uri, multipleStatements: true };
      if ((uri.includes('tidbcloud.com') || uri.includes('aivencloud.com')) && !uri.includes('ssl=')) {
        connectionOptions.ssl = { rejectUnauthorized: true };
      }
      
      const { rows, fields } = await new Promise<any>((resolve, reject) => {
        try {
          connection = mysql.createConnection(connectionOptions);
          connection.query(query, (err: any, results: any, flds: any) => {
            if (err) return reject(err);
            resolve({ rows: results, fields: flds });
          });
        } catch (e) {
          reject(e);
        }
      });
      const ms = Date.now() - start;
      
      let dataRows: any = Array.isArray(rows) ? rows : [rows];
      
      // Handling multi-statements if multiple queries are sent
      if (dataRows.length > 0 && Array.isArray(dataRows[0])) {
         dataRows = dataRows[dataRows.length - 1]; // return last result
      }
      
      // If it's an update/insert, it might return a ResultSetHeader instead of an array
      if (!Array.isArray(dataRows) && typeof dataRows === 'object' && 'affectedRows' in dataRows) {
        return { 
          columns: [], 
          rows: [], 
          note: `Query executed. ${(dataRows as any).affectedRows} row(s) affected.`, 
          ms 
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
        ms 
      };

    } catch (err: any) {
      console.error("MYSQL PROXY CAUGHT ERROR:", err, "MESSAGE:", err?.message);
      let errorMsg = err?.message || String(err);
      return { error: `MySQL Error: ${errorMsg}` };
    } finally {
      if (connection && typeof connection.end === 'function') {
        connection.end();
      }
    }
  });
