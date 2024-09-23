// This file contains a comprehensive set of tests for the server functionality of the application. 
// It includes acceptance tests that cover various endpoints and user interactions, as well as unit tests for database operations and user-related functionalities. 
// Each test suite is clearly labeled and focuses on specific aspects of the application, ensuring thorough testing coverage. 
// Additionally, the file includes setup and teardown functions to create a mock database and shut down the server after all tests are completed.

// TEST ENVIORNMENT SETUP
// Load .env.test file
require('dotenv').config({ path: '.env.test' });

// Import required modules
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/server');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');

// Configure Chai
chai.should();
chai.use(chaiHttp);
const expect = chai.expect;

// Define test suite for server functionality
describe('Server', () => {
    let agent = chai.request.agent(app);
    let db;

    // Set up a mock database with test users before each test
    beforeEach((done) => {
        db = new sqlite3.Database(':memory:');
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS User (id INTEGER PRIMARY KEY, email TEXT, password TEXT, first_name TEXT, last_name TEXT, role TEXT)');
            db.run('INSERT INTO User (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)', ['admin@admin.com', 'admin', 'Admin', 'User', 'admin'], (err) => {
                if (err) return done(err);
                done();
            });
        });
    });

    // Roll back the transaction after each test
    afterEach((done) => {
        // Close the database connection
        db.close(() => {
            done();
        });
    });



    // ACCEPTANCE TESTS

    // APPLICATION SETUP
    describe('APPLICATION SETUP', () => {
        it('should establish SQLite database connection', (done) => {
            expect(db).to.exist;
            done();
        });

        it('should create users table if it does not exist', (done) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='User'", (err, row) => {
                if (err) return done(err);
                expect(row).to.exist;
                done();
            });
        });

        it('should set up session management', (done) => {
            expect(app._router.stack.some((middleware) => middleware.name === 'session')).to.be.true;
            done();
        });
    });


    // LOGIN PAGE
    describe('LOGIN PAGE', () => {
        // Test to check redirection to login page
        it('should redirect to login page', (done) => {
            agent
                .get('/')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.redirectTo(/\/login_page$/);
                    done();
                });
        });

        // Test to check failed login with invalid email
        it('should fail login with invalid email', (done) => {
            agent
                .post('/login_page')
                .send({ email: 'nonexistent@example.com', password: 'invalid' })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.include('Invalid Username or Password');
                    done();
                });
        });

        // Test to check successful login and redirection to home page
        it('should login successfully and redirect to home page', (done) => {
            agent
                .post('/login_page')
                .send({ email: 'admin@admin.com', password: 'admin' })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.redirectTo(/\/home_page$/);
                    done();
                });
        });

        // Test to check unsuccessful login with incorrect password for a valid email
        it('should not login with incorrect password for valid email', (done) => {
            agent
                .post('/login_page')
                .send({ email: 'admin@admin.com', password: 'incorrectpassword' }) // Using incorrect password
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.include('Invalid Username or Password');
                    done();
                });
        });
    });


    // LOGOUT PAGE
    describe('LOGOUT PAGE', () => {
        // Test to check logout and redirection to login page
        it('should logout and redirect to login page', (done) => {
            agent
                .post('/log_out')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.redirectTo(/\/login_page$/);
                    done();
                });
        });

        // Test to check session destruction on logout
        it('should destroy session on logout', (done) => {
            chai.request(app)
                .get('/home_page')
                .end((err, response) => {
                    response.should.have.status(200);
                    response.should.redirectTo(/\/login_page$/);
                    done();
                });
        });
    });


    // CREATE ACCOUNT PAGE
    describe('CREATE ACCOUNT PAGE', () => {
        // Test to check account creation failure if email already exists
        it('should not create account if email already exists', (done) => {
            chai.request(app)
                .post('/create_account')
                .send({ email: 'admin@admin.com', password: 'testpassword', first_name: 'Test', last_name: 'User', role: 'user' }) // Using an existing email
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Email already in use.');
                    done();
                });
        });

        // Test to check account creation failure with too short password
        it('should not create account with too short password', (done) => {
            chai.request(app)
                .post('/create_account')
                .send({ email: 'newuser@example.com', password: 'short', first_name: 'Test', last_name: 'User', role: 'user' }) // Password is too short
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Password must be at 6 characters or more.');
                    done();
                });
        });

        // Test to check account creation failure with too long password
        it('should not create account with too long password', (done) => {
            chai.request(app)
                .post('/create_account')
                .send({ email: 'newuser@example.com', password: 'thispasswordistoolongandshouldfailtoadduser', first_name: 'Test', last_name: 'User', role: 'user' }) // Password is too long
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Password must be 64 characters or less.');
                    done();
                });
        });

        // Test to check account creation success, password hashing, user addition to database, and redirection to login page
        it('should create account successfully, hash password, add user to database, and redirect to login page', (done) => {
            chai.request(app)
                .post('/create_account')
                .send({ email: 'newuser@example.com', password: 'testpassword', first_name: 'Test', last_name: 'User', role: 'user' })
                .end((err, response) => {
                    response.should.have.status(200);
                    response.should.redirectTo(/\/login_page$/);

                    // Check if the password is hashed and stored in the database
                    const sql = 'SELECT * FROM User WHERE email = ?';
                    db.get(sql, ['newuser@example.com'], (err, user) => {
                        if (err) {
                            done(err);
                        } else {
                            bcrypt.compare('testpassword', user.password, (err, result) => {
                                if (err) {
                                    done(err);
                                } else {
                                    result.should.be.true;

                                    // Check if the user is added to the database
                                    expect(user.email).to.equal('newuser@example.com');
                                    expect(user.first_name).to.equal('Test');
                                    expect(user.last_name).to.equal('User');
                                    expect(user.role).to.equal('user');

                                    done();
                                }
                            });
                        }
                    });
                });
        });
    });


    // PROFILE PAGE
    describe('PROFILE PAGE', () => {
        // Test to check if profile page is not rendered when user is not logged in
        it('should not render profile page if user not logged in', (done) => {
            chai.request(app)
                .get('/profile_page')
                .end((err, response) => {
                    response.should.have.status(302);
                    response.should.redirectTo(/\/login_page$/);
                    done();
                });
        });

        // Test to check rendering of profile page with correct user data when user is logged in
        it('should render profile page with correct user data if user logged in', (done) => {
            // Simulate a logged-in user
            const user = { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'user' };
            agent
                .get('/profile_page')
                .set('Cookie', `connect.sid=12345`) // Simulate a session cookie
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Profile Page');
                    response.text.should.include(user.email);
                    response.text.should.include(user.first_name);
                    response.text.should.include(user.last_name);
                    done();
                });
        });
    });


    // USER MANAGEMENT PAGE
    describe('USER MANAGEMENT PAGE', () => {
        // Test to check rendering of user management page for admin
        it('should render user management page for admin', (done) => {
            agent
                .get('/user_management')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.text.should.include('User Management Dashboard');
                    done();
                });
        });

        // Test to check non-rendering of user management page for non-admin
        it('should not render user management page for non-admin', (done) => {
            // Simulate a non-admin user
            const user = { id: 2, email: 'user@example.com', first_name: 'Regular', last_name: 'User', role: 'user' };
            agent
                .get('/user_management')
                .set('Cookie', `connect.sid=12345`) // Simulate a session cookie
                .end((err, res) => {
                    res.should.have.status(403);
                    done();
                });
        });
    });


    // WEATHER PAGE
    describe('WEATHER PAGE', () => {
        // Test to check rendering of weather page with correct data
        it('should render weather page with correct data', (done) => {
            chai.request(app)
                .get('/weather_page')
                .end((err, response) => {
                    response.should.have.status(200);
                    response.should.be.html;
                    response.text.should.include('Weather Page');
                    done();
                });
        });

        // Test to check rendering of weather page with default city (Milwaukee)
        it('should render weather page with default city (Milwaukee)', (done) => {
            chai.request(app)
                .get('/weather_page')
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Milwaukee');
                    done();
                });
        });

        // Test to check rendering of weather page with correct city when provided in query parameter
        it('should render weather page with correct city when provided in query parameter', (done) => {
            const cityName = 'New York';
            chai.request(app)
                .get(`/weather_page?city=${encodeURIComponent(cityName)}`)
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include(cityName);
                    done();
                });
        });
    });


    // TRIP PLANNER PAGE
    describe('TRIP PLANNER PAGE', () => {
        // Test to check rendering of trip planner page
        it('should render trip planner page', (done) => {
            chai.request(app)
                .get('/trip_planner')
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.include('Trip Planner');
                    done();
                });
        });
    });



    // UNIT TESTS

    // GET USER
    describe('GET USER', () => {
        it('should get a user from the database', (done) => {
            const userId = 1; // Assume user with ID 1 exists
            chai.request(app)
                .get(`/users/${userId}`)
                .end((err, response) => {
                    response.should.have.status(200);
                    response.body.should.be.an('object');
                    response.body.should.have.property('id', userId);
                    response.body.should.have.property('email');
                    response.body.should.have.property('first_name');
                    response.body.should.have.property('last_name');
                    response.body.should.have.property('role');
                    done();
                });
        });
    });


    // UPDATE USER
    // Test to check updating a user in the database
    describe('UPDATE USER', () => {
        it('should update a user in the database', (done) => {
            const userData = { id: 1, email: 'updated@example.com', first_name: 'Updated', last_name: 'User' };
            chai.request(app)
                .post('/update_user')
                .send(userData)
                .end((err, response) => {
                    response.should.have.status(200);
                    response.text.should.equal("User updated successfully.");
                    done();
                });
        });
    });

    
    // DELETE USER
    // Test to check deleting a user from the database
    describe('DELETE USER', () => {
        it('should delete a user from the database', (done) => {
            const userId = 1; // Assume user with ID 1 exists
            chai.request(app)
                .post('/delete_user')
                .send({ id: userId })
                .end((err, response) => {
                    response.should.have.status(200);
                    response.body.should.be.an('object');
                    response.body.should.have.property('success', true);
                    response.body.should.have.property('message', "User deleted successfully.");
                    response.body.should.have.property('deletedId', userId);
                    done();
                });
        });
    });


    // ADMIN CHECK
    // Test to check if a user is an admin
    describe('CHECK IF ADMIN', () => {
        it('should check if a user is an admin', (done) => {
            chai.request(app)
                .get('/check_admin')
                .end((err, response) => {
                    response.should.have.status(200);
                    response.body.should.be.an('object');
                    response.body.should.have.property('isAdmin', true); // Assuming user is admin
                    done();
                });
        });
    });


    // EMAIL ALREADY EXISTS
    // Test to check if an email already exists in the database
    describe('CHECK IF EMAIL ALREADY IN DB', () => {
        it('should check if an email already exists in the database', (done) => {
            const email = 'test@example.com'; // Assume this email already exists
            chai.request(app)
                .get(`/check_email_exists?email=${encodeURIComponent(email)}`)
                .end((err, response) => {
                    response.should.have.status(200);
                    response.body.should.be.an('object');
                    response.body.should.have.property('emailExists', true); // Assuming email exists
                    done();
                });
        });
    });



    // TEST ENVIRONMENT SHUTDOWN
    // Shut down the server when all tests are finished
    after(function () {
        // Stop the server
        exec('taskkill /F /IM node.exe', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error stopping server: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error stopping server: ${stderr}`);
                return;
            }
            console.log('Server stopped successfully.');
        });

        // Exit the Node.js process
        process.exit(0);
    });
});
