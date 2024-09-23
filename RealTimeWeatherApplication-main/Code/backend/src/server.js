// This file defines an Express.js application that serves as the backend for a web application.
// It includes routes for handling user authentication (login, logout, create account), profile management,
// weather and forecast data retrieval, user management (accessible only to admin users), and database commands
// for CRUD (Create, Read, Update, Delete) operations on users. The application uses SQLite as the database backend and incorporates
// session management for user authentication. Additionally, it interacts with external APIs to fetch weather
// and forecast data. Each section of the file is commented to explain its purpose and functionality.


// APPLICATION SETUP
// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const axios = require('axios'); // For making HTTP requests
const express = require('express'); // Web framework for Node.js
const path = require('path'); // For handling file paths
const bodyParser = require('body-parser'); // Middleware to parse request bodies
const sqlite3 = require("sqlite3").verbose(); // SQLite database library
const bcrypt = require('bcrypt'); // For password hashing
const validator = require("email-validator"); // For email validation
const session = require('express-session'); // For managing user sessions

// Create an Express application
const app = express();
// Define the port number to listen on, defaulting to 3000
const port = process.env.PORT || 3000;
// Number of salt rounds for bcrypt hashing
const saltRounds = 10;
// Import the User model from the models file
const { User, Trip, Location } = require('./models');
const e = require('express');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../frontend/src/public')));
// Parse JSON request bodies
app.use(express.json());

// Variable to store SQL queries
let sql;

// Connect to the SQLite database
const db = new sqlite3.Database('./backend/src/test.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create users table if it doesn't exist
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, first_name TEXT, last_name TEXT, role TEXT)");
});

// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Set the path of views folder
app.set('views', path.join(__dirname, '../../frontend/src/views'))
// Use body-parser middleware to parse URL-encoded request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET, // Secret key for session encryption
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true when using HTTPS
}));


// VIEWS AND PAGE RENDERING

// LOGIN PAGE
app.get('/', (req, res) => {
    res.redirect('/login_page');
});

// Render login page
app.get('/login_page', (req, res) => {
    res.render('login_page');
});

// Handle login form submission
app.post('/login_page', (req, res) => {
    // Retrieve email and password from request body
    const { email, password } = req.body;
    // SQL query to select user with given email
    sql = 'SELECT * FROM User WHERE email = ?';
    // Execute SQL query
    db.get(sql, [email], (err, user) => {
        // Handle error
        if (err) {
            console.error(err.message);
            return res.status(500).send("An error occurred while checking login credentials.");
        }
        // Check if user exists
        if (user) {
            // Compare passwords (temporary solution - should use bcrypt.compare)
            if (password === user.password) {
                console.log("Authentication successful, redirecting to home page.");
                req.session.user = user;
                res.redirect("/home_page");
            } else {
                console.log("Authentication failed, rendering login page with error.");
                res.render('login_page', { errorMessage: 'Invalid Username or Password' });
            }
        } else {
            // No user found with that email address
            res.render('login_page', { errorMessage: 'Invalid Username or Password' });
        }
    });
});


// LOGOUT PAGE
app.post('/log_out', (req, res) => {
    req.session.destroy();
    res.redirect('/login_page');
});


// CREATE ACCOUNT PAGE
app.get('/login_page_create_account', (req, res) => {
    res.redirect('create_account');
});

// Render create account page
app.get('/create_account', (req, res) => {
    res.render('create_account');
});

// Handle create account form submission
app.post('/create_account', async (req, res) => {
    // Retrieve form data
    const { email, password, first_name, last_name, role } = req.body;
    // Validate email
    const email_is_valid = validator.validate(email);

    // Email validation
    if (!email_is_valid) {
        // Return error message to user
        return res.send("Please enter a valid email address.");
    }

    // Password length check
    if (password.length <= 5) {
        // Return error message to user
        return res.send("Password must be at 6 characters or more.");
    } else if (password.length > 64) {
        return res.send("Password must be 64 characters or less.")
    }

    try {
        // Check if email already exists
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            // Return error message to user
            return res.send("Email already in use.");
        }

        // TODO
        // Hash password (temporary solution - should use bcrypt.hash)
        const plainTextPassword = password; // Storing password in plain text

        // Insert new user into the database
        const sql = 'INSERT INTO User(email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)';
        await db.run(sql, [email, plainTextPassword, first_name, last_name, role]);

        // Redirect to login page after successful account creation
        res.redirect('/login_page');
    } catch (error) {
        console.error(error.message);
        res.send("An error occurred while creating your account. Please try again.");
    }
});


// HOME PAGE
app.get('/home_page', (req, res) => {
    if(!req.session.user) {
        return res.redirect('/login_page');
    }
    res.render('home_page');
});


// PROFILE PAGE
app.get('/profile_page', async (req, res) => {
    const user = req.session.user;

    // Check if user is logged in
    if (!user) {
        // If user is not logged in, redirect to login page
        return res.redirect('/login_page');
    }

    // Retrieve user ID from user object
    const userId = user.id;
    // Query the database to get user data using the user ID
    const query = 'SELECT * FROM User WHERE id = ?';
    db.get(query, [userId], (error, user) => {
        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).send('Internal Server Error');
        }

        if (!user) {
            // Handle case when user is not found
            console.log('User not found');
            return res.status(404).send('User not found');
        }

        // User data retrieved successfully, render profile page with user data
        res.render('profile_page', { user });
    });
});


// USER MANAGEMENT PAGE
app.get('/user_management', isAdmin, (req, res) => {
    const sql = 'SELECT * FROM User';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("An error occurred while fetching users.");
            return;
        }
        // Render the user management dashboard with the list of users
        res.render('user_management', { users: rows });
    });
});


