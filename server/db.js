const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    password: "hello", // <--- Update this
    host: "localhost",
    port: 5432,
    database: "coreinventory"
});

module.exports = pool;