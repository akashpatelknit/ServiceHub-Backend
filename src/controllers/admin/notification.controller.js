import { Notification } from '../../models/notification.model.js'
import { User } from '../../core/models/index.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

export default {
    getNotification: asyncHandler(async (req, res) => {
        const notifications = await Notification.find()
        return res.status(200).json(notifications)
    }),
    addNotification: asyncHandler(async (req, res) => {
        const { title, description, type, image } = req.body

        const newNotification = new Notification({
            title,
            description,
            type,
            image
        })

        await newNotification.save()

        return res.status(201).json(newNotification)
    }),
    sendNotification: asyncHandler(async (req, res) => {
        const { title, description, type, image } = req.body

        if (!title || !description || !type) {
            return res.status(400).json({ message: 'All fields are required' })
        }
        let notificationToSend
        if (type === 'customer') {
            notificationToSend = await User.find()
        }

        return res.status(201).json(newNotification)
    })
}