// WEATHER PAGE
app.get('/weather_page', async (req, res) => {
    const cityName = req.query.city || 'Milwaukee'; // Use the city from query, else default to Milwaukee
    const apiKey = process.env.OPENWEATHER_API_KEY;

    try {
        const weatherResponse = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=imperial`);
        const weatherData = weatherResponse.data;

        // Extract latitude and longitude for the map centering
        const lat = weatherData.coord.lat;
        const lon = weatherData.coord.lon;

        //URL for wather icons
        const iconUrl = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;

        res.render('weather_page', {
            weather: weatherData,
            lat: lat,
            lon: lon,
            zoomLevel: 10, // Can adjust zoom here
            weatherApiKey: apiKey,
            cityName: cityName,
            iconUrl: iconUrl 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while fetching the weather data.");
    }
});

// Endpoint to fetch forecast data
app.get('/forecast', async (req, res) => {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching forecast data:', error);
        res.status(500).json({ error: error.message });
    }
});


// TRIP PLANNER PAGE
// Render trip planner page
app.get('/trip_planner', (req, res) => {
    res.render('trip_planner');
});


app.post('/save_trip', (req, res) => {
    const { name, locations } = req.body;
    const userId = req.session.user.id;

    // First, verify the user exists
    const userSql = 'SELECT * FROM User WHERE id = ?';
    db.get(userSql, [userId], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            return res.status(500).send("An error occurred while checking user.");
        }
        if (!user) {
            return res.status(404).send("User not found.");
        }

        // User exists, now create the trip
        const tripSql = 'INSERT INTO Trips (name, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)';
        const now = new Date().toISOString();
        db.run(tripSql, [name, userId, now, now], function(err) {
            if (err) {
                console.error('Error saving trip:', err.message);
                return res.status(500).send("Failed to save trip.");
            }

            const tripId = this.lastID;
            // Handle locations (assuming locations is an array of location names)
            const locationInserts = locations.map(location => {
                const locationSql = 'INSERT INTO Locations (name, tripId, createdAt, updatedAt) VALUES (?, ?, ?, ?)';
                const now = new Date().toISOString();
                return new Promise((resolve, reject) => {
                    db.run(locationSql, [location, tripId, now, now], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            Promise.all(locationInserts)
                .then(() => res.status(200).send("Trip and locations saved successfully."))
                .catch(error => {
                    console.error('Error saving locations:', error);
                    res.status(500).send("Failed to save locations.");
                });
        });
    });
});
  
  // GET SAVED TRIPS
  app.get('/saved_trips', async (req, res) => {
    const userId = req.session.user.id; 

    try {
        const trips = await Trip.findAll({
            where: { userId: userId },
            include: [{ model: Location, attributes: ['name'] }] 
        });

        const formattedTrips = trips.map(trip => ({
            tripId: trip.tripId, // Include tripId in the formattedTrips object
            name: trip.name,
            locations: trip.Locations.map(location => location.name)
        }));

        res.json(formattedTrips);
    } catch (error) {
        console.error('Error retrieving saved trips:', error);
        res.sendStatus(500);
    }
});

// DELETE A TRIP
app.post('/delete_trip', (req, res) => {
    const { tripId } = req.body; 
    console.log('Received tripId:', tripId);

    // Delete the associated locations first
    const deleteLocationsQuery = 'DELETE FROM Locations WHERE tripId = ?';
    db.run(deleteLocationsQuery, [tripId], function(err) {
        if (err) {
            console.error('Error deleting locations:', err.message);
            res.status(500).json({ success: false, message: "An error occurred while deleting the associated locations." });
            return;
        }

        // Delete the trip
        const deleteTripQuery = 'DELETE FROM Trips WHERE tripId = ?';
        db.run(deleteTripQuery, [tripId], function(err) {
            if (err) {
                console.error('Error deleting trip:', err.message);
                res.status(500).json({ success: false, message: "An error occurred while deleting the trip." });
                return;
            }

            res.json({ success: true, message: "Trip deleted successfully.", deletedTripId: tripId });
        });
    });
});


// HELPER FUNCTIONS & DATABASE COMMANDS

// GET USER
app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM User';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("An error occurred while fetching users.");
            return;
        }
        res.json(rows); // Send all the User rows as JSON
    });
});


// UPDATE USER
app.post('/update_user', (req, res) => {
    const { id, email, first_name, last_name } = req.body; 
    const sql = 'UPDATE User SET email = ?, first_name = ?, last_name = ? WHERE id = ?';
    
    db.run(sql, [email, first_name, last_name, id], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("An error occurred while updating the user.");
            return;
        }
        res.send("User updated successfully.");
    });
});


// DELETE USER
app.post('/delete_user', (req, res) => {
    const { id } = req.body; // Get the ID from the request body
    const sql = 'DELETE FROM User WHERE id = ?';

    db.run(sql, [id], function(err) {
        if (err) {
            console.error(err.message);
            res.status(500).json({ success: false, message: "An error occurred while deleting the user." });
            return;
        }
        res.json({ success: true, message: "User deleted successfully.", deletedId: id });
    });
});


// ADMIN CHECK
function isAdmin(req, res, next) {
    // TODO: Replace with real authentication and admin check
    const userIsAdmin = true; // This should be determined by auth system
    if (userIsAdmin) {
        next();
    } else {
        res.status(403).send("Access denied.");
    }
}


// EMAIL ALREADY EXISTS
function checkEmailExists(email) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT email FROM User WHERE email = ?';
        db.get(sql, [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? true : false);
            }
        });
    });
}



// Export the Express app
module.exports = app;
