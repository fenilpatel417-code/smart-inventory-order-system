const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

class CategoryController {
  async getCategories(req, res, next) {
    try {
      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        filter.name = { $regex: req.query.search, $options: 'i' };
      }

      // Aggregate category with product count
      const categories = await Category.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products',
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            productCount: { $size: '$products' },
          },
        },
        { $sort: { name: 1 } },
      ]);

      return ApiResponse.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        throw ApiError.notFound('Category not found');
      }
      const productCount = await Product.countDocuments({ category: category._id });
      return ApiResponse.success(
        res,
        { ...category.toObject(), productCount },
        'Category details'
      );
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const { name, description, status } = req.body;
      const existing = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
      if (existing) {
        throw ApiError.conflict('A category with this name already exists');
      }

      const category = await Category.create({ name: name.trim(), description, status });
      return ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const { name, description, status } = req.body;
      const category = await Category.findById(req.params.id);
      if (!category) {
        throw ApiError.notFound('Category not found');
      }

      if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existing = await Category.findOne({
          name: { $regex: `^${name.trim()}$`, $options: 'i' },
          _id: { $ne: category._id },
        });
        if (existing) {
          throw ApiError.conflict('Another category already uses this name');
        }
        category.name = name.trim();
      }

      if (description !== undefined) category.description = description;
      if (status) category.status = status;

      await category.save();
      return ApiResponse.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const categoryId = req.params.id;
      const linkedProducts = await Product.countDocuments({ category: categoryId });
      if (linkedProducts > 0) {
        throw ApiError.badRequest(
          `Cannot delete category. There are ${linkedProducts} products assigned to it. Reassign or delete those products first.`
        );
      }

      const deleted = await Category.findByIdAndDelete(categoryId);
      if (!deleted) {
        throw ApiError.notFound('Category not found');
      }

      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
