// This test file serves to verify the functionality and integrity of the Sequelize models defined in the application. 
// It includes a series of test cases for each model to ensure that data validation and constraints are properly enforced. 
// The tests cover scenarios such as creating new records, handling validation errors, and verifying associations between models.
// Additionally, before and after hooks are used to synchronize the test environment with the database and clean up after the tests, ensuring a consistent testing environment.

// TEST ENVIORNMENT SETUP
// Import necessary modules and dependencies
const assert = require('assert');
const { sequelize, User, Location, Weather, UserLocation } = require('../src/models');

// Describe block for the test suite
describe('Models Test', () => {
  
  // Before hook to ensure synchronization with the database
  before(async () => {
    await sequelize.sync({ force: true });
  });


  // USER MODEL TESTS
  // Describe block for User Model tests
  describe('User Model', () => {
    // Test to create a new user
    it('should create a new user', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      assert.strictEqual(user.email, 'test@example.com');
      assert.strictEqual(user.password, 'password123');
      assert.strictEqual(user.firstName, 'John');
      assert.strictEqual(user.lastName, 'Doe');
      assert.strictEqual(user.role, 'USER')
      assert.strictEqual(user.userId, 1);
    });

    // Test to prevent creating a user with duplicate email
    it('should not allow creating a user with duplicate email', async () => {
      try {
        await User.create({
          email: 'test@example.com',
          password: 'anotherPassword',
          firstName: 'Jane',
          lastName: 'Smith'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeUniqueConstraintError');
      }
    });

    // Test to prevent creating a user with invalid role
    it('should not allow creating a user with invalid role', async () => {
      try {
        await User.create({
          email: 'test5@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ROLE'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating a user with invalid email
    it('should not allow creating a user with invalid email', async () => {
      try {
        await User.create({
          email: 'invalidemail',
          password: 'validpassword',
          firstName: 'John',
          lastName: 'Doe'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating a user with too short of a password
    it('should not allow creating a user with too short of a password', async () => {
      try {
        await User.create({
          email: 'test@example.com',
          password: 'short',
          firstName: 'John',
          lastName: 'Doe'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating a user with too long of a password
    it('should not allow creating a user with too long of a password', async () => {
      try {
        await User.create({
          email: 'test@example.com',
          password: 'thisisaverylongpasswordthatexceedsmaximumallowedpasswordlengthxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          firstName: 'John',
          lastName: 'Doe'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });
  });

 
  // TEST SESSION CLEANUP
  // After hook to clean up by dropping all tables after tests
  after(async () => {
    await sequelize.drop();
    await sequelize.close();
  });
});



/*
// TESTS FOR MODELS THAT ARE NO LONGER USED (LOCATION, WEATHER, USERLOCAITON)

  // LOCATION MODEL TESTS
  // Describe block for Location Model tests
  describe('Location Model', () => {
    // Test to create a new location
    it('should create a new location', async () => {
      const location = await Location.create({
        country: 'USA',
        city: 'New York',
        state:'New York',
        timezone: 'EST'
      });
      assert.strictEqual(location.country, 'USA');
      assert.strictEqual(location.city, 'New York');
      assert.strictEqual(location.state, 'New York');
      assert.strictEqual(location.timezone, 'EST');
      assert.strictEqual(location.locationId, 1);
    });

    // Test to prevent creating a location with an invalid timezone
    it('should not allow creating a location with an invalid timezone', async () => {
      try {
        await Location.create({
          country: 'USA',
          city: 'New York',
          state:'New York',
          timezone: 'Invalid/Timezone'
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });
  });
  

  // WEATHER MODEL TESTS
  // Describe block for Weather Model tests
  describe('Weather Model', () => {
    // Test to create a new weather record
    it('should create a new weather record', async () => {
      const weather = await Weather.create({
        dateTime: new Date(),
        temperature: 20,
        precipitationChance: 30,
        uvIndex: 5
      });
      assert.strictEqual(weather.temperature, 20);
      assert.strictEqual(weather.precipitationChance, 30);
      assert.strictEqual(weather.uvIndex, 5);
    });

    // Test to prevent creating weather with too high precipitation chance
    it('should not allow creating weather with too high precipitation chance', async () => {
      try {
        await Weather.create({
          dateTime: new Date(),
          temperature: 20,
          precipitationChance: 101,
          uvIndex: 5
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating weather with too low precipitation chance
    it('should not allow creating weather with too low precipitation chance', async () => {
      try {
        await Weather.create({
          dateTime: new Date(),
          temperature: 20,
          precipitationChance: -1,
          uvIndex: 5
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating weather with too high uv index
    it('should not allow creating weather with too high uv index', async () => {
      try {
        await Weather.create({
          dateTime: new Date(),
          temperature: 20,
          precipitationChance: 30,
          uvIndex: 12
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });

    // Test to prevent creating weather with too low uv index
    it('should not allow creating weather with too low uv index', async () => {
      try {
        await Weather.create({
          dateTime: new Date(),
          temperature: 20,
          precipitationChance: 30,
          uvIndex: 0
        });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeValidationError');
      }
    });
  });


  // USERLOCATION JUNCTION TABLE TESTS
  // Describe block for UserLocation Model tests
  describe('UserLocation Model', () => {
    // Test to create a new user-location association
    it('should create a new user-location association', async () => {
      const user = await User.findOne({ where: { email: 'test@example.com' } });
      const location = await Location.findOne({ where: { city: 'New York' } });
      const userLocation = await UserLocation.create({ userId: user.userId, locationId: location.locationId });
      assert.strictEqual(userLocation.userId, user.userId);
      assert.strictEqual(userLocation.locationId, location.locationId);
    });

    // Test to prevent creating user-location with invalid user id
    it('should not allow creating user-location with invalid user id', async () => {
      try {
        await UserLocation.create({ userId: -1, locationId: 1 });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeForeignKeyConstraintError');
      }
    });

    // Test to prevent creating user-location with invalid location id
    it('should not allow creating user-location with invalid location id', async () => {
      try {
        await UserLocation.create({ userId: 1, locationId: -1 });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeForeignKeyConstraintError');
      }
    });

    // Test to prevent creating user-location with non-existent user
    it('should not allow creating user-location with non-existent user', async () => {
      try {
        await UserLocation.create({ userId: 999, locationId: 1 });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeForeignKeyConstraintError');
      }
    });

    // Test to prevent creating user-location with non-existent location
    it('should not allow creating user-location with non-existent location', async () => {
      try {
        await UserLocation.create({ userId: 1, locationId: 999 });
        assert.fail('Expected error to be thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'SequelizeForeignKeyConstraintError');
      }
    });
  });
*/