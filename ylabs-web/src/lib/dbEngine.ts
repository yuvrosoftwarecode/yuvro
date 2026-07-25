import alasql from "alasql";
import mingo from "mingo";
import alasql from "alasql";
import mingo from "mingo";

// Define Types
export type SqlRow = Record<string, string | number>;

let sqlInitialized = false;

function initSqlDb() {
  if (sqlInitialized) return;

  if (typeof window !== "undefined") {
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
    initSqlDb();
    const start = performance.now();
    // Execute query using alasql
    const results = alasql(query);
    const ms = Math.round(performance.now() - start);

    if (typeof window !== "undefined") {
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
          const keys = Object.keys(projection);
          const isInclude = keys.some((k) => projection[k] === 1);
          if (isInclude) {
            if (projection._id !== 0) res._id = doc._id;
            keys.forEach((k) => {
              if (projection[k] === 1) res[k] = doc[k];
            });
          } else {
            Object.assign(res, doc);
            keys.forEach((k) => {
              if (projection[k] === 0) delete res[k];
            });
          }
          return res;
        });
      }
      // Add methods for chained operations like .sort().limit()
      const chainable = queryResult;
      (chainable as any).sort = function (sortSpec: any) {
        // very basic sort
        const keys = Object.keys(sortSpec);
        this.sort((a: any, b: any) => {
          for (const k of keys) {
            const dir = sortSpec[k] === -1 ? -1 : 1;
            if (a[k] < b[k]) return -1 * dir;
            if (a[k] > b[k]) return 1 * dir;
          }
          return 0;
        });
        return this;
      };
      (chainable as any).limit = function (n: number) {
        return this.slice(0, n);
      };
      (chainable as any).toArray = function () {
        return this;
      };
      return chainable;
    }
    case "aggregate": {
      const pipeline = args[0] || [];
      return new mingo.Aggregator(pipeline).run(collection);
    }
    case "insertOne": {
      const doc = args[0];
      if (!doc._id) doc._id = Date.now() + Math.random();
      collection.push(doc);
      return { acknowledged: true, insertedId: doc._id };
    }
    case "insertMany": {
      const docs = args[0];
      docs.forEach((doc: any) => {
        if (!doc._id) doc._id = Date.now() + Math.random();
        collection.push(doc);
      });
      return { acknowledged: true, insertedCount: docs.length };
    }
    case "updateOne": {
      const filter = args[0];
      const update = args[1];
      const doc = new mingo.Query(filter).find(collection).next();
      if (doc) {
        // Simple mock of $set
        if (update.$set) Object.assign(doc, update.$set);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    case "updateMany": {
      const filter = args[0];
      const update = args[1];
      let modified = 0;
      new mingo.Query(filter)
        .find(collection)
        .all()
        .forEach((doc: any) => {
          if (update.$set) Object.assign(doc, update.$set);
          modified++;
        });
      return { acknowledged: true, matchedCount: modified, modifiedCount: modified };
    }
    case "deleteOne": {
      const filter = args[0];
      const index = collection.findIndex((doc) => new mingo.Query(filter).test(doc));
      if (index !== -1) {
        collection.splice(index, 1);
        return { acknowledged: true, deletedCount: 1 };
      }
      return { acknowledged: true, deletedCount: 0 };
    }
    case "deleteMany": {
      const filter = args[0];
      const initialLength = collection.length;
      const query = new mingo.Query(filter);
      dbCollections[collectionName] = collection.filter((doc) => !query.test(doc));
      return {
        acknowledged: true,
        deletedCount: initialLength - dbCollections[collectionName].length,
      };
    }
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

export function runDynamicMongoQuery(queryStr: string): {
  rows: unknown[];
  note: string;
  ms: number;
} {
  try {
    const start = performance.now();
    // Parse things like db.users.find({ ... }).sort({ ... }).limit(1)

    // We will evaluate the code inside a Sandbox
    const sandboxDb: any = {};
    const collections = ["users", "orders"]; // allow dynamic collection names based on proxy

    const dbProxy = new Proxy(sandboxDb, {
      get: (target, prop: string) => {
        return new Proxy(
          {},
          {
            get: (colTarget, method: string) => {
              return (...args: any[]) => {
                return executeMongoCommand(prop, method, args);
              };
            },
          },
        );
      },
    });

    // Create a safe evaluation environment
    const evalFunc = new Function(
      "db",
      `
      try {
        const result = eval(${JSON.stringify(queryStr)});
        if (result && typeof result.toArray === 'function') {
           return result.toArray();
        }
        return result;
      } catch (e) {
        throw e;
      }
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
    initSqlDb();
    const schemas: any[] = [];
    for (const dbName of Object.keys(alasql.databases)) {
      if (dbName === "alasql") continue; // skip the internal engine db

      const db = alasql.databases[dbName];
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
