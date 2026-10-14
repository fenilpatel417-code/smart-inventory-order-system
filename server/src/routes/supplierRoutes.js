const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { supplierValidator } = require('../validators/supplierValidator');

router.use(verifyToken);

router.get('/all', supplierController.getAllSuppliersList);
router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', validate(supplierValidator), supplierController.createSupplier);
router.put('/:id', validate(supplierValidator), supplierController.updateSupplier);
router.delete('/:id', authorize('admin'), supplierController.deleteSupplier);

module.exports = router;
