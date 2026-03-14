require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const migrations = [
  "add_status_columns.sql",
  "receipt_schema_update.sql",
  "update_receipt_trigger.sql",
  "add_ledger_idempotency.sql",
  "add_outbox_inbox.sql",
];

(async () => {
  for (const file of migrations) {
    const sql = fs.readFileSync(
      path.join(__dirname, "database", file),
      "utf8"
    );
    await pool.query(sql);
    console.log(`Migration completed: ${file}`);
  }
  console.log("All migrations completed.");
  process.exit(0);
})().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
