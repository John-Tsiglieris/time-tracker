console.log("Vercel test");

require("dotenv").config();
console.log("dovenv");
const express = require('express');
const serverless = require("serverless-http"); // Needed for Vercel
const passport = require('passport');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pdfService = require('./service/pdf-service');
const fs = require('fs');
//console.log("requires all good!"); //debug

// DB endpoints
const {pool, testDB, findOrCreate, createProject} = require("./db");

// Timer component endpoints
const {startTimer, stopTimer, getActiveTimers} = require('./service/timer');

// Calendar component endpoints
const {fetchActivities} = require('./service/calendar');

// helper functions
//const {debugPrintUser} = require("./helpers");

const router = express.Router();

const app = express();
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'  // Custom table name
    }),
    secret: "secret",
    resave: false,
    saveUninitalized: true, // Some bullshit that needs to be taken care of
    cookie: { secure: false }
})
);

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true })); // makes <form> elements functional

// Need Google credentials now
// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: "http://localhost:3000/auth/google/callback",
//         },
//         (accessToken, refreshToken, profile, done) => {  // I think these are made upon creation of a GoogleStrategy object
//             return done(null, profile);
//         }
//     )
// )

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/callback",
        },
        async (request,accessToken, refreshToken, profile, done) => {  // I think these are made upon creation of a GoogleStrategy object
            //console.log("Profile!\n", profile); //debug
            findOrCreate(profile["emails"][0].value);
            return done(null, profile);
        }
    )
)

// Passport serialization and deserialization
// Serialization --> saving users data inside session (in serialized/encrypted format????)
// Deserializing --> Retrieving user data when needed
passport.serializeUser((user, done) => done(null, user)); // could add an id field, but I don't think I will do so yet
passport.deserializeUser((userdata, done) => done(null, userdata));

const PORT = 12000;

// ===========================================================
// middleware functions
const getUserSessionEmail = (req, res, next) => {
    if(req.session.user) { // for regular user authentication
        user = req.session.user['email'];
        page = 'tracking';
    } else if (req.user) { // for passport authentication
        user = req.user.emails[0].value;
        page = 'analytics';
    } else {
        //console.log("no req.user");
        user = "anon";
        page = 'authPrompt';
    }
    next();
};

// ===========================================================
// AUTHENTICATION + DB DEBUG ROUTES
// Get all users
app.get("/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users");
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
});

// Get tables
app.get("/tables", async (reg, res) => {
    try {
        const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Cannot display tables");
    }
});
  
// Add a new user
app.post("/users", async (req, res) => {
const { email, password } = req.body;
console.log("REQ BODY");
console.log(req.body);
if (email.endsWith("@gmail.com")) {
    return res.status(400).send("Gmail accounts must use Google Login.");
}
try {
    //console.log("email:", email);
    // 1. Check for duplicate email
    const existingUser = await pool.query(
        `Select * FROM "tracker-users" WHERE email = $1`,
        [email]
    );
    if (existingUser.rows.length > 0) {
        return res.send(`
            <p>The email <strong>${email}</strong> is already registered.</p>
            <a href="/register">Try Again</a> | <a href="/login">Log in instead</a>
        `);
    }


    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10).catch(err => { throw new Error("Password encryption failed: " + err.message); });
    const result = await pool.query(
    `INSERT INTO "tracker-users" (email, password) VALUES ($1, $2) RETURNING *`,
    [email, hashedPassword]
    );
    console.log("Registration successful!");
    res.redirect("/");
    //res.json(req.session);
} catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
}
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const userResult = await pool.query(`SELECT * FROM "tracker-users" WHERE email = $1`, [email]);

        if (userResult.rows.length === 0) {
            return res.send(`
                <h1>Login Failed</h1>
                <p>Email not found.</p>
                <a href="/">Try Again</a>
            `);
        }

        const user = userResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.send(`
                <h1>Login Failed</h1>
                <p>Incorrect password.</p>
                <a href="/">Try Again</a>
            `);
        }

        // Store user session
        req.session.user = { email: user.email};
        //res.json(req.session);                        // ==== debug ====
        console.log(req.session);
        res.redirect('/');

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Server error");
    }
});

app.get('/loginPage', (req,res) => {
    res.render('login');
})

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/loginPage');
    });
});

// ===========================================================
  

// Set EJS as templating engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
    //console.log('/ session: \n', req.session); // debug
    if(req.session.user) { // for regular user authentication
        user = req.session.user['email'];
        page = 'tracking';
    } else if (req.user) { // for passport authentication
        user = req.user.emails[0].value;
        page = 'tracking';
    } else {
        //console.log("no req.user");
        user = "anon";
        page = 'authPrompt';
    }
    res.render(page, {user: user});
});

app.get('/tracking', (req, res) => {
    if(req.session.user) { // for regular user authentication
        user = req.session.user['email'];
        page = 'tracking';
    } else if (req.user) { // for passport authentication
        user = req.user.emails[0].value;
        page = 'tracking';
    } else {
        //console.log("no req.user");
        user = "anon";
        page = 'authPrompt';
    }
    res.render(page, {user: user});
});

app.get('/analytics', async (req, res) => {
    //console.log('/ session: \n', req.session); // debug
    //const result = await testDB(); // DEBUG log, no longer needed
    if(req.session.user) { // for regular user authentication
        user = req.session.user['email'];
        page = 'analytics';
    } else if (req.user) { // for passport authentication
        user = req.user.emails[0].value;
        page = 'analytics';
    } else {
        //console.log("no req.user");
        user = "anon";
        page = 'authPrompt';
    }
    //res.render(page, {user: user, test: result});
    res.render(page, {user: user,});
});

app.get('/register', (req,res) => {
    res.render("register");
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Logout failed");
        }
        res.clearCookie('connect.sid'); // Removes session cookie
        res.redirect('/'); // Redirect to homepage or login page
    });
});


app.get(
    "/auth/google",
    passport.authenticate('google', {scope: ["profile", "email"] })
);

/*
app.post("/auth/google/callback", passport.authenticate('google', {failureRedirect: "/"}), (req, res) => {
    //res.json(req.session);
    res.redirect("/");
});
*/

app.get("/auth/google/callback", passport.authenticate('google', {failureRedirect: "/"}), (req, res) => {
    //res.json(req.session);
    res.redirect("/");
});


app.get("/logout", (req, res) => {
    req.logOut(() => {
        res.redirect("/");
    });
})

app.get("/profile", (req, res) => {
    res.send(`Welcome ${req.user.email}`);
});

app.post('/getAnalytics', getUserSessionEmail, async (req, res, next) => {
    //const now = new Date();
    //const firstJan = new Date(now.getFullYear(), 0, 1);
    //const weekNumber = Math.ceil((((now - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
    const { weekNumber } = req.body;
    console.log("req.body: ", req.body);
    parsedWeekNumber = parseInt(weekNumber);
    console.log("weekNumber data: ", weekNumber, " weekNumber type: ", typeof weekNumber);
    console.log("parsedWeekNumber data: ", parsedWeekNumber, " parsedWeekNumber type: ", typeof ParsedWeekNumber);
    //console.log("req.body ", req.body); // debug
    //const { week } = req.body; // for some reason undefined
    //console.log("week: ", week);
    const filename = `analytics_week_${parsedWeekNumber}.pdf`;
    const activityData = await fetchActivities(user, parsedWeekNumber);

    const stream = res.writeHead(200, {  // send as a STREAM of data
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment;filename=${filename}.pdf`
    })

    pdfService.buildPDF( activityData,
        (chunk) => stream.write(chunk),
        () => stream.end()
    );
});

// ===========================================================
// Timer Component
app.get('/api/timer/start', getUserSessionEmail, (req, res) => {
    //const {user_id, activity_name} = req.body;
    //const result = startTimer(user_id, activity_name);
    console.log("router.post called");
    /*
    if (user_id) {
        print(user_id);
    } else {
        print("no user_id");
    }
    */
    let date = new Date();
    const result = startTimer(date.toISOString());
    res.redirect('/tracking');
})

app.post('/api/timer/stop', getUserSessionEmail, (req, res) => {
    const { activity_name } = req.body;
    const result = stopTimer(user, activity_name);
    res.json(result);
});

app.post("/api/createProject", getUserSessionEmail, (req, res) => {
    console.log("/api/createProject called"); //debug
    console.log("REQ.SESSION: ", req.session);
    const { project } = req.body;
    console.log("Project name: ", project); // debug
    //const email = req.session.user['email'];
    try {
        const result = createProject(user, project);
        res.redirect('/tracking');
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Create project failed");
    }
});

app.post("/api/calendar/getActivities", getUserSessionEmail, async (req,res) => {
    console.log("/api/calendar/getActivities called");
    const { week } = req.body;
    console.log("week number: ", week);
    console.log("req.body: ", req.body);
    try {
        const result = await fetchActivities(user, week);
        console.log("result: ");
        console.log(result);
        res.json(result);
        //res.end();
    } catch (error) {
        console.error("error with calendar.fetchActivities: ", error);
        res.status(500).send("Failure");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// ===========================================================
// DEBUG
app.get('/debug-session', (req, res) => {
    res.json(req.session);
});

//module.exports = {router, app};
//module.exports.handler = serverless(app); // Important for Vercel
module.exports = router;
module.exports = app;

// Export the handler for Vercel
//export default (req, res) => {
  //return app(req, res);
//};
//export default app;
