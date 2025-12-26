/**
 * Rewards Shop Component
 *
 * Virtual shop for purchasing cosmetic items
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Gem, ShoppingBag, Lock, Check, Star } from 'lucide-react';
import type { ShopItem, ShopCategory } from '@aivo/ts-types/gamification.types';

interface RewardsShopProps {
  readonly categories: ReadonlyArray<{ id: ShopCategory; name: string; items: readonly ShopItem[] }>;
  readonly featured: readonly ShopItem[];
  readonly balance: { readonly coins: number; readonly gems: number };
  readonly onPurchase: (itemId: string) => Promise<boolean>;
  readonly ownedItems?: ReadonlySet<string>;
}

const CATEGORY_ICONS: Record<ShopCategory, string> = {
  avatars: '👤',
  frames: '🖼️',
  backgrounds: '🌅',
  effects: '✨',
  boosters: '⚡',
  freezes: '❄️',
  titles: '👑',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-300',
  uncommon: 'border-green-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-amber-400 ring-2 ring-amber-200',
};

interface ItemCardProps {
  readonly item: ShopItem;
  readonly owned?: boolean;
  readonly onPurchase: () => Promise<boolean> | void;
  readonly canAfford: boolean;
}

function ItemCard({ item, owned, onPurchase, canAfford }: ItemCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = () => {
    if (owned || !canAfford) return;
    setIsPurchasing(true);
    void Promise.resolve(onPurchase()).finally(() => {
      setIsPurchasing(false);
    });
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl border-2 p-4
        bg-white dark:bg-gray-800
        ${RARITY_COLORS[item.rarity]}
        ${owned ? 'opacity-75' : 'hover:shadow-lg transition-shadow'}
      `}
      whileHover={owned ? {} : { scale: 1.02 }}
      whileTap={owned ? {} : { scale: 0.98 }}
    >
      {/* Limited tag */}
      {item.isLimited && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
          LIMITED
        </div>
      )}

      {/* Owned badge */}
      {owned && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
        {item.name}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
        {item.description}
      </p>

      {/* Price / Purchase button */}
      {owned ? (
        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
          Owned
        </div>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={!canAfford || isPurchasing}
          className={`
            w-full flex items-center justify-center gap-2 py-2 rounded-lg
            font-semibold text-sm transition-colors
            ${canAfford
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isPurchasing ? (
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          ) : (
            <>
              {item.currency === 'gems' ? (
                <Gem className="w-4 h-4" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              <span>{item.price}</span>
            </>
          )}
        </button>
      )}

      {/* Required level */}
      {item.requiredLevel && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>Level {item.requiredLevel}</span>
        </div>
      )}
    </motion.div>
  );
}

export function RewardsShop({
  categories,
  featured,
  balance,
  onPurchase,
  ownedItems = new Set(),
}: RewardsShopProps) {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | 'featured'>('featured');

  const canAfford = (item: ShopItem) => {
    return item.currency === 'gems' ? balance.gems >= item.price : balance.coins >= item.price;
  };

  const currentItems = selectedCategory === 'featured'
    ? featured
    : categories.find((c) => c.id === selectedCategory)?.items || [];

  return (
    <div className="space-y-6">
      {/* Header with balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Rewards Shop
          </h2>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">
              {balance.coins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <Gem className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-700 dark:text-purple-400">
              {balance.gems.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('featured')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
            transition-colors text-sm font-medium
            ${selectedCategory === 'featured'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }
          `}
        >
          <Star className="w-4 h-4" />
          Featured
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
              transition-colors text-sm font-medium
              ${selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }
            `}
          >
            <span>{CATEGORY_ICONS[category.id]}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        layout
      >
        <AnimatePresence mode="popLayout">
          {currentItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <ItemCard
                item={item}
                owned={ownedItems.has(item.id)}
                onPurchase={() => onPurchase(item.id)}
                canAfford={canAfford(item)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {currentItems.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500">No items in this category</p>
        </div>
      )}
    </div>
  );
}

export default RewardsShop;
