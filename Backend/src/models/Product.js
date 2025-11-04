const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Please provide product category'],
      enum: [
        'Electronics',
        'Clothing',
        'Books',
        'Home & Garden',
        'Sports',
        'Toys',
        'Beauty',
        'Automotive',
        'Food',
        'Furniture',
        'Other',
      ],
    },
    condition: {
      type: String,
      enum: ['New', 'Like New', 'Used', 'Fair'],
      default: 'New',
    },
    tradeType: {
      type: String,
      enum: ['FullAmount', 'TopUp', 'Barter','Any'],
      default: 'FullAmount',
    },
    subcategory: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot be more than 5'],
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    specifications: {
      type: Map,
      of: String,
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb', 'oz'],
        default: 'kg',
      },
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['cm', 'm', 'in', 'ft'],
        default: 'cm',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ 'ratings.average': -1 });

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

// Calculate discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

module.exports = mongoose.model('Product', productSchema);
