const { MongoClient } = require("mongodb");
const { Client } = require("pg");
require("dotenv").config();


async function migrate() {
  const mongo = await MongoClient.connect("mongodb://localhost:27017");
  const db = mongo.db("your_db");
  const data = await db.collection("your_collection").find().toArray();

  const pg = new Client({
    connectionString: "postgres://username:password@localhost:5432/yourdb",
  });
  await pg.connect();

  for (const item of data) {
    await pg.query("INSERT INTO users (name, email, age) VALUES ($1, $2, $3)", [
      item.name,
      item.email,
      item.age,
    ]);
  }

  console.log("Migration complete!");
  pg.end();
  mongo.close();
}

migrate();
