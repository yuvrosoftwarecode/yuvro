import alasql from "alasql";
import mingo from "mingo";

// Define Types
export type SqlRow = Record<string, string | number>;

let sqlInitialized = false;

function initSqlDb() {
  if (sqlInitialized) return;
  // Initialize Alasql Database
  alasql("CREATE DATABASE yuvro_sql_lab");
  alasql("USE yuvro_sql_lab");

  // Create Tables
  alasql(`CREATE TABLE customers (
    id INT PRIMARY KEY,
    name STRING,
    country STRING,
    signed_up_at DATE
  )`);

  alasql(`CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    amount DECIMAL,
    created_at TIMESTAMP
  )`);

  // Insert mock data
  const customers = [
    { id: 1, name: "Ada Lovelace", country: "UK", signed_up_at: "2024-02-11" },
    { id: 2, name: "Linus Torvalds", country: "FI", signed_up_at: "2024-05-04" },
    { id: 3, name: "Grace Hopper", country: "US", signed_up_at: "2023-09-30" },
    { id: 4, name: "Hedy Lamarr", country: "AT", signed_up_at: "2024-07-12" },
    { id: 5, name: "Alan Turing", country: "UK", signed_up_at: "2024-11-01" },
  ];
  customers.forEach(c => alasql("INSERT INTO customers VALUES (?, ?, ?, ?)", [c.id, c.name, c.country, c.signed_up_at]));

  const orders = [
    { id: 1, customer_id: 1, amount: 120.0, created_at: "2024-03-01" },
    { id: 2, customer_id: 1, amount: 45.5, created_at: "2024-04-12" },
    { id: 3, customer_id: 2, amount: 300.0, created_at: "2024-06-20" },
    { id: 4, customer_id: 4, amount: 80.25, created_at: "2024-08-09" },
    { id: 5, customer_id: 5, amount: 19.99, created_at: "2024-11-15" },
  ];
  orders.forEach(o => alasql("INSERT INTO orders VALUES (?, ?, ?, ?)", [o.id, o.customer_id, o.amount, o.created_at]));

  sqlInitialized = true;
}

export function runDynamicSqlQuery(query: string): { columns: string[]; rows: SqlRow[]; note: string; ms: number } {
  try {
    initSqlDb();
    const start = performance.now();
    // Execute query using alasql
    const results = alasql(query);
    const ms = Math.round(performance.now() - start);

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
    if (typeof data[0] === 'number') {
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

let mongoUsers = [
  { _id: 1, name: "Ada", email: "ada@example.com", country: "UK", active: true, createdAt: "2024-02-11" },
  { _id: 2, name: "Linus", email: "linus@example.com", country: "FI", active: true, createdAt: "2024-05-04" },
  { _id: 3, name: "Grace", email: "grace@example.com", country: "US", active: false, createdAt: "2023-09-30" },
  { _id: 4, name: "Alan", email: "alan@example.com", country: "UK", active: true, createdAt: "2024-11-01" },
];

let mongoOrders = [
  { _id: 1, userId: 1, category: "Books", amount: 12.5, status: "paid" },
  { _id: 2, userId: 2, category: "Music", amount: 9.99, status: "paid" },
  { _id: 3, userId: 1, category: "Books", amount: 4.2, status: "refunded" },
  { _id: 4, userId: 4, category: "Games", amount: 29.0, status: "paid" },
];

let dbCollections: Record<string, any[]> = {
  users: mongoUsers,
  orders: mongoOrders,
};

function executeMongoCommand(collectionName: string, method: string, args: any[]): any {
  let collection = dbCollections[collectionName];
  if (!collection) {
    collection = [];
    dbCollections[collectionName] = collection;
  }

  switch (method) {
    case 'find': {
      const query = args[0] || {};
      const projection = args[1];
      let queryResult = new mingo.Query(query).find(collection).all();
      // basic projection support
      if (projection) {
        queryResult = queryResult.map((doc: any) => {
          const res: any = {};
          const keys = Object.keys(projection);
          const isInclude = keys.some(k => projection[k] === 1);
          if (isInclude) {
            if (projection._id !== 0) res._id = doc._id;
            keys.forEach(k => { if (projection[k] === 1) res[k] = doc[k]; });
          } else {
            Object.assign(res, doc);
            keys.forEach(k => { if (projection[k] === 0) delete res[k]; });
          }
          return res;
        });
      }
      // Add methods for chained operations like .sort().limit()
      const chainable = queryResult;
      (chainable as any).sort = function(sortSpec: any) {
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
      (chainable as any).limit = function(n: number) {
        return this.slice(0, n);
      };
      (chainable as any).toArray = function() {
        return this;
      };
      return chainable;
    }
    case 'aggregate': {
      const pipeline = args[0] || [];
      return new mingo.Aggregator(pipeline).run(collection);
    }
    case 'insertOne': {
      const doc = args[0];
      if (!doc._id) doc._id = Date.now() + Math.random();
      collection.push(doc);
      return { acknowledged: true, insertedId: doc._id };
    }
    case 'insertMany': {
      const docs = args[0];
      docs.forEach((doc: any) => {
        if (!doc._id) doc._id = Date.now() + Math.random();
        collection.push(doc);
      });
      return { acknowledged: true, insertedCount: docs.length };
    }
    case 'updateOne': {
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
    case 'updateMany': {
      const filter = args[0];
      const update = args[1];
      let modified = 0;
      new mingo.Query(filter).find(collection).all().forEach((doc: any) => {
        if (update.$set) Object.assign(doc, update.$set);
        modified++;
      });
      return { acknowledged: true, matchedCount: modified, modifiedCount: modified };
    }
    case 'deleteOne': {
      const filter = args[0];
      const index = collection.findIndex(doc => new mingo.Query(filter).test(doc));
      if (index !== -1) {
        collection.splice(index, 1);
        return { acknowledged: true, deletedCount: 1 };
      }
      return { acknowledged: true, deletedCount: 0 };
    }
    case 'deleteMany': {
      const filter = args[0];
      const initialLength = collection.length;
      const query = new mingo.Query(filter);
      dbCollections[collectionName] = collection.filter(doc => !query.test(doc));
      return { acknowledged: true, deletedCount: initialLength - dbCollections[collectionName].length };
    }
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

export function runDynamicMongoQuery(queryStr: string): { rows: unknown[]; note: string; ms: number } {
  try {
    const start = performance.now();
    // Parse things like db.users.find({ ... }).sort({ ... }).limit(1)
    
    // We will evaluate the code inside a Sandbox
    const sandboxDb: any = {};
    const collections = ["users", "orders"]; // allow dynamic collection names based on proxy
    
    const dbProxy = new Proxy(sandboxDb, {
      get: (target, prop: string) => {
        return new Proxy({}, {
          get: (colTarget, method: string) => {
            return (...args: any[]) => {
              return executeMongoCommand(prop, method, args);
            };
          }
        });
      }
    });

    // Create a safe evaluation environment
    // eslint-disable-next-line no-new-func
    const evalFunc = new Function('db', `
      try {
        const result = ${queryStr};
        if (result && typeof result.toArray === 'function') {
           return result.toArray();
        }
        return result;
      } catch (e) {
        throw e;
      }
    `);

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
