const {pool}  = require('../db'); // Import the database connection
console.log("pool: ", pool);

const timerState = {
    start: null
};

/*
async function startTimer(user_id, activity_name) {
    
    const result = await pool.query(
        `INSERT INTO time_entries (user_id, activity_name, start_time)
        VALUES ($1, $2, NOW() RETURNING *`,
        [user_id, activity_name]
    );
    return result.rows[0];
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
*/

async function startTimer(start) {
    console.log("editing timerState:");
    timerState.start = start;
    console.log("edited timerState:", timerState.start);
}


async function stopTimer(email, activity) {
    project = null;
    end = new Date();
    console.log("stopTimer called"); // debug
    try {
        // get primary key given email
        const userQuery = await pool.query(
            `SELECT id FROM "tracker-users" WHERE email = $1;`,
            [email]
        );

        // If no user is found, return an error
        if (userQuery.rows.length === 0) {
            throw new Error("User not found");
        }

        const userId = userQuery.rows[0].id;

        const query = await pool.query(
            `INSERT INTO "tracker-activity" (userid, "activityName", project, start, "end") VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
        [userId, activity, project, timerState.start, end.toISOString()] // userid is the foreign key referencing the email field of tracker-users
        );
        //const res = await pool.query('SELECT NOW()');
        //return `Database connected at:, ${res.rows[0].now}`;
    } catch (error) {
        console.error("Error stopping timer: ", error.message);
    }
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