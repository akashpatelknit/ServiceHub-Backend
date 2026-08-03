import { User } from '../../core/models/index.js'

export default {
    addUser: async (data) => {
        return await User.create(data)
    },
    editUser: async (userId, data) => {
        return await User.findByIdAndUpdate(userId, data, { new: true })
    },
    deleteUser: async (userId) => {
        await User.findByIdAndDelete(userId)
    },
    getUserList: async () => {
        return await User.find()
    },
    getUserById: async (userId) => {
        return await User.findById(userId)
    }
}
