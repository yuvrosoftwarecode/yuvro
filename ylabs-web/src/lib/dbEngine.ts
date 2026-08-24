import mingo from "mingo";

// Define Types
export type SqlRow = Record<string, string | number>;

let sqlInitialized = false;
let alasqlInstance: any = null;

function getAlasqlInstance() {
  if (typeof window === "undefined") return null;
  if (!alasqlInstance) {
    try {
      // @ts-ignore
      alasqlInstance = window.alasql || null;
    } catch {
      alasqlInstance = null;
    }
  }
  return alasqlInstance;
}

function initSqlDb() {
  if (typeof window === "undefined" || sqlInitialized) return;

  const alasql = getAlasqlInstance();
  if (!alasql) return;

  const saved = localStorage.getItem("alasql_dbs");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      alasql.databases = parsed.databases;
      if (parsed.useid) alasql.use(parsed.useid);
    } catch (e) {
      console.error("Failed to parse alasql databases", e);
    }
  }

  sqlInitialized = true;
}

export function runDynamicSqlQuery(query: string): {
  columns: string[];
  rows: SqlRow[];
  note: string;
  ms: number;
} {
  try {
    if (typeof window === "undefined") {
      return { columns: [], rows: [], note: "Server-side execution skipped", ms: 0 };
    }
    initSqlDb();
    const alasql = getAlasqlInstance();
    if (!alasql) {
      return { columns: [], rows: [], note: "SQL query executed.", ms: 0 };
    }

    const start = performance.now();
    // Execute query using alasql
    const results = alasql(query);
    const ms = Math.round(performance.now() - start);

    try {
      localStorage.setItem(
        "alasql_dbs",
        JSON.stringify({
          databases: alasql.databases,
          useid: alasql.useid,
        }),
      );
    } catch (e) {
      console.warn("localStorage quota exceeded or error", e);
    }

    // alasql returns an array of objects for SELECTs, or a number for INSERT/UPDATE/DELETE.
    // Sometimes it returns an array of arrays if multiple statements were separated by `;`.
    let data = Array.isArray(results) ? results : [results];

    // If it's a multi-statement result, get the last one's result or flatten
    if (data.length > 0 && Array.isArray(data[0])) {
      data = data[data.length - 1]; // Just show the last statement's result
    }

    if (data.length === 0) {
      return { columns: [], rows: [], note: "Query executed successfully. 0 row(s) returned.", ms };
    }

    // if the result is just a number (e.g. from an UPDATE/DELETE/INSERT)
    if (typeof data[0] === "number") {
      return { columns: [], rows: [], note: `Query executed. ${data[0]} row(s) affected.`, ms };
    }

    const rows = data;
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, note: `${rows.length} row(s) returned`, ms };
  } catch (error: any) {
    return { columns: [], rows: [], note: `Error: ${error.message || error}`, ms: 0 };
  }
}

// --------------------------------------------------------------------------
// MONGODB ENGINE
// --------------------------------------------------------------------------

let dbCollections: Record<string, any[]> = {};
function executeMongoCommand(collectionName: string, method: string, args: any[]): any {
  let collection = dbCollections[collectionName];
  if (!collection) {
    collection = [];
    dbCollections[collectionName] = collection;
  }

  switch (method) {
    case "find": {
      const query = args[0] || {};
      const projection = args[1];
      let queryResult = new mingo.Query(query).find(collection).all();
      // basic projection support
      if (projection) {
        queryResult = queryResult.map((doc: any) => {
          const res: any = {};
          for (const k of Object.keys(projection)) {
            if (projection[k]) res[k] = doc[k];
          }
          return res;
        });
      }
      return queryResult;
    }
    case "findOne": {
      const query = args[0] || {};
      return new mingo.Query(query).find(collection).all()[0] || null;
    }
    case "insertOne": {
      const doc = { ...args[0], _id: args[0]._id || Math.random().toString(36).substring(7) };
      collection.push(doc);
      return { acknowledged: true, insertedId: doc._id };
    }
    case "insertMany": {
      const docs = args[0].map((d: any) => ({
        ...d,
        _id: d._id || Math.random().toString(36).substring(7),
      }));
      collection.push(...docs);
      return {
        acknowledged: true,
        insertedCount: docs.length,
        insertedIds: docs.map((d: any) => d._id),
      };
    }
    case "updateOne": {
      const query = args[0] || {};
      const update = args[1] || {};
      const doc = new mingo.Query(query).find(collection).all()[0];
      if (doc) {
        if (update.$set) Object.assign(doc, update.$set);
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            doc[k] = (doc[k] || 0) + (v as number);
          }
        }
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    case "updateMany": {
      const query = args[0] || {};
      const update = args[1] || {};
      const docs = new mingo.Query(query).find(collection).all();
      for (const doc of docs) {
        if (update.$set) Object.assign(doc, update.$set);
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            doc[k] = (doc[k] || 0) + (v as number);
          }
        }
      }
      return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
    }
    case "deleteOne": {
      const query = args[0] || {};
      const doc = new mingo.Query(query).find(collection).all()[0];
      if (doc) {
        dbCollections[collectionName] = collection.filter((d: any) => d !== doc);
        return { acknowledged: true, deletedCount: 1 };
      }
      return { acknowledged: true, deletedCount: 0 };
    }
    case "deleteMany": {
      const query = args[0] || {};
      const docs = new mingo.Query(query).find(collection).all();
      dbCollections[collectionName] = collection.filter((d: any) => !docs.includes(d));
      return { acknowledged: true, deletedCount: docs.length };
    }
    case "countDocuments": {
      const query = args[0] || {};
      return new mingo.Query(query).find(collection).all().length;
    }
    case "aggregate": {
      const pipeline = args[0] || [];
      const agg = new mingo.Aggregator(pipeline);
      return agg.run(collection);
    }
    case "drop": {
      dbCollections[collectionName] = [];
      return true;
    }
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

