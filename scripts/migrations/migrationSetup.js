const mongoose = require("mongoose");

require("../../startup/db")(process.env.NODE_ENV);

async function runMigration(migrationFn) {
  try {
    await migrationFn();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

module.exports = { runMigration };
