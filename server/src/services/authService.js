const User = require('../models/User');
const ApiError = require('../utils/apiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const bcrypt = require('bcryptjs');

class AuthService {
  async register({ name, email, password, role = 'staff', phone = '' }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save hashed refresh token for rotation security
    const salt = await bcrypt.genSalt(8);
    user.refreshToken = await bcrypt.hash(refreshToken, salt);
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw ApiError.forbidden('Your account is deactivated. Contact an administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh token rotation
    const salt = await bcrypt.genSalt(8);
    user.refreshToken = await bcrypt.hash(refreshToken, salt);
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required.');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token. Please sign in again.');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('User not found or deactivated.');
    }

    if (!user.refreshToken) {
      throw ApiError.unauthorized('Refresh token has been revoked. Please sign in again.');
    }

    const isTokenMatch = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!isTokenMatch) {
      // Possible reuse / compromise detected: revoke stored token
      user.refreshToken = undefined;
      await user.save();
      throw ApiError.unauthorized('Invalid refresh token. Token reuse detected. Please sign in again.');
    }

    // Issue fresh pair (rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(8);
    user.refreshToken = await bcrypt.hash(newRefreshToken, salt);
    await user.save();

    return {
      user: user.toJSON(),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId) {
    if (userId) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
    return { success: true };
  }

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }
    return user.toJSON();
  }

  async updateProfile(userId, { name, phone, avatar }) {
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw ApiError.notFound('User not found.');
    }
    return user.toJSON();
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    user.password = newPassword;
    user.refreshToken = undefined; // Revoke active sessions on password change
    await user.save();

    return { message: 'Password updated successfully. Please log in again.' };
  }
}

module.exports = new AuthService();
