/**
 * Product Card Component — Reusable product display for grids
 */

import React from 'react';
import Link from 'next/link';
import { HeartIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

export interface ProductCardData {
  id: number;
  name: string;
  nameAr?: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  currencyCode?: string;
  imageUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  inStock?: boolean;
  categoryName?: string;
  brandName?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  storeSlug: string;
  isWishlisted?: boolean;
  onAddToCart?: (product: ProductCardData) => void;
  onToggleWishlist?: (product: ProductCardData) => void;
}

function formatPrice(price: number, currency?: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'SAR',
    minimumFractionDigits: 2,
  }).format(price);
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= Math.round(rating) ? (
          <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
        ) : (
          <StarIcon key={star} className="h-4 w-4 text-gray-300 dark:text-gray-600" />
        )
      ))}
    </div>
  );
}

export default function ProductCard({ product, storeSlug, isWishlisted, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <Link href={`/store/${storeSlug}/products/${product.slug}`}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCartIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount && (
            <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
              -{discount}%
            </span>
          )}
          {!product.inStock && (
            <span className="px-2 py-1 text-xs font-semibold bg-gray-800 text-white rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        {onToggleWishlist && (
          <button
            onClick={() => onToggleWishlist(product)}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            {isWishlisted ? (
              <HeartSolidIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.categoryName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{product.categoryName}</p>
        )}

        <Link href={`/store/${storeSlug}/products/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.averageRating !== undefined && product.averageRating > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {renderStars(product.averageRating)}
            <span className="text-xs text-gray-500">({product.reviewCount || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice(product.price, product.currencyCode)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compareAtPrice, product.currencyCode)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        {onAddToCart && product.inStock !== false && (
          <button
            onClick={() => onAddToCart(product)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
