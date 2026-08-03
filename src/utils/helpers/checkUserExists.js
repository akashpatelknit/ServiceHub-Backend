import { Admin, User, Vendor } from '../../core/models/index.js'

export const checkUserExists = async (userId, role) => {
    try {
        let user

        switch (role) {
            case 'admin':
                user = await Admin.findById(userId)
                break
            case 'vendor':
                user = await Vendor.findById(userId)
                break
            case 'customer':
                user = await User.findById(userId)
                break
            default:
                return false
        }

        return user
    } catch (error) {
        console.error('Error checking user existence:', error)
        return false
    }
}
