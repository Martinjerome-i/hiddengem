/**
 * HIDDEN GEM CAFE - Cart & WhatsApp Ordering Engine
 * Handles client-side cart operations, itemized calculations,
 * customer checkout state, and construction of formatted WhatsApp orders.
 */

class CartManager {
  constructor() {
    this.storageKey = "hiddengem_cart_v1";
    this.customerStorageKey = "hiddengem_customer_v1";
    this.items = this.loadCart();
    this.customer = this.loadCustomer();
    this.listeners = [];
  }

  // Load cart from localStorage safely
  loadCart() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not read cart from localStorage", e);
      return [];
    }
  }

  // Save cart to localStorage
  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
    this.notify();
  }

  // Load customer details from localStorage
  loadCustomer() {
    try {
      const saved = localStorage.getItem(this.customerStorageKey);
      return saved ? JSON.parse(saved) : {
        name: "",
        phone: "",
        orderType: "delivery", // 'delivery' | 'pickup'
        address: "",
        landmark: "",
        notes: ""
      };
    } catch (e) {
      return {
        name: "",
        phone: "",
        orderType: "delivery",
        address: "",
        landmark: "",
        notes: ""
      };
    }
  }

  // Save customer details
  saveCustomer(details) {
    this.customer = { ...this.customer, ...details };
    try {
      localStorage.setItem(this.customerStorageKey, JSON.stringify(this.customer));
    } catch (e) {
      console.warn("Could not save customer details", e);
    }
    this.notify();
  }

  // Subscribe to changes
  subscribe(fn) {
    if (typeof fn === "function") {
      this.listeners.push(fn);
    }
  }

  notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this);
      } catch (err) {
        console.error("Cart listener error:", err);
      }
    });
  }

  // Generate unique item key for product + variant combo
  getItemKey(productId, variantId) {
    return `${productId}___${variantId || "default"}`;
  }

  // Add item to cart
  addItem(productId, variantId, quantity = 1) {
    const product = window.MENU_PRODUCTS.find(p => p.id === productId);
    if (!product) return false;

    let variant = null;
    let unitPrice = product.basePrice;

    if (product.variants && product.variants.length > 0) {
      variant = product.variants.find(v => v.id === variantId) || product.variants[0];
      unitPrice = product.basePrice + (variant.priceDelta || 0);
    }

    const itemKey = this.getItemKey(productId, variant ? variant.id : null);
    const existingIndex = this.items.findIndex(i => i.itemKey === itemKey);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        itemKey: itemKey,
        productId: product.id,
        name: product.name,
        image: product.image,
        variantId: variant ? variant.id : null,
        variantName: variant ? variant.name : "Standard",
        unitPrice: unitPrice,
        quantity: Math.max(1, quantity)
      });
    }

    this.saveCart();
    return true;
  }

  // Update item quantity
  updateQuantity(itemKey, delta) {
    const index = this.items.findIndex(i => i.itemKey === itemKey);
    if (index === -1) return;

    this.items[index].quantity += delta;
    if (this.items[index].quantity <= 0) {
      this.items.splice(index, 1);
    }
    this.saveCart();
  }

  // Set explicit quantity
  setQuantity(itemKey, quantity) {
    const index = this.items.findIndex(i => i.itemKey === itemKey);
    if (index === -1) return;

    if (quantity <= 0) {
      this.items.splice(index, 1);
    } else {
      this.items[index].quantity = quantity;
    }
    this.saveCart();
  }

  // Remove item
  removeItem(itemKey) {
    this.items = this.items.filter(i => i.itemKey !== itemKey);
    this.saveCart();
  }

  // Clear all items
  clearCart() {
    this.items = [];
    this.saveCart();
  }

  // Calculations
  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }

  getDeliveryFee() {
    if (this.customer.orderType === "pickup") return 0;
    const subtotal = this.getSubtotal();
    if (subtotal === 0) return 0;
    const threshold = window.CAFE_CONFIG.ordering.freeDeliveryThreshold || 500;
    if (subtotal >= threshold) return 0;
    return window.CAFE_CONFIG.ordering.standardDeliveryFee || 40;
  }

  getPackagingFee() {
    return window.CAFE_CONFIG.ordering.packagingFee || 0;
  }

  getGrandTotal() {
    return this.getSubtotal() + this.getDeliveryFee() + this.getPackagingFee();
  }

  // Safe HTML Escaping
  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.innerText = str;
    return div.innerHTML;
  }

  // Construct readable WhatsApp Message string
  generateWhatsAppMessage() {
    const cfg = window.CAFE_CONFIG;
    const subtotal = this.getSubtotal();
    const deliveryFee = this.getDeliveryFee();
    const grandTotal = this.getGrandTotal();
    const isPickup = this.customer.orderType === "pickup";

    let msg = `🌿 *NEW ORDER — ${cfg.brandName}* 🌿\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Customer Name:* ${this.customer.name.trim() || "Guest"}\n`;
    if (this.customer.phone && this.customer.phone.trim()) {
      msg += `📞 *Customer Phone:* ${this.customer.phone.trim()}\n`;
    }
    msg += `📦 *Order Type:* ${isPickup ? "☕ Cafe Pickup / Takeaway" : "🛵 Doorstep Delivery"}\n`;

    if (!isPickup) {
      msg += `📍 *Delivery Address:*\n${this.customer.address.trim() || "[Address not specified]"}\n`;
      if (this.customer.landmark && this.customer.landmark.trim()) {
        msg += `🏷️ *Landmark:* ${this.customer.landmark.trim()}\n`;
      }
    } else {
      msg += `📍 *Pickup Store:* ${cfg.address.line2}, ${cfg.address.city}\n`;
      msg += `⏱️ *Ready In Approx:* ${cfg.ordering.estimatedPickupTime}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 *ORDERED ITEMS (${this.getItemCount()} items):*\n\n`;

    this.items.forEach((item, idx) => {
      const lineTotal = item.unitPrice * item.quantity;
      msg += `${idx + 1}. *${item.name}*\n`;
      if (item.variantName && item.variantName !== "Standard") {
        msg += `   • Size / Variant: ${item.variantName}\n`;
      }
      msg += `   • Qty: ${item.quantity} × ${cfg.ordering.currencySymbol}${item.unitPrice} = *${cfg.ordering.currencySymbol}${lineTotal}*\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 *BILL SUMMARY:*\n`;
    msg += `• Items Subtotal: ${cfg.ordering.currencySymbol}${subtotal}\n`;
    msg += `• Eco Packaging: FREE\n`;
    if (!isPickup) {
      if (deliveryFee === 0) {
        msg += `• Delivery Fee: FREE (Order above ${cfg.ordering.currencySymbol}${cfg.ordering.freeDeliveryThreshold})\n`;
      } else {
        msg += `• Delivery Fee: ${cfg.ordering.currencySymbol}${deliveryFee}\n`;
      }
    }
    msg += `⭐ *TOTAL TO PAY: ${cfg.ordering.currencySymbol}${grandTotal}*\n`;
    msg += `_(Inclusive of all applicable cafe taxes)_\n`;

    if (this.customer.notes && this.customer.notes.trim()) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📝 *Order Notes / Instructions:*\n"${this.customer.notes.trim()}"\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⏳ *Next Step:* Kindly confirm my order and share estimated preparation time. Thank you!`;

    return msg;
  }

  // Build the complete wa.me link
  getWhatsAppUrl() {
    const phone = window.CAFE_CONFIG.whatsappRawNumber;
    const message = this.generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encoded}`;
  }
}

// Global instance
window.cart = new CartManager();

