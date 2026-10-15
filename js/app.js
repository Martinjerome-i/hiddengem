/**
 * HIDDEN GEM CAFE - Main Application Logic
 * UI interactions, Menu Rendering, Search/Filters, Cart Drawer,
 * Modal Controls, and WhatsApp Ordering Flow.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize State
  let activeCategory = "all";
  let searchQuery = "";
  let activeFilterTag = "all";

  // 2. Elements Cache
  const menuContainer = document.getElementById("menuProductGrid");
  const categoryNav = document.getElementById("categoryNavList");
  const searchInput = document.getElementById("menuSearchInput");
  const searchClearBtn = document.getElementById("searchClearBtn");
  const filterTags = document.querySelectorAll("[data-filter-tag]");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartToggleBtns = document.querySelectorAll("[data-cart-toggle]");
  const cartCloseBtn = document.getElementById("cartCloseBtn");
  const cartBadgeCount = document.querySelectorAll(".cart-count-badge");
  const mobileBarCount = document.getElementById("mobileCartCount");
  const mobileBarTotal = document.getElementById("mobileCartTotal");
  const mobileBar = document.getElementById("stickyMobileCartBar");

  // ==========================================
  // MENU RENDERING & FILTERING
  // ==========================================

  function renderCategories() {
    if (!categoryNav || !window.MENU_CATEGORIES) return;

    categoryNav.innerHTML = window.MENU_CATEGORIES.map(cat => `
      <button 
        type="button" 
        class="category-pill ${cat.id === activeCategory ? 'active' : ''}" 
        data-category-id="${cat.id}"
        aria-pressed="${cat.id === activeCategory ? 'true' : 'false'}"
      >
        <span class="cat-icon">${cat.icon}</span>
        <span class="cat-name">${cat.name}</span>
        ${cat.tag ? `<span class="cat-tag">${cat.tag}</span>` : ''}
      </button>
    `).join("");

    // Bind category click events
    categoryNav.querySelectorAll(".category-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        activeCategory = btn.getAttribute("data-category-id");
        categoryNav.querySelectorAll(".category-pill").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        renderMenu();
      });
    });
  }

  function getFilteredProducts() {
    let items = window.MENU_PRODUCTS || [];

    // Filter by Category
    if (activeCategory !== "all") {
      items = items.filter(p => p.categoryId === activeCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.tastingNotes && p.tastingNotes.toLowerCase().includes(q))
      );
    }

    // Filter by Dietary/Special Tag
    if (activeFilterTag === "bestseller") {
      items = items.filter(p => p.isBestseller);
    } else if (activeFilterTag === "featured") {
      items = items.filter(p => p.isFeatured);
    }

    return items;
  }

  function renderMenu() {
    if (!menuContainer) return;
    const items = getFilteredProducts();

    if (items.length === 0) {
      menuContainer.innerHTML = `
        <div class="menu-empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No delicious treats found</h3>
          <p>We couldn't find anything matching "<strong>${window.cart.escapeHtml(searchQuery)}</strong>". Try another keyword or browse all categories.</p>
          <button type="button" class="btn btn-terracotta" id="resetSearchBtn">View All Items</button>
        </div>
      `;
      const resetBtn = document.getElementById("resetSearchBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (searchInput) searchInput.value = "";
          searchQuery = "";
          activeCategory = "all";
          renderCategories();
          renderMenu();
        });
      }
      return;
    }

    menuContainer.innerHTML = items.map(product => {
      const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
      const initialPrice = product.basePrice + (defaultVariant ? defaultVariant.priceDelta : 0);

      return `
        <article class="product-card" id="card-${product.id}" data-product-id="${product.id}">
          <div class="product-image-wrap">
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              class="product-image" 
              loading="lazy"
              onerror="this.src='assets/frames-webp/ezgif-frame-001.webp'"
            />
            ${product.badge ? `
              <span class="product-badge badge-${product.badgeType || 'terracotta'}">
                ${product.badge}
              </span>
            ` : ''}
            <div class="veg-badge" title="100% Vegetarian">
              <span class="veg-dot"></span>
            </div>
          </div>

          <div class="product-details">
            <div class="product-header">
              <div>
                ${product.tagline ? `<div class="product-tagline">${product.tagline}</div>` : ''}
                <h3 class="product-title">${product.name}</h3>
              </div>
              <div class="product-price-wrap">
                <span class="currency">₹</span>
                <span class="product-price" id="price-${product.id}">${initialPrice}</span>
              </div>
            </div>

            <p class="product-desc">${product.description}</p>
            
            ${product.tastingNotes ? `
              <div class="tasting-notes">
                <span class="notes-icon">✨</span>
                <span>${product.tastingNotes}</span>
              </div>
            ` : ''}

            <!-- Variant Selector -->
            ${product.variants && product.variants.length > 1 ? `
              <div class="variant-selector-wrap">
                <label for="variant-${product.id}" class="variant-label">Choose Size / Variant:</label>
                <div class="variant-chips" id="variantChips-${product.id}">
                  ${product.variants.map((v, i) => `
                    <button 
                      type="button" 
                      class="variant-chip ${i === 0 ? 'selected' : ''}" 
                      data-variant-id="${v.id}"
                      data-price-delta="${v.priceDelta}"
                      data-product-id="${product.id}"
                    >
                      ${v.name} ${v.priceDelta > 0 ? `(+₹${v.priceDelta})` : ''}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="card-action-bar">
              <!-- Stepper -->
              <div class="quantity-stepper">
                <button type="button" class="stepper-btn minus" data-stepper-btn="minus" data-target="${product.id}" aria-label="Decrease quantity">−</button>
                <span class="stepper-value" id="qty-${product.id}">1</span>
                <button type="button" class="stepper-btn plus" data-stepper-btn="plus" data-target="${product.id}" aria-label="Increase quantity">+</button>
              </div>

              <!-- Add to Cart Button -->
              <button 
                type="button" 
                class="btn btn-add-cart" 
                data-add-product="${product.id}"
                aria-label="Add ${product.name} to cart"
              >
                <span class="btn-icon">🛒</span>
                <span class="btn-text">Add to Cart</span>
              </button>
            </div>

            <div class="sample-price-tag">
              <span>Sample price · Editable demo content</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    bindProductCardEvents();
  }

  function bindProductCardEvents() {
    // 1. Variant Chip Click
    document.querySelectorAll(".variant-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const prodId = chip.getAttribute("data-product-id");
        const parent = chip.closest(".variant-chips");
        parent.querySelectorAll(".variant-chip").forEach(c => c.classList.remove("selected"));
        chip.classList.add("selected");

        // Update displayed price
        const delta = parseInt(chip.getAttribute("data-price-delta"), 10) || 0;
        const product = window.MENU_PRODUCTS.find(p => p.id === prodId);
        if (product) {
          const priceElem = document.getElementById(`price-${prodId}`);
          if (priceElem) {
            priceElem.textContent = product.basePrice + delta;
          }
        }
      });
    });

    // 2. Quantity Stepper (+ / -)
    document.querySelectorAll("[data-stepper-btn]").map = null; // safety
    document.querySelectorAll("[data-stepper-btn]").forEach(btn => {
      btn.addEventListener("click", () => {
        const prodId = btn.getAttribute("data-target");
        const action = btn.getAttribute("data-stepper-btn");
        const qtyElem = document.getElementById(`qty-${prodId}`);
        if (!qtyElem) return;

        let curQty = parseInt(qtyElem.textContent, 10) || 1;
        if (action === "plus") {
          curQty = Math.min(20, curQty + 1);
        } else if (action === "minus") {
          curQty = Math.max(1, curQty - 1);
        }
        qtyElem.textContent = curQty;
      });
    });

    // 3. Add to Cart
    document.querySelectorAll("[data-add-product]").forEach(btn => {
      btn.addEventListener("click", () => {
        const prodId = btn.getAttribute("data-add-product");
        const qtyElem = document.getElementById(`qty-${prodId}`);
        const qty = qtyElem ? parseInt(qtyElem.textContent, 10) || 1 : 1;

        // Selected variant
        let variantId = null;
        const selectedChip = document.querySelector(`#variantChips-${prodId} .variant-chip.selected`);
        if (selectedChip) {
          variantId = selectedChip.getAttribute("data-variant-id");
        }

        const success = window.cart.addItem(prodId, variantId, qty);
        if (success) {
          // Visual feedback on button
          btn.classList.add("added-success");
          const originalText = btn.innerHTML;
          btn.innerHTML = `<span class="btn-icon">✓</span> <span class="btn-text">Added!</span>`;
          setTimeout(() => {
            btn.classList.remove("added-success");
            btn.innerHTML = originalText;
          }, 1200);

          // Trigger Toast
          const product = window.MENU_PRODUCTS.find(p => p.id === prodId);
          showToast(`Added ${qty}× ${product ? product.name : "item"} to cart!`, "success");
        }
      });
    });
  }

  // Search Input Handler
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery.trim() ? "block" : "none";
      }
      renderMenu();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchQuery = "";
        searchClearBtn.style.display = "none";
        renderMenu();
      }
    });
  }

  // Tag filter handlers
  filterTags.forEach(tagBtn => {
    tagBtn.addEventListener("click", () => {
      filterTags.forEach(t => t.classList.remove("active"));
      tagBtn.classList.add("active");
      activeFilterTag = tagBtn.getAttribute("data-filter-tag");
      renderMenu();
    });
  });

  // ==========================================
  // CART DRAWER & CHECKOUT
  // ==========================================

  function openCart() {
    if (cartDrawer) {
      cartDrawer.classList.add("open");
      cartDrawer.setAttribute("aria-hidden", "false");
    }
    if (cartBackdrop) {
      cartBackdrop.classList.add("visible");
    }
    document.body.classList.add("cart-open");
    renderCart();
  }

  function closeCart() {
    if (cartDrawer) {
      cartDrawer.classList.remove("open");
      cartDrawer.setAttribute("aria-hidden", "true");
    }
    if (cartBackdrop) {
      cartBackdrop.classList.remove("visible");
    }
    document.body.classList.remove("cart-open");
  }

  cartToggleBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openCart();
    });
  });

  if (cartCloseBtn) {
    cartCloseBtn.addEventListener("click", closeCart);
  }

  if (cartBackdrop) {
    cartBackdrop.addEventListener("click", closeCart);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartDrawer && cartDrawer.classList.contains("open")) {
      closeCart();
    }
  });

  // Render Cart UI
  function renderCart() {
    const cartItemsList = document.getElementById("cartItemsList");
    const cartSubtotalElem = document.getElementById("cartSubtotal");
    const cartDeliveryFeeElem = document.getElementById("cartDeliveryFee");
    const cartTotalElem = document.getElementById("cartGrandTotal");
    const cartEmptyState = document.getElementById("cartEmptyView");
    const cartFilledState = document.getElementById("cartFilledView");
    const currency = window.CAFE_CONFIG.ordering.currencySymbol;

    const count = window.cart.getItemCount();
    const subtotal = window.cart.getSubtotal();
    const deliveryFee = window.cart.getDeliveryFee();
    const grandTotal = window.cart.getGrandTotal();

    // Update badges
    cartBadgeCount.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    });

    if (mobileBarCount) mobileBarCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    if (mobileBarTotal) mobileBarTotal.textContent = `${currency}${grandTotal}`;
    if (mobileBar) {
      mobileBar.style.display = count > 0 ? "flex" : "none";
    }

    // Toggle Empty vs Filled views
    if (count === 0) {
      if (cartEmptyState) cartEmptyState.style.display = "flex";
      if (cartFilledState) cartFilledState.style.display = "none";
      return;
    }

    if (cartEmptyState) cartEmptyState.style.display = "none";
    if (cartFilledState) cartFilledState.style.display = "block";

    // Populate Items
    if (cartItemsList) {
      cartItemsList.innerHTML = window.cart.items.map(item => `
        <li class="cart-item-row" data-item-key="${item.itemKey}">
          <div class="cart-item-thumb-wrap">
            <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" />
          </div>
          
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-variant">${item.variantName}</div>
            <div class="cart-item-price-unit">${currency}${item.unitPrice} each</div>
            
            <div class="cart-item-stepper-row">
              <div class="cart-stepper">
                <button type="button" class="cart-step-btn minus" data-cart-delta="-1" data-key="${item.itemKey}" aria-label="Decrease quantity">−</button>
                <span class="cart-step-qty">${item.quantity}</span>
                <button type="button" class="cart-step-btn plus" data-cart-delta="1" data-key="${item.itemKey}" aria-label="Increase quantity">+</button>
              </div>

              <div class="cart-item-line-total">
                ${currency}${item.unitPrice * item.quantity}
              </div>

              <button type="button" class="cart-item-remove-btn" data-cart-remove="${item.itemKey}" title="Remove item" aria-label="Remove ${item.name}">
                ✕
              </button>
            </div>
          </div>
        </li>
      `).join("");

      // Bind Cart Steppers & Remove
      cartItemsList.querySelectorAll("[data-cart-delta]").forEach(btn => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-key");
          const delta = parseInt(btn.getAttribute("data-cart-delta"), 10);
          window.cart.updateQuantity(key, delta);
        });
      });

      cartItemsList.querySelectorAll("[data-cart-remove]").forEach(btn => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-cart-remove");
          window.cart.removeItem(key);
        });
      });
    }

    // Bill calculations
    if (cartSubtotalElem) cartSubtotalElem.textContent = `${currency}${subtotal}`;
    if (cartDeliveryFeeElem) {
      if (window.cart.customer.orderType === "pickup") {
        cartDeliveryFeeElem.textContent = "FREE (Pickup)";
      } else if (deliveryFee === 0) {
        cartDeliveryFeeElem.innerHTML = `<span class="badge-free">FREE</span>`;
      } else {
        cartDeliveryFeeElem.textContent = `${currency}${deliveryFee}`;
      }
    }
    if (cartTotalElem) cartTotalElem.textContent = `${currency}${grandTotal}`;

    // Update Customer details in form
    syncCustomerFormInputs();
  }

  function syncCustomerFormInputs() {
    const cust = window.cart.customer;
    const nameInput = document.getElementById("custNameInput");
    const phoneInput = document.getElementById("custPhoneInput");
    const addressInput = document.getElementById("custAddressInput");
    const landmarkInput = document.getElementById("custLandmarkInput");
    const notesInput = document.getElementById("custNotesInput");
    const addressWrap = document.getElementById("deliveryAddressSection");

    if (nameInput && !nameInput.matches(":focus")) nameInput.value = cust.name || "";
    if (phoneInput && !phoneInput.matches(":focus")) phoneInput.value = cust.phone || "";
    if (addressInput && !addressInput.matches(":focus")) addressInput.value = cust.address || "";
    if (landmarkInput && !landmarkInput.matches(":focus")) landmarkInput.value = cust.landmark || "";
    if (notesInput && !notesInput.matches(":focus")) notesInput.value = cust.notes || "";

    // Toggle Order Type UI
    const typeRadios = document.querySelectorAll("input[name='orderType']");
    typeRadios.forEach(radio => {
      radio.checked = radio.value === cust.orderType;
    });

    if (addressWrap) {
      addressWrap.style.display = cust.orderType === "delivery" ? "block" : "none";
    }
  }

  // Bind Form Inputs
  const nameInput = document.getElementById("custNameInput");
  const phoneInput = document.getElementById("custPhoneInput");
  const addressInput = document.getElementById("custAddressInput");
  const landmarkInput = document.getElementById("custLandmarkInput");
  const notesInput = document.getElementById("custNotesInput");

  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      window.cart.customer.name = e.target.value;
      window.cart.saveCustomer({ name: e.target.value });
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      window.cart.customer.phone = e.target.value;
      window.cart.saveCustomer({ phone: e.target.value });
    });
  }

  if (addressInput) {
    addressInput.addEventListener("input", (e) => {
      window.cart.customer.address = e.target.value;
      window.cart.saveCustomer({ address: e.target.value });
    });
  }

  if (landmarkInput) {
    landmarkInput.addEventListener("input", (e) => {
      window.cart.customer.landmark = e.target.value;
      window.cart.saveCustomer({ landmark: e.target.value });
    });
  }

  if (notesInput) {
    notesInput.addEventListener("input", (e) => {
      window.cart.customer.notes = e.target.value;
      window.cart.saveCustomer({ notes: e.target.value });
    });
  }

  // Order Type Radio Change
  document.querySelectorAll("input[name='orderType']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      window.cart.saveCustomer({ orderType: e.target.value });
      renderCart();
    });
  });

  // Clear Cart Button
  const clearCartBtn = document.getElementById("clearCartBtn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear your cart?")) {
        window.cart.clearCart();
        showToast("Cart cleared", "info");
      }
    });
  }

  // Subscribe cart changes to renderCart
  window.cart.subscribe(() => {
    renderCart();
  });

  // ==========================================
  // WHATSAPP ORDERING TRIGGER & REVIEW MODAL
  // ==========================================

  const orderWhatsAppBtn = document.getElementById("orderWhatsAppBtn");
  const orderReviewModal = document.getElementById("orderReviewModal");
  const reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
  const closeReviewModalBtn = document.getElementById("closeReviewModalBtn");
  const confirmSendWhatsAppBtn = document.getElementById("confirmSendWhatsAppBtn");
  const reviewMessagePreview = document.getElementById("reviewMessagePreview");

  if (orderWhatsAppBtn) {
    orderWhatsAppBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Form validation
      const cust = window.cart.customer;
      if (!cust.name || !cust.name.trim()) {
        showToast("Please enter your name for the order", "error");
        if (nameInput) nameInput.focus();
        return;
      }

      if (cust.orderType === "delivery" && (!cust.address || !cust.address.trim())) {
        showToast("Please enter your delivery address", "error");
        if (addressInput) addressInput.focus();
        return;
      }

      if (window.cart.getItemCount() === 0) {
        showToast("Your cart is empty", "error");
        return;
      }

      // Show Order Review Modal
      openReviewModal();
    });
  }

  function openReviewModal() {
    if (!orderReviewModal) return;
    const msg = window.cart.generateWhatsAppMessage();
    if (reviewMessagePreview) {
      reviewMessagePreview.textContent = msg;
    }
    orderReviewModal.classList.add("open");
    if (reviewModalBackdrop) reviewModalBackdrop.classList.add("visible");
  }

  function closeReviewModal() {
    if (!orderReviewModal) return;
    orderReviewModal.classList.remove("open");
    if (reviewModalBackdrop) reviewModalBackdrop.classList.remove("visible");
  }

  if (closeReviewModalBtn) closeReviewModalBtn.addEventListener("click", closeReviewModal);
  if (reviewModalBackdrop) reviewModalBackdrop.addEventListener("click", closeReviewModal);

  if (confirmSendWhatsAppBtn) {
    confirmSendWhatsAppBtn.addEventListener("click", () => {
      const url = window.cart.getWhatsAppUrl();
      // Open official WhatsApp wa.me link
      window.open(url, "_blank", "noopener,noreferrer");
      closeReviewModal();
      closeCart();

      // Show friendly confirmation follow-up
      showConfirmationSuccessNotice();
    });
  }

  function showConfirmationSuccessNotice() {
    const noticeModal = document.getElementById("orderSentNoticeModal");
    if (noticeModal) {
      noticeModal.classList.add("open");
    } else {
      showToast("WhatsApp opened! Please tap 'Send' in WhatsApp. The cafe will confirm shortly.", "success", 7000);
    }
  }

  const closeNoticeModalBtn = document.getElementById("closeNoticeModalBtn");
  if (closeNoticeModalBtn) {
    closeNoticeModalBtn.addEventListener("click", () => {
      const noticeModal = document.getElementById("orderSentNoticeModal");
      if (noticeModal) noticeModal.classList.remove("open");
    });
  }

  // ==========================================
  // MOBILE NAVIGATION & VIDEO CONTROLS
  // ==========================================

  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileNavDrawer = document.getElementById("mobileNavDrawer");
  const mobileNavClose = document.getElementById("mobileNavClose");

  if (mobileNavToggle && mobileNavDrawer) {
    mobileNavToggle.addEventListener("click", () => {
      mobileNavDrawer.classList.toggle("open");
    });
  }

  if (mobileNavClose && mobileNavDrawer) {
    mobileNavClose.addEventListener("click", () => {
      mobileNavDrawer.classList.remove("open");
    });
  }

  // Video Sound Toggle
  const videoMuteBtn = document.getElementById("videoMuteBtn");
  const heroVideo = document.getElementById("heroVideo");
  if (videoMuteBtn && heroVideo) {
    videoMuteBtn.addEventListener("click", () => {
      heroVideo.muted = !heroVideo.muted;
      videoMuteBtn.innerHTML = heroVideo.muted ? "🔇 Unmute Video" : "🔊 Sound On";
      videoMuteBtn.classList.toggle("unmuted", !heroVideo.muted);
    });
  }

  // ==========================================
  // TOAST NOTIFICATION SYSTEM
  // ==========================================

  function showToast(message, type = "info", duration = 3000) {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "✨";
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  window.showToast = showToast;

  // Initialize UI
  renderCategories();
  renderMenu();
  renderCart();
});

