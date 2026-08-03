import crypto from 'node:crypto';
import { ApiError } from '../../../utils/index.js';
import { AuthStrategy } from './auth.strategy.js';
import { PASSWORD_RESET_TOKEN_TTL_MS } from '../constants/token.constants.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailPasswordStrategy extends AuthStrategy {
  async validate(credentials = {}) {
    const identifier = String(credentials.identifier ?? credentials.email ?? credentials.phoneNumber ?? '').trim();
    const { password } = credentials;

    if (!identifier || !password) {
      throw new ApiError(400, 'identifier and password are required');
    }

    return { identifier, password };
  }

  async authenticate(credentials, { Model }) {
    const { identifier, password } = await this.validate(credentials);
    const query = EMAIL_PATTERN.test(identifier) ? { email: identifier.toLowerCase() } : { phoneNumber: identifier };

    const actor = await Model.findOne(query);
    if (!actor || !actor.password) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isMatch = await actor.matchPassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    return actor;
  }

  async register(data, { Model }) {
    const { email, phoneNumber, password } = data;

    if (!password) {
      throw new ApiError(400, 'password is required');
    }
    if (!email && !phoneNumber) {
      throw new ApiError(400, 'email or phoneNumber is required');
    }

    const orConditions = [email && { email: email.toLowerCase() }, phoneNumber && { phoneNumber }].filter(Boolean);
    const exists = await Model.findOne({ $or: orConditions });
    if (exists) {
      throw new ApiError(409, 'Account already exists');
    }

    return Model.create(data);
  }

  async forgotPassword(email, { Model }) {
    if (!email) {
      throw new ApiError(400, 'email is required');
    }

    const actor = await Model.findOne({ email: email.toLowerCase() });
    if (!actor) {
      // Don't reveal whether the email exists — caller returns a generic response either way.
      return null;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    actor.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    actor.passwordResetExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await actor.save({ validateBeforeSave: false });

    return rawToken;
  }

  async resetPassword({ token, newPassword }, { Model }) {
    if (!token || !newPassword) {
      throw new ApiError(400, 'token and newPassword are required');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const actor = await Model.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!actor) {
      throw new ApiError(400, 'Invalid or expired password reset token');
    }

    actor.password = newPassword;
    actor.passwordResetToken = undefined;
    actor.passwordResetExpiry = undefined;
    await actor.save();

    return actor;
  }

  async changePassword({ oldPassword, newPassword }, actor) {
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, 'oldPassword and newPassword are required');
    }
    if (oldPassword === newPassword) {
      throw new ApiError(400, 'newPassword must differ from oldPassword');
    }

    const isMatch = await actor.matchPassword(oldPassword);
    if (!isMatch) {
      throw new ApiError(401, 'oldPassword is incorrect');
    }

    actor.password = newPassword;
    await actor.save();

    return actor;
  }
}
