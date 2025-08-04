
module.exports = (sequelize, DataTypes) => {
    const attributes = {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        roomNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
        roomTypeId: { type: DataTypes.INTEGER, allowNull: false },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    };

    const options = {
        timestamps: false,
        tableName: 'Rooms'
    };

    const Room = sequelize.define('Room', attributes, options);
    
    Room.seedDefaults = async function() {
        // Function to generate rooms based on room type
        function generateRooms() {
            const rooms = [];
            let roomId = 1;
            
            const roomTypes = [
                { id: 1, type: 'Classic', basePrice: 120.00 },
                { id: 2, type: 'Deluxe', basePrice: 200.00 },
                { id: 3, type: 'Prestige', basePrice: 150.00 },
                { id: 4, type: 'Luxury', basePrice: 80.00 }
            ];

            roomTypes.forEach(roomType => {
                let floors = 1;
                let roomsPerFloor = 1;

                switch (roomType.type) {
                    case 'Classic': 
                        floors = 2;
                        roomsPerFloor = 8;
                        break;
                    case 'Deluxe':
                        floors = 2;
                        roomsPerFloor = 5;
                        break;
                    case 'Prestige':
                        floors = 2;
                        roomsPerFloor = 3;
                        break;
                    case 'Luxury':
                        floors = 1;
                        roomsPerFloor = 4;
                        break;
                }

                for (let floor = 1; floor <= floors; floor++) {
                    for (let i = 1; i <= roomsPerFloor; i++) {
                        const baseNumber = roomType.id * 100 + i;
                        const roomNumber = `${baseNumber}-${floor}`;
                        
                        rooms.push({
                            id: roomId++,
                            roomNumber,
                            roomTypeId: roomType.id,
                            price: roomType.basePrice,
                            isAvailable: true
                        });
                    }
                }
            });

            return rooms;
        }

        const rooms = generateRooms();
        
        for (const room of rooms) {
            await Room.findOrCreate({
                where: { roomNumber: room.roomNumber },
                defaults: room
            });
        }
        
        console.log(`✅ ${rooms.length} rooms seeded successfully`);
    };

    return Room;
};
