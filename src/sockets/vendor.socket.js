import { socketio } from '../app'
import { Vendor } from '../core/models/index.js'
import Booking from '../models/order.model'

socketio.on('connection', (socket) => {
    console.log('A vendor connected: ', socket.id)

    // Update vendor's socket ID
    socket.on('register', async (vendorId) => {
        console.log(vendorId)

        const socketId = socket.id.toString()
        console.log(socketId)

        await Vendor.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(vendorId) },
            { socketId: `${socketId.toString()}` }
        )
            .then(() =>
                console.log('Vendor registered with socket ID:', socket.id)
            )
            .catch((err) => console.log('Error registering vendor:', err))
    })

    // Handle order notifications
    socket.on('acceptOrder', async (orderId) => {
        const order = await Booking.findById(orderId)
        if (order) {
            order.status = 'Accepted'
            order.vendorId = socket.vendorId
            await order.save()
            // Notify all vendors that the order has been accepted
            io.emit('orderStatusUpdated', order)
        }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A vendor disconnected')
    })
})
