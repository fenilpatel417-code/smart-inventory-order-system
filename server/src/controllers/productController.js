const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const inventoryService = require('../services/inventoryService');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const { Parser } = require('json2csv');

class ProductController {
  async getProducts(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      const filter = {};

      if (req.query.status) {
        filter.status = req.query.status;
      } else {
        filter.status = { $ne: 'archived' };
      }

      if (req.query.category) {
        filter.category = req.query.category;
      }

      if (req.query.supplier) {
        filter.supplier = req.query.supplier;
      }

      // Stock status filter
      if (req.query.stockStatus === 'out_of_stock') {
        filter.quantity = { $lte: 0 };
      } else if (req.query.stockStatus === 'low_stock') {
        filter.$expr = {
          $and: [
            { $gt: ['$quantity', 0] },
            { $lte: ['$quantity', '$reorderLevel'] },
          ],
        };
      } else if (req.query.stockStatus === 'in_stock') {
        filter.$expr = { $gt: ['$quantity', '$reorderLevel'] };
      }

      // Search term
      if (req.query.search) {
        const searchRegex = { $regex: req.query.search, $options: 'i' };
        filter.$or = [
          { name: searchRegex },
          { sku: searchRegex },
          { description: searchRegex },
        ];
      }

      // Sorting
      let sort = { createdAt: -1 };
      if (req.query.sortBy) {
        const order = req.query.sortOrder === 'asc' ? 1 : -1;
        sort = { [req.query.sortBy]: order };
      }

      const total = await Product.countDocuments(filter);
      const products = await Product.find(filter)
        .populate('category', 'name')
        .populate('supplier', 'name email contactPerson phone')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        products,
        { page, limit, total, totalPages },
        'Products retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await Product.findById(req.params.id)
        .populate('category', 'name')
        .populate('supplier', 'name email phone contactPerson');

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Fetch recent 10 stock movements
      const recentMovements = await StockMovement.find({ product: product._id })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);

      return ApiResponse.success(
        res,
        {
          product,
          recentMovements,
        },
        'Product details'
      );
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const {
        name,
        sku,
        category,
        supplier,
        description,
        price,
        costPrice,
        quantity = 0,
        reorderLevel = 10,
        images = [],
        status = 'active',
      } = req.body;

      // Check unique SKU
      const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
      if (existingSku) {
        throw ApiError.conflict(`Product with SKU "${sku.toUpperCase()}" already exists`);
      }

      // Verify category & supplier exist
      const [catExists, supExists] = await Promise.all([
        Category.findById(category),
        Supplier.findById(supplier),
      ]);

      if (!catExists) {
        throw ApiError.badRequest('Referenced category does not exist');
      }
      if (!supExists) {
        throw ApiError.badRequest('Referenced supplier does not exist');
      }

      const product = await Product.create({
        name,
        sku: sku.toUpperCase(),
        category,
        supplier,
        description,
        price,
        costPrice,
        quantity,
        reorderLevel,
        images,
        status,
      });

      // If initial quantity > 0, log initial movement
      if (quantity > 0) {
        await StockMovement.create({
          product: product._id,
          type: 'in',
          quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          reason: 'manual_adjustment',
          performedBy: req.user._id,
          notes: 'Initial product stock creation',
        });
      }

      const populated = await Product.findById(product._id)
        .populate('category', 'name')
        .populate('supplier', 'name');

      return ApiResponse.created(res, populated, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
        const existingSku = await Product.findOne({
          sku: req.body.sku.toUpperCase(),
          _id: { $ne: product._id },
        });
        if (existingSku) {
          throw ApiError.conflict(`SKU "${req.body.sku.toUpperCase()}" is already in use by another product`);
        }
        product.sku = req.body.sku.toUpperCase();
      }

      if (req.body.category) {
        const cat = await Category.findById(req.body.category);
        if (!cat) throw ApiError.badRequest('Referenced category does not exist');
        product.category = req.body.category;
      }

      if (req.body.supplier) {
        const sup = await Supplier.findById(req.body.supplier);
        if (!sup) throw ApiError.badRequest('Referenced supplier does not exist');
        product.supplier = req.body.supplier;
      }

