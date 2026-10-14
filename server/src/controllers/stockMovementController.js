const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');

class StockMovementController {
  async getStockMovements(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.product) {
        filter.product = req.query.product;
      }
      if (req.query.type) {
        filter.type = req.query.type;
      }
      if (req.query.reason) {
        filter.reason = req.query.reason;
      }

      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) {
          const end = new Date(req.query.endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }

      // If text search on product name/SKU is passed
      if (req.query.search) {
        const matchingProducts = await Product.find({
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { sku: { $regex: req.query.search, $options: 'i' } },
          ],
        }).select('_id');

        filter.product = { $in: matchingProducts.map((p) => p._id) };
      }

      const total = await StockMovement.countDocuments(filter);
      const movements = await StockMovement.find(filter)
        .populate('product', 'name sku price costPrice quantity')
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        movements,
        { page, limit, total, totalPages },
        'Stock movements log retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockMovementController();
