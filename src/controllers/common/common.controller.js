import axios from 'axios';
import Otp from '../../models/otp_email.model.js';
import { User, Vendor } from '../../core/models/index.js';
import sendEmail from '../../services/otp/sendEmail.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import generateOTP from '../../utils/generateOTP.js';
import quicker from '../../utils/quicker.js';

const sendOtpEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new ApiError(400, 'Email is required');
    return next(error);
  }

  const otp = generateOTP();

  const expiresAt = new Date(Date.now() + 90 * 1000);

  try {
    const emailOTP = await sendEmail('OTP', `Your otp is ${otp}`, email);
    if (!emailOTP.success) {
      const error = new ApiError(500, 'Failed to send OTP');
      return next(error);
    }
    const otpRecord = new Otp({ email, otp: otp.toString(), expiresAt });
    await otpRecord.save();
    res.status(200).json(new ApiResponse(200, 'OTP sent succesfully'));
  } catch (error) {
    const errorMessage = new ApiError(500, error.message || 'Failed to send OTP');
    return next(errorMessage);
  }
});

const verifyOtpEmail = (type) =>
  asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      const error = new ApiError(400, 'Email and OTP are required');
      return next(error);
    }

    try {
      const otpRecord = await Otp.findOne({ email });

      if (!otpRecord) {
        const error = new ApiError(400, 'Invalid OTP or OTP expired');
        return next(error);
      }

      if (new Date() > otpRecord.expiresAt) {
        await Otp.deleteOne({ email });
        const error = new ApiError(400, 'OTP has expired. Please request a new OTP.');
        return next(error);
      }

      if (otp !== otpRecord.otp) {
        const error = new ApiError(400, 'Invalid OTP. Please check the OTP and try again.');
        return next(error);
      }

      let user;
      if (type === 'vendor') {
        user = await Vendor.findOne({ email });
      } else if (type === 'customer') {
        user = await User.findOne({ email });
      } else if (type === 'admin') {
        user = await Admin.findOne({ email });
      }

      if (!user) {
        const error = new ApiError(404, 'User not found for this email.');
        return next(error);
      }

      user.isVerified = true;
      user.isEmailVerified = true;
      await user.save();

      const updatedUser = await user.constructor.findById(user._id).select('-password -refreshToken');

      await Otp.deleteOne({ email });

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            redirectUrl: '/login',
            user: updatedUser, // include updated user in response
          },
          'OTP verified successfully!'
        )
      );
    } catch (error) {
      const errorMessage = new ApiError(500, error.message || 'Error verifying OTP');
      return next(errorMessage);
    }
  });

const sendMobileOtp = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    const error = new ApiError(400, 'Phone number is required');
    return next(error);
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 90 * 1000);

  try {
    const otpRecord = new Otp({
      number: phoneNumber,
      otp: otp.toString(),
      expiresAt,
    });

    await otpRecord.save();
    // const send = await sendOtpToPhone(phoneNumber, otp);

    // if (!send.success) {
    //   const error = new ApiError(500, 'Failed to send OTP');
    //   return next(error);
    // }

    return res.status(200).json(new ApiResponse(200, 'OTP sent successfully'));
  } catch (error) {
    const errorMessage = new ApiError(500, error.message || 'Failed to send OTP');
    return next(errorMessage);
  }
});

const verifyMobileOtp = (type) =>
  asyncHandler(async (req, res, next) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    try {
      const otpRecord = await Otp.findOne({ phoneNumber });

      if (!otpRecord) {
        const error = new ApiError(400, 'Invalid OTP or OTP expired');
        return next(error);
      }

      if (new Date() > otpRecord.expiresAt) {
        await Otp.deleteOne({ email });
        const error = new ApiError(400, 'OTP has expired. Please request a new OTP.');
        return next(error);
      }

      if (otp !== otpRecord.otp) {
        const error = new ApiError(400, 'Invalid OTP. Please check the OTP and try again.');
        return next(error);
      }

      let user;
      if (type === 'vendor') {
        user = await Vendor.findOne({ phoneNumber });
      } else if (type === 'customer') {
        user = await User.findOne({ phoneNumber });
      } else if (type === 'admin') {
        user = await Admin.findOne({ phoneNumber });
      }

      if (!user) {
        const error = new ApiError(404, 'User not found for this phoneNumer.');
        return next(error);
      }

      user.isVerified = true;
      user.isMobileVerified = true;
      await user.save();

      await Otp.deleteOne({ email });
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            redirectUrl: '/login',
          },
          'OTP verified successfully!'
        )
      );
    } catch (error) {
      const errorMessage = new ApiError(500, error.message || 'Failed to send OTP');
      return next(errorMessage);
    }
  });

const selfIdentification = asyncHandler((req, res, next) => {
  const { user } = req;
  const { password: _, refreshToken: __, ...vendorData } = user.toObject();
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: vendorData,
      },
      'User identified successfully'
    )
  );
});

const refreshToken = (userType) =>
  asyncHandler(async (req, res, next) => {
    const { cookies } = req;
    const { refreshToken } = cookies;

    if (!refreshToken) {
      const error = new ApiError(401, responseMessages.UNAUTHORIZED);
      return next(error);
    }

    const { _id } = quicker.verifyToken(refreshToken, config.REFRESH_TOKEN.SECRET);

    if (!_id) {
      const error = new ApiError(401, responseMessages.UNAUTHORIZED);
      return next(error);
    }

    let user;
    if (type === 'vendor') {
      user = await Vendor.findOne({ email });
    } else if (type === 'customer') {
      user = await User.findOne({ email });
    } else if (type === 'admin') {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      const error = new ApiError(401, responseMessages.UNAUTHORIZED);
      return next(error);
    }

    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save();

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 1000 * 60 * 24 * 30, // 30 days
    };

    const { password: _, refreshToken: __, ...vendorData } = user.toObject();

    res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: vendorData,
            accessToken,
          },
          'Token refreshed successfully'
        )
      );
  });

const getCoordinatesByAddress = asyncHandler(async (req, res, next) => {
  const { address } = req.query;
  const { latitude, longitude } = await quicker.generateCoordinatesWithAddress(address);

  res.status(200).send(new ApiResponse(200, { latitude, longitude }, 'Success'));
});

export {
  sendOtpEmail,
  verifyOtpEmail,
  sendMobileOtp,
  verifyMobileOtp,
  selfIdentification,
  refreshToken,
  getCoordinatesByAddress,
};
