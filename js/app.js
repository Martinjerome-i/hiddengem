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
  let isBookOpen = false;
  let currentSpread = 0;
  let isAnimating = false;

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
  // CATEGORY SELECTOR & FILTERING
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
        const newCat = btn.getAttribute("data-category-id");
        if (newCat !== activeCategory) {
          activeCategory = newCat;
          // Reset pagination safely whenever category changes
          currentSpread = 0;
          
          categoryNav.querySelectorAll(".category-pill").forEach(b => {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          
          renderMenuBook();
        }
      });
    });
  }

  function getFilteredProducts() {
    let items = window.MENU_PRODUCTS || [];

    // Filter by Category
    if (activeCategory !== "all") {
      items = items.filter(p => p.categoryId === activeCategory);
    }

    // Filter by Search Query (if search input exists and is used)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        (p.tastingNotes && p.tastingNotes.toLowerCase().includes(q))
      );
    }

    // Filter by Dietary/Special Tag (if tag exists)
    if (activeFilterTag === "bestseller") {
      items = items.filter(p => p.isBestseller);
    } else if (activeFilterTag === "featured") {
      items = items.filter(p => p.isFeatured);
    }

    return items;
  }

  // ==========================================
  // INTERACTIVE PREMIUM MENU BOOK ENGINE
  // ==========================================

  function getProductAccentTheme(product) {
    const id = product.id.toLowerCase();
    if (id.includes("strawberry")) return "strawberry";
    if (id.includes("mango")) return "mango";
    if (id.includes("pistachio")) return "pistachio";
    if (id.includes("watermelon") || id.includes("juice")) return "watermelon";
    if (id.includes("brownie")) return "brownie";
    if (id.includes("gelato") || id.includes("icecream")) return "gelato";
    return "terracotta";
  }

  function renderMenuBook() {
    if (!menuContainer) return;
    const items = getFilteredProducts();
    const categoryObj = (window.MENU_CATEGORIES || []).find(c => c.id === activeCategory) || { name: "All Items", icon: "✨" };

    // --- STATE 1: CLOSED MENU BOOK (Cover View) ---
    if (!isBookOpen) {
      menuContainer.innerHTML = `
        <div class="menu-book-container book-closed-mode" id="menuBookContainer">
          <div 
            class="menu-book-cover" 
            id="menuBookCover" 
            role="button" 
            tabindex="0" 
            aria-label="Open Hidden Gem Cafe Menu Book"
          >
            <!-- Decorative outer spine edge -->
            <div class="cover-spine-edge" aria-hidden="true"></div>
            
            <!-- Embossed gold filigree frame -->
            <div class="cover-inner-frame">
              <div class="cover-header-crest">
                <span class="crest-ornament">❦</span>
                <span class="crest-text">POLLACHI · TAMIL NADU · EST. 2026</span>
                <span class="crest-ornament">❦</span>
              </div>

              <div class="cover-brand-center">
                <div class="cover-seal-icon">☕</div>
                <h3 class="cover-brand-heading">HIDDEN GEM</h3>
                <div class="cover-brand-script">Artisanal Cafe &amp; Bakery</div>
              </div>

              <div class="cover-divider-flourish">
                <span class="flourish-line"></span>
                <span class="flourish-gem">◆</span>
                <span class="flourish-line"></span>
              </div>

              <div class="cover-category-badge">
                <span class="badge-icon">${categoryObj.icon}</span>
                <span class="badge-title">${categoryObj.name}</span>
                <span class="badge-count">(${items.length} ${items.length === 1 ? 'Creation' : 'Creations'})</span>
              </div>

              <p class="cover-description">
                Handcrafted Shakes · Cold-Pressed Juices · Italian Gelato · Warm Fudge Brownies
              </p>

              <div class="cover-action-prompt">
                <div class="btn-open-book-cta">
                  <span class="cta-book-icon">📖</span>
                  <span class="cta-text">Open Menu</span>
                  <span class="cta-arrow">→</span>
                </div>
                <div class="cover-hint-sub">Tap or click the cover to open</div>
              </div>
            </div>

            <!-- Silk ribbon bookmark accent -->
            <div class="cover-ribbon-bookmark" aria-hidden="true"></div>
          </div>
        </div>
      `;

      bindCoverEvents();
      return;
    }

    // --- STATE 2: OPEN MENU BOOK (Desktop 2-Page Spread vs Mobile Single-Page) ---
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const itemsPerSpread = isMobile ? 2 : 4;
    const totalSpreads = Math.max(1, Math.ceil(items.length / itemsPerSpread));
    
    // Bounds check
    if (currentSpread >= totalSpreads) currentSpread = totalSpreads - 1;
    if (currentSpread < 0) currentSpread = 0;

    const startIndex = currentSpread * itemsPerSpread;
    const isFirstSpread = currentSpread === 0;
    const isLastSpread = currentSpread === totalSpreads - 1;

    if (isMobile) {
      // --- MOBILE SINGLE-PAGE MENU BOOK LAYOUT ---
      const pageItems = items.slice(startIndex, startIndex + 2);

      menuContainer.innerHTML = `
        <div class="menu-book-container book-opened-mode book-mobile-mode" id="menuBookContainer">
          <div class="menu-book-spread mobile-single-page" id="menuBookSpread">
            <!-- Discreet Top-Right Quick Close Tab -->
            <button type="button" class="book-top-close-tab" id="bookQuickClose" aria-label="Close Menu Book" title="Close Menu Book">
              <span class="tab-close-icon">✕</span>
              <span class="tab-close-text">Close</span>
            </button>

            <!-- SINGLE MOBILE BOOK PAGE -->
            <article class="menu-page page-single" aria-label="Menu Page">
              <div class="page-inner-content">
                <header class="book-page-header">
                  <span class="header-brand">HIDDEN GEM CAFE</span>
                  <span class="header-ornament">· ☕ ·</span>
                  <span class="header-location">${categoryObj.name.toUpperCase()}</span>
                </header>

                <div class="page-editorial-list mobile-editorial-list">
                  ${pageItems.map((p) => renderBookProductItem(p, true, true)).join('')}
                  ${pageItems.length < 2 ? renderEditorialVignette(
                    "The Artisan's Promise", 
                    "Slow-churned, cold-pressed, and freshly baked daily in Pollachi. 100% vegetarian, pure farm fruit, and zero artificial syrups."
                  ) : ''}
                </div>

                <!-- Bottom Integrated Navigation -->
                <footer class="book-page-footer mobile-page-footer">
                  ${!isFirstSpread ? `
                    <button type="button" class="book-corner-nav corner-nav-prev" id="bookCornerPrev" aria-label="Previous Page">
                      <span class="corner-chevron" aria-hidden="true">‹</span>
                      <span class="corner-label">Previous</span>
                    </button>
                  ` : `<div class="corner-spacer" aria-hidden="true"></div>`}

                  ${!isLastSpread ? `
                    <button type="button" class="book-corner-nav corner-nav-next" id="bookCornerNext" aria-label="Next Page">
                      <span class="corner-label">Next</span>
                      <span class="corner-chevron" aria-hidden="true">›</span>
                    </button>
                  ` : `
                    <button type="button" class="book-corner-nav corner-nav-close" id="bookCornerClose" aria-label="Close Menu Book">
                      <span class="corner-close-icon" aria-hidden="true">✕</span>
                      <span class="corner-label">Close Menu</span>
                    </button>
                  `}
                </footer>
              </div>
            </article>
          </div>
        </div>
      `;

      bindOpenBookEvents(totalSpreads);
      return;
    }

    // --- DESKTOP & TABLET TWO-PAGE PHYSICAL SPREAD ---
    const leftItems = items.slice(startIndex, startIndex + 2);
    const rightItems = items.slice(startIndex + 2, startIndex + 4);

    menuContainer.innerHTML = `
      <div class="menu-book-container book-opened-mode" id="menuBookContainer">
        <!-- Open Two-Page Physical Spread -->
        <div class="menu-book-spread" id="menuBookSpread">
          <!-- Discreet Top-Right Quick Close Tab -->
          <button type="button" class="book-top-close-tab" id="bookQuickClose" aria-label="Close Menu Book" title="Close Menu Book">
            <span class="tab-close-icon">✕</span>
            <span class="tab-close-text">Close</span>
          </button>

          <!-- LEFT PAGE -->
          <article class="menu-page page-left" aria-label="Menu Left Page">
            <div class="page-inner-content">
              <header class="book-page-header">
                <span class="header-brand">HIDDEN GEM CAFE</span>
                <span class="header-ornament">· ☕ ·</span>
                <span class="header-location">POLLACHI</span>
              </header>

              <div class="page-editorial-list">
                ${leftItems.map((p, idx) => renderBookProductItem(p, idx % 2 === 0, false)).join('')}
                ${leftItems.length === 0 ? renderEditorialVignette(
                  "Handcrafted to Order",
                  "Every creation is prepared fresh with farm-direct ingredients and artisan passion."
                ) : ''}
              </div>

              <!-- Bottom-Left Integrated Navigation -->
              <footer class="book-page-footer page-footer-left">
                ${!isFirstSpread ? `
                  <button type="button" class="book-corner-nav corner-nav-prev" id="bookCornerPrev" aria-label="Previous Page">
                    <span class="corner-chevron" aria-hidden="true">‹</span>
                    <span class="corner-label">Previous</span>
                  </button>
                ` : `<div class="corner-spacer" aria-hidden="true"></div>`}
              </footer>
            </div>
          </article>

          <!-- CENTRAL 3D BOOK SPINE -->
          <div class="menu-book-spine" aria-hidden="true">
            <div class="spine-depth-gradient"></div>
            <div class="spine-binding-stitch"></div>
          </div>

          <!-- RIGHT PAGE -->
          <article class="menu-page page-right" aria-label="Menu Right Page">
            <div class="page-inner-content">
              <header class="book-page-header">
                <span class="header-brand">${categoryObj.name.toUpperCase()}</span>
                <span class="header-ornament">· ✨ ·</span>
                <span class="header-location">FRESH CRAFT</span>
              </header>

              <div class="page-editorial-list">
                ${rightItems.map((p, idx) => renderBookProductItem(p, idx % 2 === 0, false)).join('')}
                ${rightItems.length < 2 ? renderEditorialVignette(
                  "The Artisan's Promise", 
                  "Slow-churned, cold-pressed, and freshly baked daily in Pollachi. 100% vegetarian, pure farm fruit, and zero artificial syrups."
                ) : ''}
              </div>

              <!-- Bottom-Right Integrated Navigation / Close Action -->
              <footer class="book-page-footer page-footer-right">
                ${!isLastSpread ? `
                  <button type="button" class="book-corner-nav corner-nav-next" id="bookCornerNext" aria-label="Next Page">
                    <span class="corner-label">Next</span>
                    <span class="corner-chevron" aria-hidden="true">›</span>
                  </button>
                ` : `
                  <button type="button" class="book-corner-nav corner-nav-close" id="bookCornerClose" aria-label="Close Menu Book">
                    <span class="corner-close-icon" aria-hidden="true">✕</span>
                    <span class="corner-label">Close Menu</span>
                  </button>
                `}
              </footer>
            </div>
          </article>
        </div>
      </div>
    `;

    bindOpenBookEvents(totalSpreads);
  }

  // Render individual product in colorful editorial cafe style with alternating zigzag & tasting pills
  function renderBookProductItem(product, isImageLeft, isMobileView = false) {
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const initialPrice = product.basePrice + (defaultVariant ? defaultVariant.priceDelta : 0);
    const hasVariants = product.variants && product.variants.length > 1;
    const accentTheme = getProductAccentTheme(product);

    // Parse tasting notes into elegant pills
    const notes = product.tastingNotes ? product.tastingNotes.split('·').map(s => s.trim()).filter(Boolean) : [];

    return `
      <div class="editorial-product-item ${isImageLeft ? 'item-zigzag-left' : 'item-zigzag-right'} accent-${accentTheme} ${isMobileView ? 'item-mobile-row' : ''}" id="item-${product.id}" data-product-id="${product.id}">
        <!-- Image Box -->
        <div class="editorial-image-wrap">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="editorial-image" 
            loading="lazy" 
            onerror="this.src='assets/products/strawberry-cream-shake.jpg'"
          />
          <div class="editorial-veg-mark" title="100% Vegetarian">
            <span class="veg-dot"></span>
          </div>
          ${product.isBestseller ? `
            <div class="bestseller-stamp-badge" title="Bestseller">
              <span>BEST</span>
              <span>SELLER</span>
            </div>
          ` : ''}
        </div>

        <!-- Content Box -->
        <div class="editorial-content-wrap">
          <div class="editorial-title-row">
            <h4 class="editorial-title">${product.name}</h4>
            <span class="editorial-dots-leader" aria-hidden="true"></span>
            <div class="editorial-price-wrap">
              <span class="currency">₹</span>
              <span class="product-price" id="price-${product.id}">${initialPrice}</span>
            </div>
          </div>

          ${product.tagline ? `<div class="editorial-tagline">${product.tagline}</div>` : ''}
          <p class="editorial-desc">${product.description}</p>
          
          ${notes.length > 0 ? `
            <div class="editorial-tasting-pills">
              ${notes.slice(0, 2).map(n => `
                <span class="tasting-pill-tag">
                  <span class="pill-sparkle">✦</span>
                  <span class="pill-text">${n}</span>
                </span>
              `).join('')}
            </div>
          ` : ''}

          <div class="editorial-actions-bar">
            ${hasVariants ? `
              <div class="editorial-variant-wrap">
                <select class="editorial-variant-select" data-variant-select="${product.id}" aria-label="Select variant for ${product.name}">
                  ${product.variants.map((v, i) => `
                    <option value="${v.id}" data-delta="${v.priceDelta}" ${i === 0 ? 'selected' : ''}>
                      ${v.name} ${v.priceDelta > 0 ? `(+₹${v.priceDelta})` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <button 
              type="button" 
              class="btn-editorial-add-cart" 
              data-add-product="${product.id}" 
              aria-label="Add ${product.name} to cart"
            >
              <span class="cart-btn-icon">🛒</span>
              <span class="cart-btn-text">Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Editorial Callout Vignette for balanced book layout
  function renderEditorialVignette(title, text) {
    return `
      <div class="editorial-craft-vignette">
        <div class="craft-vignette-emblem">❦</div>
        <h5 class="craft-vignette-title">${title}</h5>
        <p class="craft-vignette-desc">${text}</p>
        <div class="craft-vignette-badge">
          <span>★ 100% PURE &amp; HONEST INGREDIENTS ★</span>
        </div>
      </div>
    `;
  }

  // Bind Cover Click Events
  function bindCoverEvents() {
    const cover = document.getElementById("menuBookCover");
    if (!cover) return;

    const openAction = () => {
      if (isAnimating) return;
      isAnimating = true;
      cover.classList.add("is-opening");
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 400;
      setTimeout(() => {
        isBookOpen = true;
        currentSpread = 0;
        renderMenuBook();
        isAnimating = false;
      }, delay);
    };

    cover.addEventListener("click", openAction);
    cover.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAction();
      }
    });
  }

  // Touch Swipe Gesture Listener
  function bindTouchSwipe(container, onSwipeLeft, onSwipeRight) {
    if (!container) return;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    container.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    container.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const elapsedTime = Date.now() - touchStartTime;

        // Check deliberate horizontal swipe: threshold > 45px, mostly horizontal, duration < 700ms
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > 1.4 * Math.abs(deltaY) && elapsedTime < 700) {
          if (deltaX < 0) {
            onSwipeLeft();
          } else {
            onSwipeRight();
          }
        }
      }
    }, { passive: true });
  }

  // Bind Open Book Spread Events
  function bindOpenBookEvents(totalSpreads) {
    const spreadElem = document.getElementById("menuBookSpread");

    // Page-Turn Navigation Functions with 3D animation
    function turnNext() {
      if (isAnimating) return;
      if (currentSpread < totalSpreads - 1) {
        isAnimating = true;
        if (spreadElem) spreadElem.classList.add("turning-next");
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 450;
        setTimeout(() => {
          currentSpread++;
          renderMenuBook();
          isAnimating = false;
        }, delay);
      }
    }

    function turnPrev() {
      if (isAnimating) return;
      if (currentSpread > 0) {
        isAnimating = true;
        if (spreadElem) spreadElem.classList.add("turning-prev");
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 450;
        setTimeout(() => {
          currentSpread--;
          renderMenuBook();
          isAnimating = false;
        }, delay);
      }
    }

    function closeBook() {
      if (isAnimating) return;
      isAnimating = true;
      if (spreadElem) spreadElem.classList.add("is-closing");
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 380;
      setTimeout(() => {
        isBookOpen = false;
        renderMenuBook();
        isAnimating = false;
      }, delay);
    }

    // 1. Previous Page (Bottom-Left Corner)
    const prevBtn = document.getElementById("bookCornerPrev");
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        turnPrev();
      });
    }

    // 2. Next Page (Bottom-Right Corner)
    const nextBtn = document.getElementById("bookCornerNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        turnNext();
      });
    }

    // 3. Close Book (Bottom-Right Corner on Final Spread)
    const cornerCloseBtn = document.getElementById("bookCornerClose");
    if (cornerCloseBtn) {
      cornerCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeBook();
      });
    }

    // 4. Quick Close Tab (Top-Right of open book)
    const quickCloseBtn = document.getElementById("bookQuickClose");
    if (quickCloseBtn) {
      quickCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeBook();
      });
    }

    // 5. Touch Swipe Support
    if (spreadElem) {
      bindTouchSwipe(spreadElem, () => {
        turnNext();
      }, () => {
        turnPrev();
      });
    }

    // 6. Variant Dropdown Price Updater
    document.querySelectorAll("[data-variant-select]").forEach(select => {
      select.addEventListener("change", () => {
        const prodId = select.getAttribute("data-variant-select");
        const selectedOpt = select.options[select.selectedIndex];
        const delta = parseInt(selectedOpt.getAttribute("data-delta"), 10) || 0;
        const product = (window.MENU_PRODUCTS || []).find(p => p.id === prodId);
        if (product) {
          const priceElem = document.getElementById(`price-${prodId}`);
          if (priceElem) {
            priceElem.textContent = product.basePrice + delta;
          }
        }
      });
    });

    // 7. Add to Cart Handler
    document.querySelectorAll("[data-add-product]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const prodId = btn.getAttribute("data-add-product");
        let variantId = null;
        
        const variantSelect = document.querySelector(`[data-variant-select="${prodId}"]`);
        if (variantSelect) {
          variantId = variantSelect.value;
        }

        const success = window.cart.addItem(prodId, variantId, 1);
        if (success) {
          btn.classList.add("added-success");
          const originalHtml = btn.innerHTML;
          btn.innerHTML = `<span class="cart-btn-icon">✓</span> <span class="cart-btn-text">Added!</span>`;
          setTimeout(() => {
            btn.classList.remove("added-success");
            btn.innerHTML = originalHtml;
          }, 1200);

          const product = (window.MENU_PRODUCTS || []).find(p => p.id === prodId);
          showToast(`Added 1× ${product ? product.name : "item"} to cart!`, "success");
        }
      });
    });
  }

  // Responsive Book Resize Listener (Smooth layout switch between Desktop 2-page & Mobile single-page)
  let wasMobileView = window.matchMedia("(max-width: 640px)").matches;
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const isNowMobile = window.matchMedia("(max-width: 640px)").matches;
      if (isNowMobile !== wasMobileView) {
        if (isNowMobile) {
          currentSpread = currentSpread * 2;
        } else {
          currentSpread = Math.floor(currentSpread / 2);
        }
        wasMobileView = isNowMobile;
        if (isBookOpen) {
          renderMenuBook();
        }
      }
    }, 120);
  });

  // Preserve renderMenu alias for any external or fallback calls
  const renderMenu = renderMenuBook;

  // Search Input Handler (Preserved in code if search input is ever rendered)
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery.trim() ? "block" : "none";
      }
      renderMenuBook();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchQuery = "";
        searchClearBtn.style.display = "none";
        renderMenuBook();
      }
    });
  }

  // Filter tag handlers (Preserved in code)
  if (filterTags && filterTags.length > 0) {
    filterTags.forEach(tagBtn => {
      tagBtn.addEventListener("click", () => {
        filterTags.forEach(t => t.classList.remove("active"));
        tagBtn.classList.add("active");
        activeFilterTag = tagBtn.getAttribute("data-filter-tag");
        renderMenuBook();
      });
    });
  }

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

