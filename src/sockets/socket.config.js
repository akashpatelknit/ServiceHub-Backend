import { Server } from 'socket.io';
import { allowedOrigins } from '../constants/constants.js';
import { TokenService } from '../features/auth/services/token.service.js';
import { BlacklistService } from '../features/auth/services/blacklist.service.js';
import { IDENTITIES } from '../features/auth/constants/roles.constants.js';

let io = null;

// Dedicated, authenticated namespace for the admin dashboard's live notification
// feed (new bookings, KYC submissions, payment events). Kept separate from the
// default namespace below, which is legacy/unauthenticated and still used by a
// few existing controllers (subscription/wallet/product-order "admins" room) —
// left untouched here so nothing there breaks.
const initializeAdminNamespace = () => {
  const adminNamespace = io.of('/admin');

  adminNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = TokenService.verifyAccessToken(token);
      if (decoded.identity !== IDENTITIES.ADMIN) {
        return next(new Error('Admin access required'));
      }
      if (await BlacklistService.isBlacklisted(decoded.jti)) {
        return next(new Error('Access token has been revoked'));
      }

      socket.adminId = decoded.sub;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  adminNamespace.on('connection', (socket) => {
    socket.join('admin-room');
    console.log(`👨‍💼 Admin ${socket.adminId} connected to /admin: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`❌ Admin socket disconnected: ${socket.id}, Reason: ${reason}`);
    });
  });
};

export const initializeSocket = (server) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    transports: ['polling', 'websocket'],
  });

  console.log('⚡ Socket.IO initialized');

  io.on('connection', (socket) => {
    console.log(`🔗 New socket connected: ${socket.id}`);

    socket.on('registerAdmin', (adminId) => {
      socket.join('admins');
      console.log(`👨‍💼 Admin ${adminId} joined room: admins`);
    });

    socket.on('registerVendor', (vendorId) => {
      socket.join(`vendor_${vendorId}`);
      console.log(`🏪 Vendor ${vendorId} joined their private room`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}, Reason: ${reason}`);
    });
  });

  initializeAdminNamespace();

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized!');
  return io;
};
