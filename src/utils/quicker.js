import os from 'os';
import config from '../config/config.js';
import bcrypt from 'bcrypt';
import { parsePhoneNumber } from 'libphonenumber-js';
import { getTimezonesForCountry } from 'countries-and-timezones';
import { v4 } from 'uuid';
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { User } from '../core/models/index.js';
import { ApiError } from './ApiError.js';

export default {
  getSystemHealth: () => {
    return {
      cpuUsage: os.loadavg(),
      totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
      freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
    };
  },
  getApplicationHealth: () => {
    return {
      environment: config.ENV,
      uptime: `${process.uptime().toFixed(2)} Second`,
      memoryUsage: {
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    };
  },
  parsePhoneNumber: (phoneNumber) => {
    try {
      const parsedContactNumber = parsePhoneNumber(phoneNumber);
      if (parsedContactNumber) {
        return {
          countryCode: parsedContactNumber.countryCallingCode,
          isoCode: parsedContactNumber.country || null,
          internationalNumber: parsedContactNumber.formatInternational(),
        };
      }

      return {
        countryCode: null,
        isoCode: null,
        internationalNumber: null,
      };
    } catch (err) {
      return {
        countryCode: null,
        isoCode: null,
        internationalNumber: null,
      };
    }
  },
  hashPassword: (password) => {
    return bcrypt.hash(password, 10);
  },
  comparePassword: (attemptedPassword, encPassword) => {
    return bcrypt.compare(attemptedPassword, encPassword);
  },
  countryTimezone: (isoCode) => {
    return getTimezonesForCountry(isoCode);
  },
  generateRandomId: () => v4(),
  generateOtp: (length) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    return randomInt(min, max + 1).toString();
  },
  generateToken: (payload, secret, expiry) => {
    return jwt.sign(payload, secret, {
      expiresIn: expiry,
    });
  },
  verifyToken: (token, secret) => {
    return jwt.verify(token, secret);
  },
  getDomainFromUrl: (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (err) {
      throw err;
    }
  },
  generateResetPasswordExpiry: (minute) => {
    return dayjs().valueOf() + minute * 60 * 1000;
  },
  generateAccessAndRefereshTokens: async (userId) => {
    try {
      const user = await User.findById(userId);

      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(500, 'Something went wrong while generating referesh and access token');
    }
  },
  generateCoordinatesWithAddress: async (address) => {
    const apiKey = config.GOOGLE_MAP_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;
    const response = await fetch(url);

    // Check if the HTTP response is okay
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();

    if (data.status === 'OK') {
      const { lat, lng } = data.results[0].geometry.location;
      console.log(`Coordinates for ${address}: Latitude: ${lat}, Longitude: ${lng}`);
      return { latitude: lat, longitude: lng };
    } else {
      console.error('Geocoding error:', response.data.status);
      return null;
    }
  },
  isAddressChanged: (existingAddress, newAddress) => {
    if (!existingAddress || !newAddress) return true;

    return (
      existingAddress.line1 !== newAddress.line1 ||
      existingAddress.city !== newAddress.city ||
      existingAddress.state !== newAddress.state ||
      existingAddress.country !== newAddress.country ||
      existingAddress.postalCode !== newAddress.postalCode
    );
  },
  getModelByEntityType: (entityType) => {
    switch (entityType) {
      case 'user':
        return User;
      case 'vendor':
        return Vendor;
      case 'admin':
        return Admin;
      default:
        throw new Error(`Invalid entity type: ${entityType}`);
    }
  },
};
