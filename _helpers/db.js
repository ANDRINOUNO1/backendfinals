
const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize, DataTypes } = require('sequelize');


const db = {};
module.exports = db;


db.initialize = async function() {
    try {
        // Use environment variables if available, otherwise fall back to config.json
        const host = process.env.DB_HOST || config.database.host;
        const port = process.env.DB_PORT || config.database.port;
        const user = process.env.DB_USER || config.database.user;
        const password = process.env.DB_PASSWORD || config.database.password;
        const database = process.env.DB_NAME || config.database.database;
        
        console.log('Attempting to connect to database...');
        
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.end();

        // connect to db
        const sequelize = new Sequelize(database, user, password, {
            dialect: 'mysql',
            logging: false,
            host: host,
            port: port
        });

        // Test the connection
        await sequelize.authenticate();
        console.log('Database connection established successfully');
       
        db.Account = require('../account/account.model')(sequelize, DataTypes);
        db.RefreshToken = require('../account/refresh-token.model')(sequelize, DataTypes);
        db.Booking = require('../booking/booking.model')(sequelize, DataTypes);
        db.Archive = require('../booking/archive.model')(sequelize, DataTypes);
        db.Room = require('../rooms/room.model')(sequelize, DataTypes);
        db.RoomType = require('../rooms/room-type.model')(sequelize);

        // define relationships
        db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE', foreignKey: 'accountId' });
        db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId' });

        db.Account.hasMany(db.Booking, { foreignKey: 'accountId'});
        db.Booking.belongsTo(db.Account, { foreignKey: 'accountId'});

        db.Archive.belongsTo(db.Room, { foreignKey: 'room_id' });
        db.Room.hasMany(db.Archive, { foreignKey: 'room_id' });

        db.Room.hasMany(db.Booking, { foreignKey: 'room_id' });
        db.Booking.belongsTo(db.Room, { foreignKey: 'room_id' });

        db.RoomType.hasMany(db.Room, { foreignKey: 'roomTypeId' });
        db.Room.belongsTo(db.RoomType, { foreignKey: 'roomTypeId' });

        await sequelize.sync({ force: false });
        console.log('Database synchronized successfully');

        const userCount = await db.Account.count();
        if (userCount === 0) {
            await db.Account.seedDefaults();
            console.log('Default users have been seeded.');
        }

        // Seed room types and rooms if they don't exist
        const roomTypeCount = await db.RoomType.count();
        if (roomTypeCount === 0) {
            await db.RoomType.seedDefaults();
            console.log('Default room types have been seeded.');
        }

        const roomCount = await db.Room.count();
        if (roomCount === 0) {
            await db.Room.seedDefaults();
            console.log('Default rooms have been seeded.');
        }

        db.sequelize = sequelize;

        console.log('Database initialization completed successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        console.log('Server will continue without database connection');
        return false;
    }
}
