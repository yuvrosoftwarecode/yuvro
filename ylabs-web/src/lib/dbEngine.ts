import * as _alasql from "alasql";
import * as _mingo from "mingo";

const alasql: any = (_alasql as any).default || _alasql;
const mingo: any = (_mingo as any).default || _mingo;

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

export function parseSqlTablesFromFiles(
  files: Record<string, string>,
  dbName = "yuvro_sql_lab",
  dbType: "MySQL" | "PostgreSQL" | "SQLite" = "MySQL"
): any[] {
  const tables: any[] = [];
  const sqlSources = [
    files["seed.sql"] || "",
    files["schema.sql"] || "",
    ...Object.entries(files || {})
      .filter(([k]) => k.endsWith(".sql") && k !== "seed.sql" && k !== "schema.sql")
      .map(([, v]) => v)
  ].join("\n\n");

  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?\w+[`"']?)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = createTableRegex.exec(sqlSources)) !== null) {
    const rawTableName = match[1].replace(/[`"']/g, "").trim();
    const body = match[2];
    if (tables.some(t => t.name.toLowerCase() === rawTableName.toLowerCase())) continue;

    const columns: any[] = [];
    const colDefs = body.split(/,(?![^()]*\))/).map(c => c.trim()).filter(Boolean);

    for (const line of colDefs) {
      if (!line || /^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|INDEX|CHECK)\b/i.test(line)) continue;
      const colMatch = line.match(/^[`"']?(\w+)[`"']?\s+([\w]+(?:\s*\([^)]*\))?)/i);
      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        const isPk = /PRIMARY\s+KEY/i.test(line);
        const isFk = /REFERENCES/i.test(line);
        columns.push({
          name: colName,
          type: colType,
          nullable: isPk || /NOT\s+NULL/i.test(line) ? "NO" : "YES",
          default: /DEFAULT/i.test(line) ? line.split(/DEFAULT/i)[1]?.trim()?.split(/\s+/)[0] || "-" : "-",
          key: isPk ? "PK" : isFk ? "FK" : "-"
        });
      }
    }
    tables.push({ name: rawTableName, columns, ddl: match[0].trim() });
  }

  if (tables.length > 0) {
    return [{ name: dbName, type: dbType, tables }];
  }
  return getAlasqlSchema();
}

export function parseMongoCollectionsFromFiles(
  files: Record<string, string>,
  dbName = "yuvro_mongo_lab"
): any[] {
  const seedCode = [
    files["seed.js"] || "",
    ...Object.entries(files || {}).filter(([k]) => k.endsWith(".js") && k !== "seed.js").map(([, v]) => v)
  ].join("\n\n");

  const tables: any[] = [];
  const insertRegex = /db\.(\w+)\.(?:insertMany|insertOne|insert)\s*\(\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*\)/gi;
  let match;
  while ((match = insertRegex.exec(seedCode)) !== null) {
    const colName = match[1];
    if (tables.some(t => t.name.toLowerCase() === colName.toLowerCase())) continue;

    const rawData = match[2];
    const columns: any[] = [];
    const fieldRegex = /([`"']?[\w_]+[`"']?)\s*:/g;
    const seenFields = new Set<string>();
    let fMatch;
    while ((fMatch = fieldRegex.exec(rawData)) !== null) {
      const fieldName = fMatch[1].replace(/[`"']/g, "");
      if (!seenFields.has(fieldName) && !["http", "https"].includes(fieldName)) {
        seenFields.add(fieldName);
        columns.push({
          name: fieldName,
          type: fieldName === "_id" || fieldName === "id" ? "ObjectId / Int" : "string / mixed",
          nullable: "YES",
          default: "-",
          key: fieldName === "_id" || fieldName === "id" ? "PK" : "-"
        });
      }
    }
    if (columns.length === 0) {
      columns.push({ name: "_id", type: "ObjectId", nullable: "NO", default: "-", key: "PK" });
    }
    tables.push({
      name: colName,
      columns,
      ddl: `// Collection ${colName}\ndb.createCollection("${colName}")`
    });
  }

  if (tables.length > 0) {
    return [{ name: dbName, type: "MongoDB", tables }];
  }
  return getMongoSchema();
}
