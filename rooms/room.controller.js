
const express = require('express');
const router = express.Router();
const db = require('../_helpers/db');
const Room = db.Room;
const RoomType = db.RoomType;

// GET all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.findAll({
            include: {
                model: RoomType,
                attributes: ['type', 'description', 'basePrice', 'reservationFeePercentage'] 
            },
            order: [['roomNumber', 'ASC']]
        });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/types', async (req, res) => {
    try {
        const roomTypes = await RoomType.findAll({
            order: [['id', 'ASC']]
        });
        res.json(roomTypes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rate, type, description, reservationFeePercentage } = req.body;
        
        const roomType = await RoomType.findByPk(id);
        if (!roomType) {
            return res.status(404).json({ message: 'Room type not found' });
        }
        
        const updateData = {};
        if (rate !== undefined) updateData.basePrice = rate;
        if (type !== undefined) updateData.type = type;
        if (description !== undefined) updateData.description = description;
        if (reservationFeePercentage !== undefined) updateData.reservationFeePercentage = reservationFeePercentage;
        
        await roomType.update(updateData);
        
        res.json(roomType);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/available/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        const availableRooms = await Room.findAll({
            include: {
                model: RoomType,
                where: { type: type },
                attributes: ['type', 'description', 'basePrice', 'reservationFeePercentage']
            },
            where: { isAvailable: true },
            order: [['roomNumber', 'ASC']]
        });
        
        res.json(availableRooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const totalRooms = await Room.count();
        const availableRooms = await Room.count({ where: { isAvailable: true } });
        const occupiedRooms = totalRooms - availableRooms;
        
        // Get room type distribution
        const roomTypeStats = await Room.findAll({
            include: {
                model: RoomType,
                attributes: ['type', 'basePrice', 'reservationFeePercentage']
            },
            attributes: ['isAvailable']
        });
        
        const stats = {
            total: totalRooms,
            available: availableRooms,
            occupied: occupiedRooms,
            occupancyRate: ((occupiedRooms / totalRooms) * 100).toFixed(2),
            roomTypes: {}
        };
        
        roomTypeStats.forEach(room => {
            const type = room.RoomType.type;
            if (!stats.roomTypes[type]) {
                stats.roomTypes[type] = {
                    total: 0,
                    available: 0,
                    occupied: 0,
                    price: room.RoomType.basePrice,
                    reservationFeePercentage: room.RoomType.reservationFeePercentage
                };
            }
            stats.roomTypes[type].total++;
            if (room.isAvailable) {
                stats.roomTypes[type].available++;
            } else {
                stats.roomTypes[type].occupied++;
            }
        });
        
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET room by id
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id, {
            include: {
                model: RoomType,
                attributes: ['type', 'description', 'basePrice', 'reservationFeePercentage']
            }
        });
        if (!room) return res.status(404).json({ message: 'Room not found' });
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create room
router.post('/', async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.status(201).json(room);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update room
router.put('/:id', async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        await room.update(req.body);
        res.json(room);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update room availability 
router.put('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;
        
        const room = await Room.findByPk(id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        
        await room.update({ isAvailable });
        
        res.json({ 
            message: `Room ${room.roomNumber} is now ${isAvailable ? 'available' : 'occupied'}`,
            room: room
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE room
router.delete('/:id', async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        await room.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST bulk 
router.post('/bulk-availability', async (req, res) => {
    try {
        const { roomIds, isAvailable } = req.body;
        
        if (!Array.isArray(roomIds) || roomIds.length === 0) {
            return res.status(400).json({ message: 'Room IDs array is required' });
        }
        
        const updatedRooms = await Room.update(
            { isAvailable },
            { 
                where: { id: roomIds },
                returning: true
            }
        );
        
        res.json({ 
            message: `Updated ${updatedRooms[0]} rooms availability`,
            updatedCount: updatedRooms[0]
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Helper function to calculate reservation fee based on room type
const calculateReservationFee = async (roomTypeId) => {
    try {
        const roomType = await RoomType.findByPk(roomTypeId);
        if (!roomType) {
            throw new Error('Room type not found');
        }
        
        const reservationFee = (parseFloat(roomType.basePrice) * parseFloat(roomType.reservationFeePercentage)) / 100;
        return Math.round(reservationFee * 100) / 100; // Round to 2 decimal places
    } catch (err) {
        console.error('Error calculating reservation fee:', err);
        return 0;
    }
};

module.exports = { router, calculateReservationFee };
