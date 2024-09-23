// This file sets up Sequelize ORM with SQLite for a database-driven application. 
// It defines models such as User, Location, Weather, and UserLocation, each representing a table in the database. 
// The models include various attributes and validations, and associations between them establish relationships in the database. 
// Finally, the models are synchronized with the database, and the Sequelize instance along with the models are exported for use elsewhere in the application.

// MODELS FILE SETUP
// Import necessary modules and dependencies
const { Sequelize, DataTypes } = require('sequelize');  // Import Sequelize ORM
const moment = require('moment-timezone');  // Import Moment.js for handling timezones

// Initialize Sequelize with SQLite as the database
const sequelize = new Sequelize({
  dialect: 'sqlite',  // Set the dialect to SQLite
  storage: './backend/src/test.db',  // Define the path to the SQLite database file
  logging: false,  // Disable SQL logging (to not clog up the console)
});


// USER MODEL
// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true  // Validate email format using isEmail validator
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 64] // Minimum length of 6 characters and maximum length of 64 characters for password
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('USER', 'ADMIN'),  // Define a role enum with values 'USER' and 'ADMIN'
    defaultValue: 'USER',  // Set default role to 'USER'
    validate: {
      isIn: [['USER', 'ADMIN']]  // Validate that the role value is one of the defined enums
    }
  },
  tableName: 'User'
});

// TRIP MODEL
const Trip = sequelize.define('Trip', {
  tripId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  tableName: 'Trips'
});

User.hasMany(Trip, { foreignKey: 'userId' });
Trip.belongsTo(User, { foreignKey: 'userId' });

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Trip,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
});

Trip.hasMany(Location, { foreignKey: 'tripId', onDelete: 'CASCADE'});
Location.belongsTo(Trip, { foreignKey: 'tripId' });

// MODEL DATABASE SYNCHRONIZATION AND EXPORTS
// Sync models with the database
sequelize.sync()
  .then(() => {
    console.log('Models synced with database');  // Log message indicating successful synchronization
  })
  .catch(err => {
    console.error('Error syncing models:', err);  // Log error if synchronization fails
  });

// Export sequelize instance and models separately
module.exports = {
  sequelize,  // Export Sequelize instance
  User,       // Export User model
  Trip,     // Export Trip model
  Location    // Export Location model
};




/*
// MODELS THAT ARE NO LONGER USED (WEATHER, USERLOCAIOTN)



// WEATHER MODEL
// Define Weather model
const Weather = sequelize.define('Weather', {
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  precipitationChance: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0,  // Validate minimum value for precipitation chance
      max: 100  // Validate maximum value for precipitation chance
    }
  },
  uvIndex: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,  // Validate minimum value for UV index
      max: 11  // Validate maximum value for UV index
    }
  }
});


// USERLOCATION JUNCTION TABLE MODEL
// Define UserLocation model with foreign keys
const UserLocation = sequelize.define('UserLocation', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'userId'
    }
  },
  locationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Location',
      key: 'locationId'
    }
  }
});

// Define associations between models
User.belongsToMany(Location, { through: UserLocation, foreignKey: 'userId' });  // Define many-to-many association between User and Location
Location.belongsToMany(User, { through: UserLocation, foreignKey: 'locationId' });  // Define many-to-many association between Location and User

*/