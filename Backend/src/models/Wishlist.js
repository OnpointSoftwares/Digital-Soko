const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to add product to wishlist
wishlistSchema.methods.addProduct = function (productId) {
  const exists = this.products.some(
    (item) => item.product.toString() === productId.toString()
  );

  if (!exists) {
    this.products.push({ product: productId });
  }
};

// Method to remove product from wishlist
wishlistSchema.methods.removeProduct = function (productId) {
  this.products = this.products.filter(
    (item) => item.product.toString() !== productId.toString()
  );
};

// Method to check if product is in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.products.some(
    (item) => item.product.toString() === productId.toString()
  );
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
