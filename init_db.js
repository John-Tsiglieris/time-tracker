const pool = require("./db");

const createTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE NOT NULL
            );`
        );
        console.log("Table created!");
    } catch (err) {
        console.error("Error creating table:", err);
      } finally {
        pool.end();
      }
    };
    
    createTable();