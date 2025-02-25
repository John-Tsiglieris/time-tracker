/*
const pool = require("./db"); // was aready required in index.js???

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
*/

async function startTimer(user_id, activity_name) {
    /*
    const result = await pool.query(
        `INSERT INTO time_entries (user_id, activity_name, start_time)
        VALUES ($1, $2, NOW() RETURNING *`,
        [user_id, activity_name]
    );
    return result.rows[0];
    */
   print("timer.js.startTimer() called");
   return 0;
}

// stop a running timer
async function stopTimer(entry_id) {
    const result = await pool.query(
        `UPDATE time_entries SET end_time = NOW(),
        duration = end_time - start_time
        WHERE entry_id = $1 RETURNING *`,
        [entry_id]
    );
    return result.rows[0];
}

// Get time history for a user
async function getTimeHistory(user_id) {
    const result = await pool.query(
        `SELECT * FROM time_entries WHERE user_id = $1 ORDER BY start_time DESC`,
        [user_id]
    );
    return result.rows;
}

module.exports = { startTimer, stopTimer, getTimeHistory };