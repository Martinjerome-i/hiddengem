/**
 * HIDDEN GEM CAFE - Configuration File
 * All cafe business settings, WhatsApp number, and store information are configured here.
 * Easily update the WhatsApp phone number, store address, hours, and defaults.
 */

const CAFE_CONFIG = {
  // Brand details
  brandName: "HIDDEN GEM CAFE",
  tagline: "Your New Happy Place",
  subTagline: "Handcrafted Shakes · Specialty Brews · Artisanal Bakes",
  
  // WhatsApp Business Ordering Settings
  // NOTE FOR CAFE OWNER: Replace this with your actual international phone number (with country code, no + or spaces for wa.me)
  whatsappRawNumber: "919566905775", // Format: [CountryCode][MobileNumber], e.g., 919566905775
  whatsappDisplayNumber: "+91 95669 05775",
  whatsappGreeting: "Hello Hidden Gem Cafe! I would like to place an order:",

  // Location & Hours
  address: {
    line1: "115, Siva Complex, Kumaran Street",
    line2: "Palladam Road",
    city: "Pollachi",
    state: "Tamil Nadu",
    pincode: "642002",
    landmark: "Kumaran Street, Palladam Road",
    googleMapsUrl: "https://maps.google.com/?q=115+Siva+Complex+Kumaran+Street+Palladam+Road+Pollachi+Tamil+Nadu+642002"
  },
  
  timings: {
    weekdays: "8:00 AM – 11:30 PM",
    weekends: "8:00 AM – 12:30 AM",
    openDays: "Open All 7 Days",
    dineIn: "8:00 AM – 11:00 PM",
    takeawayDelivery: "8:00 AM – Midnight"
  },

  contact: {
    phone: "+91 95669 05775",
    email: "hello@hiddengemcafe.com",
    instagram: "@hiddengemcafe",
    instagramUrl: "https://instagram.com/hiddengemcafe"
  },

  // Ordering & Delivery Settings
  ordering: {
    currencySymbol: "₹",
    currencyCode: "INR",
    standardDeliveryFee: 40,
    freeDeliveryThreshold: 500,
    packagingFee: 0, // 100% Free eco-friendly packaging
    estimatedDeliveryTime: "25 - 35 mins",
    estimatedPickupTime: "15 - 20 mins",
    taxPercentage: 5, // 5% GST for restaurant takeaway/delivery
    taxInclusive: true // Prices shown on menu are inclusive of taxes
  },

  // Hero Defaults
  hero: {
    defaultVariant: "scroll", // Pure scroll animation is the primary experience
    totalFrames: 168,
    framesBasePath: "hidden-gem-webp-q85/frame_",
    framesExtension: ".webp",
    width: 1920,
    height: 1080,
    fps: 24,
    durationSeconds: 7,
    scrollHeroHeight: "300vh",
    scrollDistanceReduction: "50%"
  }
};

// Export to window
if (typeof window !== "undefined") {
  window.CAFE_CONFIG = CAFE_CONFIG;
}

