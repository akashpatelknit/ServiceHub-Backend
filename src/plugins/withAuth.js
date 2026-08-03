import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export function withAuth(schema) {
  schema.add({ refreshToken: { type: String, select: false } });

  schema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });

  schema.methods.matchPassword = function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  };

  schema.methods.generateAccessToken = function () {
    return jwt.sign({ _id: this._id, role: this.role }, config.ACCESS_TOKEN.SECRET, {
      expiresIn: config.ACCESS_TOKEN.EXPIRY,
    });
  };

  schema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id, role: this.role }, config.REFRESH_TOKEN.SECRET, {
      expiresIn: config.REFRESH_TOKEN.EXPIRY,
    });
  };
}