      const allowedUpdates = ['name', 'description', 'price', 'costPrice', 'reorderLevel', 'images', 'status'];
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          product[field] = req.body[field];
        }
      });

      await product.save();

      const populated = await Product.findById(product._id)
        .populate('category', 'name')
        .populate('supplier', 'name');

      return ApiResponse.success(res, populated, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Soft delete / archive
      product.status = 'archived';
      await product.save();

      return ApiResponse.success(res, null, 'Product archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const { type, quantity, reason, notes } = req.body;
      const result = await inventoryService.adjustStock(req.params.id, {
        type,
        quantity,
        reason,
        notes,
        performedBy: req.user._id,
      });

      return ApiResponse.success(res, result, 'Stock adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req, res, next) {
    try {
      const products = await Product.find({ status: { $ne: 'archived' } })
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ name: 1 });

      const fields = [
        { label: 'SKU', value: 'sku' },
        { label: 'Product Name', value: 'name' },
        { label: 'Category', value: (row) => row.category?.name || '' },
        { label: 'Supplier', value: (row) => row.supplier?.name || '' },
        { label: 'Selling Price ($)', value: 'price' },
        { label: 'Cost Price ($)', value: 'costPrice' },
        { label: 'Current Quantity', value: 'quantity' },
        { label: 'Reorder Level', value: 'reorderLevel' },
        { label: 'Stock Status', value: 'stockStatus' },
        { label: 'Status', value: 'status' },
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(products);

      res.header('Content-Type', 'text/csv');
      res.attachment(`inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  async importCSV(req, res, next) {
    try {
      if (!req.file && !req.body.csvData) {
        throw ApiError.badRequest('CSV file or raw CSV data is required');
      }

      const csvContent = req.file ? req.file.buffer.toString('utf-8') : req.body.csvData;
      const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        throw ApiError.badRequest('CSV content is empty or missing headers');
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      const skuIndex = headers.findIndex((h) => h.includes('sku'));
      const nameIndex = headers.findIndex((h) => h.includes('name'));
      const priceIndex = headers.findIndex((h) => h.includes('price') && !h.includes('cost'));
      const costIndex = headers.findIndex((h) => h.includes('cost'));
      const qtyIndex = headers.findIndex((h) => h.includes('quantity') || h.includes('qty'));
      const reorderIndex = headers.findIndex((h) => h.includes('reorder'));

      if (skuIndex === -1 || nameIndex === -1) {
        throw ApiError.badRequest('CSV must at least contain "SKU" and "Product Name" columns');
      }

      // Default category & supplier
      let defaultCat = await Category.findOne();
      if (!defaultCat) {
        defaultCat = await Category.create({ name: 'General', description: 'General imports' });
      }

      let defaultSup = await Supplier.findOne();
      if (!defaultSup) {
        defaultSup = await Supplier.create({
          name: 'Primary Imports',
          contactPerson: 'Default Agent',
          email: 'imports@example.com',
          phone: '123-456-7890',
        });
      }

      let importedCount = 0;
      let updatedCount = 0;
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const sku = cols[skuIndex]?.toUpperCase();
        const name = cols[nameIndex];

        if (!sku || !name) continue;

        const price = priceIndex !== -1 && !isNaN(Number(cols[priceIndex])) ? Number(cols[priceIndex]) : 10;
        const costPrice = costIndex !== -1 && !isNaN(Number(cols[costIndex])) ? Number(cols[costIndex]) : 5;
        const quantity = qtyIndex !== -1 && !isNaN(Number(cols[qtyIndex])) ? parseInt(cols[qtyIndex], 10) : 0;
        const reorderLevel = reorderIndex !== -1 && !isNaN(Number(cols[reorderIndex])) ? parseInt(cols[reorderIndex], 10) : 10;

        try {
          const existing = await Product.findOne({ sku });
          if (existing) {
            existing.name = name;
            existing.price = price;
            existing.costPrice = costPrice;
            existing.quantity = quantity;
            existing.reorderLevel = reorderLevel;
            await existing.save();
            updatedCount++;
          } else {
            await Product.create({
              name,
              sku,
              category: defaultCat._id,
              supplier: defaultSup._id,
              price,
              costPrice,
              quantity,
              reorderLevel,
              description: 'Imported via CSV',
            });
            importedCount++;
          }
        } catch (err) {
          errors.push({ line: i + 1, sku, error: err.message });
        }
      }

      return ApiResponse.success(
        res,
        { importedCount, updatedCount, errors },
        `CSV Processed: ${importedCount} created, ${updatedCount} updated`
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
