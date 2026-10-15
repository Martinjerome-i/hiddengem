/**
 * HIDDEN GEM CAFE - Streamlined Product Catalogue & Menu Data
 * Curated 6-item representative menu featuring handcrafted cafe specialties.
 */

const MENU_CATEGORIES = [
  { id: "all", name: "All Items", icon: "✨", count: 6 },
  { id: "milkshakes", name: "Milkshakes", icon: "🥤", count: 3, tag: "Signature" },
  { id: "juices", name: "Fresh Fruit Juices", icon: "🍉", count: 1, tag: "100% Pure" },
  { id: "ice-cream", name: "Ice Creams", icon: "🍨", count: 1, tag: "Artisanal" },
  { id: "brownies", name: "Brownies", icon: "🍫", count: 1, tag: "Freshly Baked" }
];

const MENU_PRODUCTS = [
  // 1. Strawberry Cream Shake
  {
    id: "shake-strawberry-cream",
    categoryId: "milkshakes",
    categoryName: "Milkshakes",
    name: "Strawberry Cream Shake",
    tagline: "Featured in Brand Visual",
    description: "Handcrafted with fresh muddled strawberries, velvety vanilla bean cream, and chilled whole milk. Crowned with cloud cream and freeze-dried strawberry crunch.",
    image: "assets/products/strawberry-cream-shake.jpg",
    basePrice: 240,
    priceNote: "Sample price · Editable demo content",
    badge: "Bestseller",
    badgeType: "pink",
    isVeg: true,
    isBestseller: true,
    isFeatured: true,
    variants: [
      { id: "reg", name: "Regular (350ml)", priceDelta: 0 },
      { id: "large", name: "Large (500ml)", priceDelta: 50 },
      { id: "thick", name: "Monster Thickshake (500ml)", priceDelta: 80 }
    ],
    tastingNotes: "Ripe Strawberries · Sweet Cream · Crisp Crumbles"
  },

  // 2. Mango Bliss Shake
  {
    id: "shake-mango-bliss",
    categoryId: "milkshakes",
    categoryName: "Milkshakes",
    name: "Alphonso Mango Bliss",
    tagline: "Featured in Brand Visual",
    description: "Pure Ratnagiri Alphonso mango pulp churned into a rich summer nectar shake. Topped with whipped dairy cream, diced golden mangoes, and honey drizzle.",
    image: "assets/products/mango-bliss-shake.jpg",
    basePrice: 260,
    priceNote: "Sample price · Editable demo content",
    badge: "Seasonal Star",
    badgeType: "gold",
    isVeg: true,
    isBestseller: true,
    isFeatured: true,
    variants: [
      { id: "reg", name: "Regular (350ml)", priceDelta: 0 },
      { id: "large", name: "Large (500ml)", priceDelta: 50 },
      { id: "thick", name: "Extra Loaded Mango Chunks", priceDelta: 70 }
    ],
    tastingNotes: "Ratnagiri Alphonso · Golden Nectar · Whipped Custard"
  },

  // 3. Pistachio Cream Shake
  {
    id: "shake-pistachio-dream",
    categoryId: "milkshakes",
    categoryName: "Milkshakes",
    name: "Pistachio Dream Shake",
    tagline: "Featured in Brand Visual",
    description: "Roasted Sicilian pistachio paste blended with sweet cream and velvety milk. Crowned with pistachio cream drizzle and toasted nut slivers.",
    image: "assets/products/pistachio-dream-shake.jpg",
    basePrice: 280,
    priceNote: "Sample price · Editable demo content",
    badge: "Chef's Special",
    badgeType: "green",
    isVeg: true,
    isBestseller: true,
    isFeatured: true,
    variants: [
      { id: "reg", name: "Regular (350ml)", priceDelta: 0 },
      { id: "large", name: "Large (500ml)", priceDelta: 60 }
    ],
    tastingNotes: "Slow-Roasted Pistachio · Velvet Dairy · Sea Salt Touch"
  },

  // 4. Fresh Fruit Juice
  {
    id: "juice-watermelon-basil",
    categoryId: "juices",
    categoryName: "Fresh Fruit Juices",
    name: "Cold-Pressed Watermelon Basil",
    tagline: "Hydrating & Crisp",
    description: "100% slow cold-pressed Indian watermelon with bruised sweet basil leaves and crushed black salt. Zero added water, preservatives, or refined sugar.",
    image: "assets/products/watermelon-basil-juice.jpg",
    basePrice: 180,
    priceNote: "Sample price · Editable demo content",
    badge: "100% Pure",
    badgeType: "pink",
    isVeg: true,
    isBestseller: false,
    isFeatured: true,
    variants: [
      { id: "reg", name: "Bottle (300ml)", priceDelta: 0 },
      { id: "large", name: "Carafe (500ml)", priceDelta: 50 }
    ],
    tastingNotes: "Watermelon · Sweet Basil · Pink Salt Finish"
  },

  // 5. Ice Cream
  {
    id: "icecream-gelato-trio",
    categoryId: "ice-cream",
    categoryName: "Ice Creams",
    name: "Artisanal Gelato Scoop Trio",
    tagline: "Slow-Churned Italian Style",
    description: "Three slow-churned Italian gelato scoops: Madagascan Vanilla Bean, Alphonso Mango Silk, and Belgian Dark Chocolate with waffle crisp garnish.",
    image: "assets/products/artisanal-trio-gelato.jpg",
    basePrice: 220,
    priceNote: "Sample price · Editable demo content",
    badge: "Artisanal",
    badgeType: "gold",
    isVeg: true,
    isBestseller: true,
    isFeatured: true,
    variants: [
      { id: "cup", name: "Waffle Cup Trio", priceDelta: 0 },
      { id: "cone", name: "Handmade Sugar Cone", priceDelta: 25 }
    ],
    tastingNotes: "Real Vanilla Caviar · Alphonso Mango · 70% Cocoa"
  },

  // 6. Chocolate Brownie
  {
    id: "brownie-warm-fudge",
    categoryId: "brownies",
    categoryName: "Brownies",
    name: "Warm Belgian Fudge Brownie",
    tagline: "Baked Fresh Daily",
    description: "Dense, molten-centered Belgian dark chocolate brownie baked fresh daily. Served warm with dark chocolate drizzle and sea salt flakes.",
    image: "assets/products/belgian-fudge-brownie.jpg",
    basePrice: 190,
    priceNote: "Sample price · Editable demo content",
    badge: "Warm & Gooey",
    badgeType: "brown",
    isVeg: true,
    isBestseller: true,
    isFeatured: true,
    variants: [
      { id: "solo", name: "Warm Brownie Slab", priceDelta: 0 },
      { id: "alamode", name: "A La Mode (+ Vanilla Gelato Scoop)", priceDelta: 60 }
    ],
    tastingNotes: "70% Belgian Cocoa · Molten Fudge · Sea Salt"
  }
];

// Export to window
if (typeof window !== "undefined") {
  window.MENU_CATEGORIES = MENU_CATEGORIES;
  window.MENU_PRODUCTS = MENU_PRODUCTS;
}
