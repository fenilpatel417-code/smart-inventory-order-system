const Customer = require('../models/Customer');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class CustomerController {
  async getCustomers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const total = await Customer.countDocuments(filter);
      const customers = await Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        customers,
        { page, limit, total, totalPages },
        'Customers retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getAllCustomersList(req, res, next) {
    try {
      const customers = await Customer.find({ status: 'active' })
        .select('name email phone address')
        .sort({ name: 1 });
      return ApiResponse.success(res, customers, 'Active customers list');
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req, res, next) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        throw ApiError.notFound('Customer not found');
      }

      const orders = await Order.find({ customer: customer._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber total orderStatus paymentStatus createdAt items');

      return ApiResponse.success(
        res,
        { customer, orders },
        'Customer details'
      );
    } catch (error) {
      next(error);
    }
  }

  async createCustomer(req, res, next) {
    try {
      const { name, email, phone, address, status } = req.body;
      const existing = await Customer.findOne({ email: email.toLowerCase() });
      if (existing) {
        throw ApiError.conflict('Customer with this email address already exists');
      }

      const customer = await Customer.create({
        name,
        email: email.toLowerCase(),
        phone,
        address,
        status: status || 'active',
      });

      return ApiResponse.created(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateCustomer(req, res, next) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        throw ApiError.notFound('Customer not found');
      }

      if (req.body.email && req.body.email.toLowerCase() !== customer.email) {
        const existing = await Customer.findOne({
          email: req.body.email.toLowerCase(),
          _id: { $ne: customer._id },
        });
        if (existing) {
          throw ApiError.conflict('Email address is taken by another customer');
        }
      }

      Object.assign(customer, req.body);
      await customer.save();

      return ApiResponse.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomer(req, res, next) {
    try {
      const customerId = req.params.id;
      const orderCount = await Order.countDocuments({ customer: customerId });
      if (orderCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete customer with ${orderCount} existing order records.`
        );
      }

      const deleted = await Customer.findByIdAndDelete(customerId);
      if (!deleted) {
        throw ApiError.notFound('Customer not found');
      }

      return ApiResponse.success(res, null, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
