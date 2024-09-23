// This file contains a test suite for ensuring that the server starts correctly and responds to requests as expected. 
// It imports necessary modules such as assert and supertest, and also imports the server file. 
// The server is started before running tests and stopped after tests are completed to clean up resources. 
// The main test case ensures that the server responds with a 200 status code for the root URL, following redirects if necessary.

// Import necessary modules and the server file
const assert = require('assert');
const request = require('supertest');
const app = require('../src/server');

// Define the port for the server
const port = process.env.PORT || 3000;

// Reference to the server instance for cleanup
let server;

// Test suite
describe('Server Start', function() {
    // Before running tests, start the server
    before(function(done) {
        server = app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
            done();
        });
    });

    // After running tests, stop the server
    after(function(done) {
        server.close(done);
    });

    // Test case to ensure the server starts and responds with a 200 status code for the root URL
    it('should start the server and follow redirects to an HTML page with a 200 response', function(done) {
        request(app)
            .get('/')
            .expect(200) // Expecting a 200 OK response
            .expect('Content-Type', /html/) // Assert the content type is HTML
            .end(function(err, res) {
                if (err) {
                    // If there's an error, check if it's a redirect
                    if (res && res.redirect) {
                        // If it's a redirect, follow it
                        const redirectUrl = res.headers.location;
                        request(app)
                            .get(redirectUrl)
                            .expect(200) // Expecting a 200 OK response after following redirect
                            .expect('Content-Type', /html/) // Assert the content type is HTML
                            .end(done);
                    } else {
                        done(err);
                    }
                } else {
                    done();
                }
            });
    });
});
