import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMongoQuery = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;

    if (!query || !query.trim()) {
      return { rows: [], note: "No query provided.", ms: 0 };
    }

    if (!uri || !uri.trim()) {
      return { error: "MongoDB connection URL is required.", rows: [], note: "", ms: 0 };
    }

    // Split multiple commands, e.g. db.users.insert() \n db.users.find()
    const commands = query
      .split(/(?=db\.)/)
      .map((s) => s.trim())
      .filter(Boolean);

    const { MongoClient } = await import("mongodb");

    let client;
    try {
      client = new MongoClient(uri.trim(), { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const database = client.db();

      let finalResult: any[] = [];
      let finalCollection = "";
      let finalMethod = "";
      const start = Date.now();

      for (const cmd of commands) {
        const match = cmd.match(/^db\.(\w+)\.(\w+)\((.*)\)\s*;?\s*$/s);
        if (!match) {
          throw new Error(
            `Unsupported MongoDB query format. Use db.collection.method(...)\nQuery was: ${cmd}`,
          );
        }

        const [, collectionName, method, argsStr] = match;
        finalCollection = collectionName;
        finalMethod = method;

        let args: any[] = [];
        if (argsStr.trim()) {
          try {
            const parser = new Function(`return [${argsStr}]`);
            args = parser();
          } catch (e: any) {
            throw new Error(`Failed to parse arguments for ${method}: ${e.message}`);
          }
        }

        const col = database.collection(collectionName);
        let result: any[] = [];

        if (method === "find") {
          result = await col.find(args[0] || {}).toArray();
        } else if (method === "insertOne") {
          const res = await col.insertOne(args[0]);
          result = [res];
        } else if (method === "insertMany") {
          const res = await col.insertMany(args[0]);
          result = [res];
        } else if (method === "updateOne") {
          const res = await col.updateOne(args[0], args[1]);
          result = [res];
        } else if (method === "updateMany") {
          const res = await col.updateMany(args[0], args[1]);
          result = [res];
        } else if (method === "deleteOne") {
          const res = await col.deleteOne(args[0]);
          result = [res];
        } else if (method === "deleteMany") {
          const res = await col.deleteMany(args[0]);
          result = [res];
        } else if (method === "replaceOne") {
          const res = await col.replaceOne(args[0], args[1]);
          result = [res];
        } else if (method === "aggregate") {
          result = await col.aggregate(args[0]).toArray();
        } else {
          throw new Error(
            `Method db.${collectionName}.${method}() is not currently supported by this proxy.`,
          );
        }
        finalResult = result;
      }

      await client.close();

      const ms = Date.now() - start;
      const safeResult = JSON.parse(JSON.stringify(finalResult));
      return {
        rows: safeResult,
        note: `Executed db.${finalCollection}.${finalMethod}() successfully on external DB`,
        ms,
      };
    } catch (e: any) {
      if (client) {
        try {
          await client.close();
        } catch (closeErr) {}
      }
      const errMsg = e?.message || (typeof e === "string" ? e : "MongoDB execution failed");
      return {
        error: `MongoDB Error: ${errMsg}`,
        rows: [],
        note: "",
        ms: 0,
      };
    }
  },
);

export const fetchRemoteMongoSchema = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { uri: string } }) => {
    const { uri } = data;
    if (!uri || !uri.trim()) return [];

    const { MongoClient } = await import("mongodb");
    let client;
    try {
      client = new MongoClient(uri.trim(), { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const db = client.db();
      const dbName = db.databaseName || "mongo_db";
      const collections = await db.listCollections().toArray();

      const tables: any[] = [];
      for (const col of collections) {
        const cName = col.name;
        if (cName.startsWith("system.")) continue;
        const sample = await db.collection(cName).findOne({});
        const columns: any[] = [];
        if (sample) {
          for (const key of Object.keys(sample)) {
            columns.push({
              name: key,
              type: typeof sample[key] === "object" && sample[key] !== null ? (sample[key]._bsontype || "Object") : typeof sample[key],
              nullable: "YES",
              default: "-",
              key: key === "_id" || key === "id" ? "PK" : "-",
            });
          }
        } else {
          columns.push({ name: "_id", type: "ObjectId", nullable: "NO", default: "-", key: "PK" });
        }

        tables.push({
          name: cName,
          columns,
          ddl: `// Collection: ${cName}`,
        });
      }

      return [{
        name: dbName,
        type: "MongoDB",
        tables,
      }];
    } catch (err: any) {
      console.error("fetchRemoteMongoSchema error:", err.message);
      return [];
    } finally {
      if (client) {
        try { await client.close(); } catch (e) {}
      }
    }
  }
);

