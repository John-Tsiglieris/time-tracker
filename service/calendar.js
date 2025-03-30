const {pool}  = require('../db'); // Import the database connection
//console.log("pool: ", pool); //debug

async function fetchActivities(user, week) {
    // get primary key given email
    const userQuery = await pool.query(
        `SELECT id FROM "tracker-users" WHERE email = $1;`,
        [user]
    );

    // If no user is found, return an error
    if (userQuery.rows.length === 0) {
        throw new Error("User not found");
    }

    const userId = userQuery.rows[0].id;

    
    const activityQuery = await pool.query(
        `SELECT * FROM "tracker-activity" WHERE userId = $1 
        AND EXTRACT(WEEK FROM "end") = $2
        AND EXTRACT(YEAR FROM "end") = EXTRACT(YEAR FROM NOW());`,
        [userId, week]
    );
    
    // DEBUG
    //console.log("fetching activities!");
    //console.log(activityQuery.rows);
    return(activityQuery.rows);
}


module.exports = { fetchActivities };