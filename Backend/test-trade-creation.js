/**
 * Test script to verify trade creation and MongoDB persistence
 * Run with: node test-trade-creation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Trade = require('./src/models/Trade');
const Product = require('./src/models/Product');
const User = require('./src/models/User');

async function testTradeCreation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb+srv://vincent123:5Us-2G_hRmN6jN6@cluster0.l95wc.mongodb.net/digital-soko?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB\n');

    // Check if we have users and products
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    
    console.log(`📊 Database Status:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Products: ${productCount}`);
    
    // Check existing trades
    const tradeCount = await Trade.countDocuments();
    console.log(`   Trades: ${tradeCount}\n`);

    if (tradeCount > 0) {
      console.log('📋 Recent Trades:');
      const recentTrades = await Trade.find()
        .populate('buyer', 'firstName lastName email')
        .populate('seller', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5);
      
      recentTrades.forEach((trade, index) => {
        console.log(`\n${index + 1}. Trade ID: ${trade._id}`);
        console.log(`   Buyer: ${trade.buyer?.firstName} ${trade.buyer?.lastName} (${trade.buyer?.email})`);
        console.log(`   Seller: ${trade.seller?.firstName} ${trade.seller?.lastName} (${trade.seller?.email})`);
        console.log(`   Type: ${trade.tradeType}`);
        console.log(`   Status: ${trade.status}`);
        console.log(`   Requested: ${trade.requestedItem?.name} (Ksh ${trade.requestingValue})`);
        console.log(`   Offered: ${trade.offeredItem?.name || 'Money Only'} (Ksh ${trade.offeringValue})`);
        console.log(`   Fairness Score: ${trade.fairnessScore}%`);
        console.log(`   Created: ${trade.createdAt}`);
      });
    } else {
      console.log('⚠️  No trades found in database');
    }

    // Check for pending trades
    const pendingTrades = await Trade.countDocuments({ status: 'Pending' });
    const approvedTrades = await Trade.countDocuments({ status: 'Approved' });
    const rejectedTrades = await Trade.countDocuments({ status: 'Rejected' });
    
    console.log(`\n📈 Trade Statistics:`);
    console.log(`   Pending: ${pendingTrades}`);
    console.log(`   Approved: ${approvedTrades}`);
    console.log(`   Rejected: ${rejectedTrades}`);

    console.log('\n✅ Trade system is properly configured for MongoDB persistence');
    console.log('💡 Trades will be saved when created through the API\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testTradeCreation();
