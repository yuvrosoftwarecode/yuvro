import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMongoQuery = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;
    
    if (!query.trim()) {
      return { rows: [], note: "No query provided.", ms: 0 };
    }

    const match = query.trim().match(/^db\.(\w+)\.(\w+)\((.*)\)\s*;?\s*$/s);
    if (!match) {
      throw new Error(`Unsupported MongoDB query format. Use db.collection.method(...)\nQuery was: ${query}`);
    }

    const [, collectionName, method, argsStr] = match;
    let args: any[] = [];
    if (argsStr.trim()) {
      try {
        const parser = new Function(`return [${argsStr}]`);
        args = parser();
      } catch (e: any) {
        throw new Error(`Failed to parse arguments: ${e.message}`);
      }
    }

    // Dynamically import to ensure it strictly runs on server side and doesn't leak to client bundle
    const { MongoClient } = await import("mongodb");
    
    let client;
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const db = client.db(); // connects to default DB in URI
      const col = db.collection(collectionName);

      let result: any[] = [];
      const start = Date.now();

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
        throw new Error(`Method db.${collectionName}.${method}() is not currently supported by this proxy.`);
      }

      await client.close();
      
      const ms = Date.now() - start;
      return { 
        rows: result, 
        note: `Executed db.${collectionName}.${method}() successfully on external DB`,
        ms 
      };

    } catch (e: any) {
      if (client) await client.close();
      throw new Error(`MongoDB Error: ${e.message}`);
    }
  });
