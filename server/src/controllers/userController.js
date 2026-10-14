const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class UserController {
  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.role) {
        filter.role = req.query.role;
      }
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const total = await User.countDocuments(filter);
      const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        users,
        { page, limit, total, totalPages },
        'Users retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        throw ApiError.notFound('User not found');
      }
      return ApiResponse.success(res, user, 'User details');
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const { name, email, password, role, phone, status } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        throw ApiError.conflict('User with this email already exists');
      }

      const user = await User.create({
        name,
        email,
        password: password || 'Password123!',
        role: role || 'staff',
        phone: phone || '',
        status: status || 'active',
      });

      return ApiResponse.created(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { name, email, role, phone, status } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
          throw ApiError.conflict('Email is already taken by another user');
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (role) user.role = role;
      if (phone !== undefined) user.phone = phone;
      if (status) user.status = status;

      await user.save();
      return ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      // Prevent deleting self
      if (req.user._id.toString() === req.params.id) {
        throw ApiError.badRequest('You cannot delete your own account');
      }

      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return ApiResponse.success(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
