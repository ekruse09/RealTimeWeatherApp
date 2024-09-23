// This file is a simple script responsible for starting the server for the application. 
// It imports the server module, determines the port for the server to listen on (defaulting to port 3000 if not provided in the environment variables), 
// and then starts the server, logging a message to indicate that the server is running along with the URL where it can be accessed.

// Import the server module which represents the application
const app = require('./server');

// Set the port for the server to listen on, defaulting to 3000 if not provided in the environment variables
const port = process.env.PORT || 3000;

// Start the server, listening on the specified port, and log a message to indicate that the server is running
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
