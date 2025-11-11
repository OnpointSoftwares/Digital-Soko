const Trade = require('../models/Trade');
const Product = require('../models/Product');
const { AppError } = require('../utils/errorHandler');

/**
 * @desc    Create a new trade request
 * @route   POST /api/v1/trades
 * @access  Private
 */
exports.createTrade = async (req, res, next) => {
  try {
    const {
      requestedItemId,
      offeredItemId,
      tradeType,
      moneyAmount,
    } = req.body;

    // Validate requested item exists
    const requestedItem = await Product.findById(requestedItemId);
    if (!requestedItem) {
      return next(new AppError('Requested item not found', 404));
    }

    // Validate trade type
    if (!['BarterOnly', 'MoneyOnly', 'BarterPlusMoney'].includes(tradeType)) {
      return next(new AppError('Invalid trade type', 400));
    }

    let offeredItem = null;
    let offeringValue = 0;

    // Validate based on trade type
    if (tradeType === 'BarterOnly' || tradeType === 'BarterPlusMoney') {
      if (!offeredItemId) {
        return next(new AppError('Offered item is required for barter trades', 400));
      }
      
      offeredItem = await Product.findById(offeredItemId);
      if (!offeredItem) {
        return next(new AppError('Offered item not found', 404));
      }

      // Check if user owns the offered item
      if (offeredItem.seller.toString() !== req.user._id.toString()) {
        return next(new AppError('You can only trade items you own', 403));
      }

      offeringValue = offeredItem.price;
    }

    if (tradeType === 'MoneyOnly' || tradeType === 'BarterPlusMoney') {
      if (!moneyAmount || moneyAmount <= 0) {
        return next(new AppError('Valid money amount is required', 400));
      }
      offeringValue += moneyAmount;
    }

    // Prevent trading with yourself
    if (requestedItem.seller.toString() === req.user._id.toString()) {
      return next(new AppError('You cannot trade with yourself', 400));
    }

    // Create trade request
    const trade = await Trade.create({
      requestedItem: {
        itemId: requestedItem._id,
        name: requestedItem.name,
        price: requestedItem.price,
        image: requestedItem.images[0]?.url || '',
      },
      offeredItem: offeredItem ? {
        itemId: offeredItem._id,
        name: offeredItem.name,
        price: offeredItem.price,
        image: offeredItem.images[0]?.url || '',
      } : null,
      buyer: req.user._id,
      seller: requestedItem.seller,
      tradeType,
      moneyAmount: moneyAmount || 0,
      offeringValue,
      requestingValue: requestedItem.price,
    });

    res.status(201).json({
      success: true,
      data: trade,
      message: trade.needsReview 
        ? 'Trade request created and flagged for admin review due to large price difference'
        : 'Trade request created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all trades (filtered by user role)
 * @route   GET /api/v1/trades
 * @access  Private
 */
exports.getTrades = async (req, res, next) => {
  try {
    const { status, needsReview } = req.query;
    let query = {};

    // Filter based on user role
    if (req.user.role === 'admin') {
      // Admin sees all trades
      if (status) query.status = status;
      if (needsReview === 'true') query.needsReview = true;
    } else {
      // Regular users see only their trades (as buyer or seller)
      query.$or = [
        { buyer: req.user._id },
        { seller: req.user._id },
      ];
      if (status) query.status = status;
    }

    const trades = await Trade.find(query)
      .populate('buyer', 'firstName lastName email')
      .populate('seller', 'firstName lastName email')
      .populate('requestedItem.itemId', 'name price images')
      .populate('offeredItem.itemId', 'name price images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: trades.length,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single trade
 * @route   GET /api/v1/trades/:id
 * @access  Private
 */
exports.getTrade = async (req, res, next) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('buyer', 'firstName lastName email')
      .populate('seller', 'firstName lastName email')
      .populate('requestedItem.itemId', 'name price images')
      .populate('offeredItem.itemId', 'name price images');

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      trade.buyer.toString() !== req.user._id.toString() &&
      trade.seller.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Not authorized to view this trade', 403));
    }

    res.status(200).json({
      success: true,
      data: trade,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve trade (Seller or Admin)
 * @route   PUT /api/v1/trades/:id/approve
 * @access  Private
 */
exports.approveTrade = async (req, res, next) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    // Check authorization - only seller or admin can approve
    if (
      req.user.role !== 'admin' &&
      trade.seller.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Only the seller or admin can approve this trade', 403));
    }

    if (trade.status !== 'Pending') {
      return next(new AppError('Only pending trades can be approved', 400));
    }

    trade.status = 'Approved';
    trade.approvedBy = req.user._id;
    trade.approvedDate = new Date();

    await trade.save();

    res.status(200).json({
      success: true,
      data: trade,
      message: 'Trade approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject trade (Seller or Admin)
 * @route   PUT /api/v1/trades/:id/reject
 * @access  Private
 */
exports.rejectTrade = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    // Check authorization - only seller or admin can reject
    if (
      req.user.role !== 'admin' &&
      trade.seller.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Only the seller or admin can reject this trade', 403));
    }

    if (trade.status !== 'Pending') {
      return next(new AppError('Only pending trades can be rejected', 400));
    }

    trade.status = 'Rejected';
    trade.rejectedBy = req.user._id;
    trade.rejectedDate = new Date();
    trade.rejectionReason = reason || 'Not specified';

    await trade.save();

    res.status(200).json({
      success: true,
      data: trade,
      message: 'Trade rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete trade (Seller only)
 * @route   PUT /api/v1/trades/:id/complete
 * @access  Private
 */
exports.completeTrade = async (req, res, next) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    if (trade.seller.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the seller can complete the trade', 403));
    }

    if (trade.status !== 'Approved') {
      return next(new AppError('Only approved trades can be completed', 400));
    }

    trade.status = 'Completed';
    trade.completedDate = new Date();

    await trade.save();

    res.status(200).json({
      success: true,
      data: trade,
      message: 'Trade completed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel trade (Buyer only)
 * @route   PUT /api/v1/trades/:id/cancel
 * @access  Private
 */
exports.cancelTrade = async (req, res, next) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    if (trade.buyer.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the buyer can cancel the trade', 403));
    }

    if (trade.status !== 'Pending') {
      return next(new AppError('Only pending trades can be cancelled', 400));
    }

    trade.status = 'Cancelled';

    await trade.save();

    res.status(200).json({
      success: true,
      data: trade,
      message: 'Trade cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete trade (Admin only)
 * @route   DELETE /api/v1/trades/:id
 * @access  Private/Admin
 */
exports.deleteTrade = async (req, res, next) => {
  try {
    const trade = await Trade.findById(req.params.id);

    if (!trade) {
      return next(new AppError('Trade not found', 404));
    }

    await trade.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Trade deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get trade statistics (Admin only)
 * @route   GET /api/v1/trades/stats
 * @access  Private/Admin
 */
exports.getTradeStats = async (req, res, next) => {
  try {
    const stats = await Trade.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgFairnessScore: { $avg: '$fairnessScore' },
          totalOfferingValue: { $sum: '$offeringValue' },
        },
      },
    ]);

    const flaggedCount = await Trade.countDocuments({ needsReview: true, status: 'Pending' });
    const pendingCount = await Trade.countDocuments({ status: 'Pending' });

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        flaggedTrades: flaggedCount,
        pendingTrades: pendingCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
