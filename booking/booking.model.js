const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const attributes = {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        // Guest fields
        guest_firstName: { type: DataTypes.STRING, allowNull: false },
        guest_lastName: { type: DataTypes.STRING, allowNull: false },
        guest_email: { type: DataTypes.STRING, allowNull: false },
        guest_phone: { type: DataTypes.STRING, allowNull: false },
        guest_address: { type: DataTypes.STRING, allowNull: false },
        guest_city: { type: DataTypes.STRING, allowNull: false },
        // Availability fields
        checkIn: { type: DataTypes.DATE, allowNull: false },
        checkOut: { type: DataTypes.DATE, allowNull: false },
        adults: { type: DataTypes.INTEGER, allowNull: false },
        children: { type: DataTypes.INTEGER, allowNull: false },
        rooms: { type: DataTypes.INTEGER, allowNull: false },
        // Payment fields
        paymentMode: { type: DataTypes.STRING },
        paymentMethod: { type: DataTypes.STRING },
        mobileNumber: { type: DataTypes.STRING }, 
        amount: { type: DataTypes.FLOAT },
        cardNumber: { type: DataTypes.STRING },
        expiry: { type: DataTypes.STRING },
        cvv: { type: DataTypes.STRING },
        // Room reference
        room_id: { type: DataTypes.INTEGER, allowNull: false },
        // Other fields
        pay_status: { type: DataTypes.BOOLEAN, allowNull: false },
        created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        requests: { type: DataTypes.STRING },
        paidamount: { type: DataTypes.FLOAT, allowNull: false }
    };

    const options = {
        timestamps: false,
        tableName: 'Bookings'
    };

    return sequelize.define('Booking', attributes, options);
};
