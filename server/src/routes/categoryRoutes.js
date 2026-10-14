const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { categoryValidator } = require('../validators/categoryValidator');

router.use(verifyToken);

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', validate(categoryValidator), categoryController.createCategory);
router.put('/:id', validate(categoryValidator), categoryController.updateCategory);
router.delete('/:id', authorize('admin'), categoryController.deleteCategory);

module.exports = router;
