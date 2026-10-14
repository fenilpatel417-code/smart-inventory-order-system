const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require('../utils/jwt');

class AuthController {
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      setRefreshTokenCookie(res, refreshToken);
      return ApiResponse.created(res, { user, accessToken }, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      setRefreshTokenCookie(res, refreshToken);
      return ApiResponse.success(res, { user, accessToken }, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      // Look for refreshToken in cookies or fallback to request body
      const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const { user, accessToken, refreshToken } = await authService.refreshAccessToken(incomingToken);
      setRefreshTokenCookie(res, refreshToken);
      return ApiResponse.success(res, { user, accessToken }, 'Token refreshed successfully');
    } catch (error) {
      clearRefreshTokenCookie(res);
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user?._id;
      await authService.logout(userId);
      clearRefreshTokenCookie(res);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user._id);
      return ApiResponse.success(res, { user }, 'Current user profile');
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req, res, next) {
    try {
      const user = await authService.updateProfile(req.user._id, req.body);
      return ApiResponse.success(res, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user._id, currentPassword, newPassword);
      clearRefreshTokenCookie(res);
      return ApiResponse.success(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
