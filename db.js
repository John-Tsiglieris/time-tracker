require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testDB() {
    const res = await pool.query('SELECT NOW()');
    return `Database connected at:, ${res.rows[0].now}`;
}

testDB().then(console.log).catch(console.error);

module.exports = {pool, testDB};