const express = require('express');
const router = express.Router();
const {
  createTrade,
  getTrades,
  getTrade,
  approveTrade,
  rejectTrade,
  completeTrade,
  cancelTrade,
  deleteTrade,
  getTradeStats,
} = require('../controllers/tradeController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validate } = require('../middleware/validation');
const { body } = require('express-validator');

// Trade validation
const createTradeValidation = [
  body('requestedItemId')
    .notEmpty()
    .withMessage('Requested item ID is required')
    .isMongoId()
    .withMessage('Invalid requested item ID'),
  body('tradeType')
    .notEmpty()
    .withMessage('Trade type is required')
    .isIn(['BarterOnly', 'MoneyOnly', 'BarterPlusMoney'])
    .withMessage('Invalid trade type'),
  body('offeredItemId')
    .optional()
    .isMongoId()
    .withMessage('Invalid offered item ID'),
  body('moneyAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Money amount must be a positive number'),
];

const rejectTradeValidation = [
  body('reason')
    .optional()
    .isString()
    .withMessage('Rejection reason must be a string'),
];

// All routes require authentication
router.use(protect);

// Trade statistics (Admin only)
router.get('/stats', authorize('admin'), getTradeStats);

// Get all trades
router.get('/', getTrades);

// Create new trade
router.post('/', createTradeValidation, validate, createTrade);

// Get single trade
router.get('/:id', validateObjectId, validate, getTrade);

// Approve trade (Seller or Admin)
router.put('/:id/approve', validateObjectId, validate, approveTrade);

// Reject trade (Seller or Admin)
router.put(
  '/:id/reject',
  validateObjectId,
  rejectTradeValidation,
  validate,
  rejectTrade
);

// Complete trade (Seller)
router.put('/:id/complete', validateObjectId, validate, completeTrade);

// Cancel trade (Buyer)
router.put('/:id/cancel', validateObjectId, validate, cancelTrade);

// Delete trade (Admin only)
router.delete('/:id', authorize('admin'), validateObjectId, validate, deleteTrade);

module.exports = router;
