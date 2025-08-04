const db = require('../_helpers/db');
const Booking = db.Booking;
const Room = db.Room; 
const Archive = db.Archive;
const RoomType = db.RoomType;
const emailService = require('../_helpers/email.service');
const { Op } = require('sequelize');

module.exports = {
    createBooking,
    getAllBookings,
    updateBooking,
    deleteBooking,
    getBookingById
};

// --- Mapping functions ---
function flattenBooking(nested) {
    return {
    
        guest_firstName: nested.guest?.first_name || nested.guest?.firstName || '',
        guest_lastName: nested.guest?.last_name || nested.guest?.lastName || '',
        guest_email: nested.guest?.email || '',
        guest_phone: nested.guest?.phone || '',
        guest_address: nested.guest?.address || '',
        guest_city: nested.guest?.city || '',
   
        checkIn: nested.availability?.checkIn || '',
        checkOut: nested.availability?.checkOut || '',
        adults: nested.availability?.adults || 0,
        children: nested.availability?.children || 0,
        rooms: nested.availability?.rooms || 1,
 
        paymentMode: nested.payment?.paymentMode || '',
        paymentMethod: nested.payment?.paymentMethod || '',
        amount: nested.payment?.amount || 0,
        mobileNumber: nested.payment?.mobileNumber || '',
        cardNumber: nested.payment?.cardNumber || '',
        expiry: nested.payment?.expiry || '',
        cvv: nested.payment?.cvv || '',
  
        room_id: nested.room_id,
       
        pay_status: nested.pay_status || false, // Default to false (pending)
        created_at: nested.created_at || new Date(),
        updated_at: nested.updated_at || new Date(),
        requests: nested.requests || '',
        paidamount: nested.paidamount || nested.payment?.amount || 0 // Use payment amount as default
    };
}

function nestBooking(flat) {
    return {
        id: flat.id,
        guest: {
            first_name: flat.guest_firstName,
            last_name: flat.guest_lastName,
            email: flat.guest_email,
            phone: flat.guest_phone,
            address: flat.guest_address,
            city: flat.guest_city
        },
        availability: {
            checkIn: flat.checkIn,
            checkOut: flat.checkOut,
            adults: flat.adults,
            children: flat.children,
            rooms: flat.rooms
        },
        payment: {
            paymentMode: flat.paymentMode,
            paymentMethod: flat.paymentMethod,
            amount: flat.amount,
            mobileNumber: flat.mobileNumber,
            cardNumber: flat.cardNumber,
            expiry: flat.expiry,
            cvv: flat.cvv
        },
        room_id: flat.room_id,
        pay_status: flat.pay_status,
        created_at: flat.created_at,
        updated_at: flat.updated_at,
        requests: flat.requests,
        paidamount: flat.paidamount
    };
}

// Helper function to calculate reservation fee based on room type
async function calculateReservationFee(roomTypeId) {
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
}

// --- Service functions ---
async function createBooking(nestedBooking) {
    const flatBooking = flattenBooking(nestedBooking);
    
    // Calculate reservation fee based on room type
    const reservationFee = await calculateReservationFee(nestedBooking.roomTypeId);
    
    if (!flatBooking.amount || flatBooking.amount < reservationFee) {
        throw new Error(`Payment amount must be at least ₱${reservationFee} (${reservationFee}% of room price).`);
    }

    // Find available rooms
    const availableRooms = await Room.findAll({
        where: { roomTypeId: nestedBooking.roomTypeId, isAvailable: true },
        order: [['roomNumber', 'ASC']], // Order by room number for consistent selection
        limit: flatBooking.rooms || 1
    });
    
    if (availableRooms.length < (flatBooking.rooms || 1)) {
        throw new Error('Not enough available rooms for selected type.');
    }

    const bookings = [];
    for (let i = 0; i < (flatBooking.rooms || 1); i++) {
        const room = availableRooms[i];
        
        // Mark room as occupied
        await room.update({ isAvailable: false });
        
        const booking = await Booking.create({
            ...flatBooking,
            room_id: room.id
        });
        
        const nestedBooking = nestBooking(booking);
        bookings.push(nestedBooking);
        
       
    }
    return bookings;
}

async function getAllBookings() {
    const bookings = await Booking.findAll();
    return bookings.map(nestBooking);
}

async function updateBooking(id, nestedBooking) {
    const booking = await Booking.findByPk(id);
    if (!booking) return null;
    const flatBooking = flattenBooking(nestedBooking);
    await booking.update(flatBooking);
    return nestBooking(booking);
}

async function deleteBooking(id) {
    const booking = await Booking.findByPk(id);
    if (!booking) return false;

    await Archive.create({
        ...booking.toJSON(),
        deleted_at: new Date()
    });

    const room = await Room.findByPk(booking.room_id);
    if (room) {
        await room.update({ isAvailable: true });
    }

    await booking.destroy();
    return true;
}


async function getBookingById(id) {
    const booking = await Booking.findByPk(id);
    if (!booking) return null;
    return nestBooking(booking);
}

module.exports.getBookingById = getBookingById;
