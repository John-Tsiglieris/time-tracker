require("dotenv").config();
const { Pool } = require("pg");


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testDB() {
    const res = await pool.query('SELECT NOW()');
    return `Database connected at:, ${res.rows[0].now}`;
}

/**
 * Finds an existing gmail user in the database or creates a new one.
 * @param {Object} email - The Google profile object from authentication.
 * @param {Array} profile.emails - The email array provided by Google.
 * @param {string} profile.photos - The profile photo array from Google.
 * @returns {Promise<Object>} - Returns the user object (existing or new).
 */
async function findOrCreate(email) {
    console.log("breakpoint1");
    const existingUser = await pool.query(
        `Select * FROM "tracker-users" WHERE email = $1`,
        [email]
    );
    console.log("existingUsers row length: ", existingUser.rows.length);
    // if user already exists then just log in a normal, else create new email
    if (existingUser.rows.length == 0) {
        console.log("breakpoint2");
        const result = await pool.query(
            `INSERT INTO "tracker-users" (email, password) VALUES ($1, null) RETURNING *`,
            [email]
        );
    } 
    console.log("breakpoint3");
}

/*
async function startTimer(start) {
    timerState.start = start;
}


async function stopTimer(email, activity) {
    project = null;
    end = new Date();
    try {
        const query = await pool.query(
            `INSERT INTO "tracker-activity" (userid, activityName, project, start, end) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
        [email, activity, project, timerState.start, end.toISOString()] // userid is the foreign key referencing the email field of tracker-users
        );
        //const res = await pool.query('SELECT NOW()');
        //return `Database connected at:, ${res.rows[0].now}`;
    } catch (error) {
        console.error("Error stopping timer: ", error.message);
    }
}
*/

async function createProject(email, project) {
    // get primary key given email
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

        // Create new project and associate it with userID
        const projectQuery = await pool.query(
            `INSERT INTO "tracker-projects" (userid, name) VALUES ($1, $2) RETURNING *;`,
            [userId, project]
        );
        console.log("projectQuery.rows[0]: ", projectQuery.rows[0]);
    } catch (error) {
        console.error("Error creating project: ", error.message);
    }
}

//================================================================================
// One time use functions

async function createSessionTable() {
    const query = await pool.query(
        `CREATE TABLE "session" (
            "sid" VARCHAR PRIMARY KEY,      -- Session ID (random string)
            "sess" JSON NOT NULL,           -- Session data (stored as JSON)
            "expire" TIMESTAMP NOT NULL     -- Expiration time (date + time)
        );`
    );
}

async function dropTable() {
    const query = await pool.query(
        `DROP table "session"`
    );
}

async function createProjectTable() {
    const query = await pool.query(
        `CREATE TABLE "tracker-projects" (
            "id" SERIAL PRIMARY KEY,      -- Primary
            "userid" INT NOT NULL,
            "name" TEXT,
            FOREIGN KEY ("userid") REFERENCES "tracker-users"("id") ON DELETE CASCADE           -- Primary key of user table
        );`
    );
}

async function createActivityTable() {
    const query = await pool.query(
        `CREATE TABLE "tracker-activity" (
            "id" SERIAL PRIMARY KEY, 
            "userid" INT NOT NULL,
            "activityName" TEXT,
            "project" INT,
            "start" TIMESTAMP,
            "end" TIMESTAMP,
            FOREIGN KEY ("userid") REFERENCES "tracker-users"("id") ON DELETE CASCADE,
            FOREIGN KEY ("project") REFERENCES "tracker-projects"("id") ON DELETE CASCADE
        );`
    )
}

async function deleteProjectTable() {
    const query = await pool.query(
        
        `DROP TABLE "tracker-projects";`
    )
}

async function deleteActivityTable() {
    const query = await pool.query(
        
        `DROP TABLE "tracker-activity";`
    )
}

//deleteActivityTable();
//deleteProjectTable();
//createProjectTable();
//createActivityTable();
//createProjectTable();
//console.log("dropping session");
//dropTable();
//createSessionTable();
testDB().then(console.log).catch(console.error);

module.exports = {pool, testDB, findOrCreate, createProject};