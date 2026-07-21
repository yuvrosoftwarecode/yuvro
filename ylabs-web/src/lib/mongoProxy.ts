import { createServerFn } from "@tanstack/react-start";

export const executeRemoteMongoQuery = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { uri: string; query: string } }) => {
    const { uri, query } = data;
    
    if (!query.trim()) {
      return { rows: [], note: "No query provided.", ms: 0 };
    }

    // Split multiple commands, e.g. db.users.insert() \n db.users.find()
    const commands = query.split(/(?=db\.)/).map(s => s.trim()).filter(Boolean);
    
    // Dynamically import to ensure it strictly runs on server side and doesn't leak to client bundle
    const { MongoClient } = await import("mongodb");
    
    let client;
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, tlsAllowInvalidCertificates: true });
      await client.connect();
      const database = client.db(); // connects to default DB in URI

      let finalResult: any[] = [];
      let finalCollection = "";
      let finalMethod = "";
      const start = Date.now();

      for (const cmd of commands) {
        const match = cmd.match(/^db\.(\w+)(?:\.(\w+))?\((.*)\)\s*;?\s*$/s);
        if (!match) {
          throw new Error(`Unsupported MongoDB query format. Use db.collection.method(...) or db.method(...)\nQuery was: ${cmd}`);
        }

        const part1 = match[1];
        const part2 = match[2];
        const argsStr = match[3];

        const collectionName = part2 ? part1 : "";
        const method = part2 ? part2 : part1;
        
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

        let result: any[] = [];

        if (collectionName) {
          const col = database.collection(collectionName);
          if (method === "find") {
            result = await col.find(args[0] || {}).toArray();
          } else if (method === "findOne") {
            const res = await col.findOne(args[0] || {});
            result = [res];
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
          } else if (method === "drop") {
            const res = await col.drop();
            result = [{ dropped: res }];
          } else {
            throw new Error(`Method db.${collectionName}.${method}() is not currently supported by this proxy.`);
          }
        } else {
          if (method === "createCollection") {
            await database.createCollection(args[0], args[1]);
            result = [{ ok: 1, collection: args[0] }];
          } else if (method === "dropDatabase") {
            const res = await database.dropDatabase();
            result = [{ dropped: res }];
          } else if (method === "getCollectionNames") {
            const cols = await database.listCollections().toArray();
            result = cols.map(c => c.name);
          } else {
            throw new Error(`Method db.${method}() is not currently supported by this proxy.`);
          }
        }
        finalResult = result;
      }

      await client.close();
      
      const ms = Date.now() - start;
      const safeResult = JSON.parse(JSON.stringify(finalResult));
      return { 
        rows: safeResult, 
        note: `Executed db.${finalCollection ? finalCollection + '.' : ''}${finalMethod}() successfully on external DB`,
        ms 
      };

    } catch (e: any) {
      if (client) await client.close();
      console.error("MONGO PROXY CAUGHT ERROR:", e, "MESSAGE:", e?.message);
      let errorMsg = e?.message || String(e);
      return { error: `MongoDB Error: ${errorMsg}` };
    }
  });
