const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const { verifyToken, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createProductValidator,
  updateProductValidator,
  adjustStockValidator,
} = require('../validators/productValidator');

// Multer in-memory storage for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.use(verifyToken);

router.get('/export/csv', productController.exportCSV);
router.post('/import/csv', upload.single('file'), productController.importCSV);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', validate(createProductValidator), productController.createProduct);
router.put('/:id', validate(updateProductValidator), productController.updateProduct);
router.delete('/:id', authorize('admin'), productController.deleteProduct);
router.post(
  '/:id/adjust-stock',
  validate(adjustStockValidator),
  productController.adjustStock
);

module.exports = router;
