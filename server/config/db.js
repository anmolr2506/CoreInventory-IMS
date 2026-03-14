const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  password: "Sian",
  host: "localhost",
  port: 5432,
  database: "coreinventory",
});

module.exports = pool;
