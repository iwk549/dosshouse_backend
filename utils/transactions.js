const mongodb = require("mongodb");
const config = require("config");

const dbConnect = async () => {
  const client = new mongodb.MongoClient(
    process.env.NODE_ENV !== "test"
      ? config.get("db")
      : "mongodb://localhost/dosshouse_tests"
  );
  return await client.connect();
};

const transactions = {};

transactions.executeTransactionRepSet = async (queries) => {
  let client = await dbConnect();
  const db = client.db();
  const session = client.startSession();
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
  });

  try {
    const options =
      process.env.NODE_ENV === "production"
        ? { session, returnOriginal: false }
        : {};
    let results = {};

    for (let property in queries) {
      let thisQ = queries[property];
      if (thisQ.data.arrayFilters) {
        options.arrayFilters = thisQ.data.arrayFilters;
        options.multi = true;
      }
      let result;
      if (thisQ.query === "insertOne") {
        result = await db
          .collection(thisQ.collection)
          .insertOne(thisQ.data, options);
      } else if (thisQ.query === "insertMany") {
        result = await db
          .collection(thisQ.collection)
          .insertMany(thisQ.data, options);
      } else if (thisQ.query === "deleteOne") {
        result = await db
          .collection(thisQ.collection)
          .deleteOne(thisQ.data, options);
      } else if (thisQ.query === "deleteMany") {
        result = await db
          .collection(thisQ.collection)
          .deleteMany(thisQ.data, options);
      } else if (thisQ.query === "updateOne") {
        result = await db
          .collection(thisQ.collection)
          .updateOne(thisQ.data.filter, thisQ.data.update, options);
      } else if (thisQ.query === "updateMany") {
        result = await db
          .collection(thisQ.collection)
          .updateMany(thisQ.data.filter, thisQ.data.update, options);
      } else if (thisQ.query === "replaceOne") {
        result = await db
          .collection(thisQ.collection)
          .replaceOne(thisQ.data.filter, thisQ.data.update);
      } else if (thisQ.query === "bulkWrite") {
      } else if (thisQ.query === "bulkWrite") {
        result = await db
          .collection(thisQ.collection)
          .bulkWrite(thisQ.data, options);
      } else
        throw {
          name: "Helper function for this query is not written.",
          collection: thisQ.collection,
          query: thisQ.query,
        };
      results[property] = result;
    }

    await session.commitTransaction();
    session.endSession();
    client.close();
    return results;
  } catch (ex) {
    await session.abortTransaction();
    session.endSession();
    client.close();
    return ex;
  }
};

module.exports = transactions;