export function runDynamicMongoQuery(commandStr: string): {
  rows: any[];
  note: string;
  ms: number;
} {
  try {
    const start = performance.now();
    let cleaned = commandStr.trim();
    if (cleaned.endsWith(";")) cleaned = cleaned.slice(0, -1).trim();

    // Context mock for `db`
    const dbProxy = new Proxy(
      {},
      {
        get(_, collectionName: string) {
          return new Proxy(
            {},
            {
              get(__, methodName: string) {
                return (...args: any[]) =>
                  executeMongoCommand(collectionName, methodName, args);
              },
            },
          );
        },
      },
    );

    // Evaluate the query in a Function with `db` scope
    // e.g. "db.users.find({ age: { $gt: 20 } })"
    const evalFunc = new Function(
      "db",
      `
      return ${cleaned};
    `,
    );

    const result = evalFunc(dbProxy);
    const ms = Math.round(performance.now() - start);

    if (Array.isArray(result)) {
      return { rows: result, note: `${result.length} document(s) returned`, ms };
    } else {
      return { rows: [result], note: `Command executed`, ms };
    }
  } catch (error: any) {
    return { rows: [], note: `Error: ${error.message || error}`, ms: 0 };
  }
}

export function getAlasqlSchema() {
  try {
    if (typeof window === "undefined") return [];
    initSqlDb();
    const alasql = getAlasqlInstance();
    if (!alasql || !alasql.databases) return [];

    const schemas: any[] = [];
    for (const dbName of Object.keys(alasql.databases)) {
      if (dbName === "alasql") continue; // skip the internal engine db

      const db = alasql.databases[dbName];
      if (!db || !db.tables) continue;
      const schema: any = { name: dbName, type: "SQLite", tables: [] };
      for (const tableName of Object.keys(db.tables)) {
        const table = db.tables[tableName];
        schema.tables.push({
          name: tableName,
          columns: table.columns
            ? table.columns.map((c: any) => ({
                name: c.columnid,
                type: c.dbtypeid || "VARCHAR",
                nullable: "YES",
                default: "-",
                key: "-",
              }))
            : [],
          ddl: `-- Table created in ${dbName}\nCREATE TABLE ${tableName} (...);`,
        });
      }
      schemas.push(schema);
    }
    return schemas;
  } catch (e) {
    return [];
  }
}

export function getMongoSchema() {
  const schema: any = { name: "yuvro_mongo_lab", type: "MongoDB", tables: [] };
  for (const [colName, docs] of Object.entries(dbCollections)) {
    let columns: any[] = [];
    if (docs.length > 0) {
      columns = Object.keys(docs[0]).map((k) => ({
        name: k,
        type: typeof docs[0][k],
        nullable: "YES",
        default: "-",
        key: "-",
      }));
    } else {
      columns = [{ name: "_id", type: "string", nullable: "NO", default: "-", key: "PK" }];
    }
    schema.tables.push({
      name: colName,
      columns,
      ddl: `// Collection created dynamically\ndb.createCollection("${colName}")`,
    });
  }
  return [schema];
}
