const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: [true, 'Movement type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity changed is required'],
    },
    previousQuantity: {
      type: Number,
      required: [true, 'Previous quantity is required'],
    },
    newQuantity: {
      type: Number,
      required: [true, 'New quantity is required'],
    },
    reason: {
      type: String,
      enum: [
        'order_confirmed',
        'order_cancelled',
        'purchase_order_received',
        'manual_adjustment',
        'damaged',
        'audit',
        'return',
      ],
      required: [true, 'Adjustment reason is required'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceType',
    },
    referenceType: {
      type: String,
      enum: ['Order', 'PurchaseOrder', 'Manual'],
      default: 'Manual',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who performed action is required'],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });
stockMovementSchema.index({ reason: 1 });
stockMovementSchema.index({ createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
module.exports = StockMovement;
