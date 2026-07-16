import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMysqlQuery = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;
    
    if (!query.trim()) {
      return { columns: [], rows: [], note: "No query provided.", ms: 0 };
    }
    
    const mysql = await import("mysql2/promise");
    
    let connection;
    try {
      const start = Date.now();
      // Enable multipleStatements to allow script execution
      connection = await mysql.createConnection({ uri, multipleStatements: true });
      
      const [rows, fields] = await connection.query(query);
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
      throw new Error(`MySQL Error: ${err.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });
