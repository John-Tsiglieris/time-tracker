require("dotenv").config();
const express = require('express');
const pool = require("./db");
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pdfService = require('./service/pdf-service');
const fs = require('fs');

// Timer component endpoints
const {startTimer, stopTimer, getActiveTimers} = require('./service/timer');

const router = express.Router();

const app = express();
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitalized: true,
})
);

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// Need Google credentials now
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/callback",
        },
        (accessToken, refreshToken, profile, done) => {  // I think these are made upon creation of a GoogleStrategy object
            return done(null, profile);
        }
    )
)

// Passport serialization and deserialization
// Serialization --> saving users data inside session (in serialized/encrypted format????)
// Deserializing --> Retrieving user data when needed
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const PORT = 3000;


// ===========================================================
// DATABASE DEBUG ROUTES
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
const { name, email } = req.body;
try {
    const result = await pool.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
    [name, email]
    );
    res.json(result.rows[0]);
} catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
}
});

// ===========================================================
  

// Set EJS as templating engine
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static('public'));

app.get('/', (req, res) => {
    if (req.user) {
        user = req.user.displayName
        page = 'tracking';
    } else {
        user = "anon";
        page = 'login';
    }
    res.render(page, {user: user});
});

app.get('/tracking', (req, res) => {
    if (req.user) {
        user = req.user.displayName
        page = 'tracking';
    } else {
        user = "anon";
        page = 'login';
    }
    res.render(page, {user: user});
});

app.get('/analytics', (req, res) => {
    if (req.user) {
        user = req.user.displayName
        page = 'analytics';
    } else {
        user = "anon";
        page = 'login';
    }
    res.render(page, {user: user});
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
    res.send(`Welcome ${req.user.displayName}`);
});

app.get('/invoice', (req, res, next) => {
    const stream = res.writeHead(200, {  // send as a STREAM of data
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=invoice.pdf'
    })

    pdfService.buildPDF(
        (chunk) => stream.write(chunk),
        () => stream.end()
    );
});

// ===========================================================
// Timer Component
router.post('/api/timer/start', (req, res) => {
    //const {user_id, activity_name} = req.body;
    //const result = startTimer(user_id, activity_name);
    print("router.post called");
    if (user_id) {
        print(user_id);
    } else {
        print("no user_id");
    }
    const result = startTimer();
    res.json(1);
})

router.post('/api/timer/stop', (req, res) => {
    //const { user_id } = req.body;
    //const result = stopTimer(user_id);
    const result = stopTimer();
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// ===========================================================
// DEBUG
app.get('/debug-session', (req, res) => {
    res.json(req.session);
});

module.exports = router; // Q: What does this do?
