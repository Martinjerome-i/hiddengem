/**
 * HIDDEN GEM CAFE - High-Performance Scroll-Controlled WebP Image Sequence Engine
 *
 * Designed for buttery-smooth scrubbing of 168 lossless Full HD frames (1920x1080, 16:9).
 *
 * Core Features:
 * - 168 Lossless WebP frames with zero-padded 4-digit naming (frame_0001.webp .. frame_0168.webp)
 * - requestAnimationFrame scroll-batching & passive listeners
 * - Normalized scroll progress: progress = clamp((scrollY - sectionStart) / scrollableDistance, 0, 1)
 * - Frame mapping: targetFrame = Math.round(progress * (totalFrames - 1))
 * - Proportional full-bleed cover strategy preserving 16:9 composition without stretching or clipping typography
 * - Dynamic flavour-matched background color interpolation across Strawberry, Pistachio, Mango, & Mocha
 * - Bounded sliding-window cache (28-30 frames on desktop, 16 on mobile) preventing browser tab memory bloat
 * - Priority-based concurrent loading queue with immediate neighborhood & directional lookahead prefetching
 * - Nearest-decoded frame fallback so fast scrubs never flash blank or stutter
 * - Retina/High-DPI support capped at DPR 2.0 (desktop) / 1.5 (mobile)
 * - Optional developer diagnostic HUD & window.__SCROLL_PERF__ benchmarking tool (?debug=1)
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 168;
  const FRAME_WIDTH = 1920;
  const FRAME_HEIGHT = 1080;
  const BRAND_BG = '#C7837C'; // Initial Strawberry background matching frame_0001.webp
  const MAX_CONCURRENT_REQUESTS = 6;

  class ScrollSequenceController {
    constructor() {
      this.totalFrames = TOTAL_FRAMES;
      
      // Responsive bounded memory cache (~320 MB decoded on desktop, ~130 MB on mobile)
      // Q85 frames are ~115 KB on disk but still ~8 MB each when decoded in GPU memory
      const isMobile = (typeof window !== 'undefined' && window.innerWidth <= 768);
      this.maxCacheSize = isMobile ? 16 : 40;
      this.lastScrollTime = 0; // tracks last scroll event for idle preloader gating
      
      // Cache: Map<frameIndex, { drawable: Image|ImageBitmap, lastAccessed: number, persistent: boolean }>
      this.cache = new Map();
      this.status = new Array(TOTAL_FRAMES).fill('idle'); // 'idle' | 'queued' | 'loading' | 'decoded' | 'error'
      
      // Loading queue: array of { index: number, priority: number, isPersistent: boolean }
      this.loadQueue = [];
      this.activeRequests = 0;

      // DOM Elements
      this.section = null;
      this.sticky = null;
      this.canvas = null;
      this.ctx = null;
      this.progressFill = null;
      this.scrollHint = null;
      this.header = null;

      // State & Cached Geometry (prevents layout thrashing on scroll)
      this.currentFrameIndex = 0;
      this.targetFrameIndex = 0;
      this.lastRenderedTargetIndex = -1;
      this.lastRenderedActualIndex = -1;
      this.lastRenderedIndex = -1;
      this.lastScrollY = 0;
      this.scrollDirection = 1; // 1 = down, -1 = up
      this.ticking = false;
      this.isInitialized = false;
      this.inHero = true;
      this.isHeaderVisible = false;
      this.heroObserver = null;
      this.hintFaded = false;
      this.lastProgressPct = '';
      this.lastBgColor = '';
      this.scrollableDist = 0;
      this.sectionOffsetTop = 0;

      // Performance & Diagnostics
      this.debugEnabled = false;
      this.hudElement = null;
      this.renderTimes = [];
      this.fpsTimestamps = [];
      this.currentFps = 60;
      this.lastRenderTimeMs = 0;
      this.droppedFrames = 0;

      // Path resolver
      this.basePath = this.detectBasePath();

      this.init();
    }

    detectBasePath() {
      // Use Q85 lossy WebP frames (~115 KB each vs ~984 KB lossless) for 8.5x faster load + same visual quality at viewport size
      // If page is inside hiddengemcafe-scroll/, use relative path from subdirectory
      const path = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
      if (path.includes('hiddengemcafe-scroll')) {
        return '../hidden-gem-webp-q85/';
      }
      return 'hidden-gem-webp-q85/';
    }

    getFrameUrl(index) {
      const num = String(index + 1).padStart(4, '0');
      return `${this.basePath}frame_${num}.webp`;
    }

    init() {
      // Check debug parameter in URL or localStorage or global flag
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugEnabled = urlParams.has('debug') || 
                            window.localStorage.getItem('gem_scroll_debug') === '1' || 
                            window.__SCROLL_PERF_ENABLED__ === true;
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.section = document.getElementById('scrollHeroSection');
      this.sticky = document.getElementById('scrollHeroSticky') || (this.section ? this.section.querySelector('.scroll-hero-sticky') : null);
      this.canvas = document.getElementById('scrollCanvas');
      this.progressFill = document.getElementById('scrollEdgeFill');
      this.scrollHint = document.getElementById('scrollSubtleHint');
      this.header = document.getElementById('siteHeader');

      if (!this.canvas || !this.section) {
        console.warn('ScrollSequenceController: Canvas or section container not found in DOM.');
        return;
      }

      // Optimize 2D context options for smooth scrubbing
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
      });

      // Immediate resize & DPR configuration
      this.handleResize();

      // Step 1: Preload anchor Frame 0 (index 0) with persistent retention
      this.enqueueFrame(0, 100, true);

      // Step 2: Preload initial starting frames [1..8] for immediate smooth forward scrubbing
      for (let i = 1; i <= 8; i++) {
        this.enqueueFrame(i, 95 - i, false);
      }

      // Step 4: Bind events & IntersectionObserver for hero boundary detection
      this.bindEvents();
      this.setupHeroBoundaryObserver();

      // Step 5: Render initial Frame 0 once ready
      this.waitForFrame(0).then((img) => {
        if (img && this.currentFrameIndex === 0) {
          this.renderFrame(0, true);
        }
      });

      // Step 6: Initial scroll measurement
      this.updateScrollPosition();

      // Step 7: Initialize Dev Diagnostic HUD if enabled
      if (this.debugEnabled) {
        this.initDebugHUD();
      }

      // Expose globally for diagnostics and debugging
      this.exposeDiagnostics();

      this.isInitialized = true;
    }

    /* =========================================================================
       PRIORITIZED LOADING QUEUE & LRU CACHE MANAGEMENT
       ========================================================================= */

    enqueueFrame(index, priority = 10, isPersistent = false) {
      if (index < 0 || index >= this.totalFrames) return;

      // If already decoded in cache, touch access timestamp
      if (this.cache.has(index)) {
        const item = this.cache.get(index);
        item.lastAccessed = performance.now();
        if (isPersistent) item.persistent = true;
        return;
      }

      // If already loading, bump priority if new priority is higher
      const existingQueueItem = this.loadQueue.find(q => q.index === index);
      if (existingQueueItem) {
        if (priority > existingQueueItem.priority) {
          existingQueueItem.priority = priority;
          this.sortQueue();
        }
        return;
      }

      if (this.status[index] === 'loading') return;

      // Push to queue
      this.status[index] = 'queued';
      this.loadQueue.push({ index, priority, isPersistent });
      this.sortQueue();
      this.processQueue();
    }

    sortQueue() {
      // Sort highest priority first
      this.loadQueue.sort((a, b) => b.priority - a.priority);
    }

    processQueue() {
      while (this.activeRequests < MAX_CONCURRENT_REQUESTS && this.loadQueue.length > 0) {
        const next = this.loadQueue.shift();
        this.loadFrame(next.index, next.isPersistent);
      }
    }

    loadFrame(index, isPersistent = false) {
      this.activeRequests++;
      this.status[index] = 'loading';

      const img = new Image();
      img.src = this.getFrameUrl(index);

      const onDecoded = async () => {
        let drawable = img;
        if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
          try {
            drawable = await createImageBitmap(img);
          } catch (_) {
            drawable = img;
          }
        }

        this.activeRequests--;
        this.status[index] = 'decoded';

        // Add to cache
        this.addToCache(index, drawable, isPersistent);

        // If user is currently at this target frame, or if this frame is closer
        // to current target than what is currently rendered on canvas, update immediately!
        const currentTarget = this.currentFrameIndex;
        if (currentTarget === index) {
          this.renderFrame(currentTarget, true);
        } else if (this.lastRenderedActualIndex !== currentTarget && this.lastRenderedActualIndex >= 0) {
          const currentDistance = Math.abs(this.lastRenderedActualIndex - currentTarget);
          const newDistance = Math.abs(index - currentTarget);
          if (newDistance < currentDistance) {
            this.renderFrame(currentTarget, true);
          }
        }

        // Process next item in queue
        this.processQueue();

        // Update HUD
        if (this.debugEnabled) this.updateDebugHUD();
      };

      const onError = () => {
        this.activeRequests--;
        this.status[index] = 'error';
        this.processQueue();
        if (this.debugEnabled) this.updateDebugHUD();
      };

      if ('decode' in img) {
        img.decode().then(onDecoded).catch(() => {
          // Fallback if decode promise rejects
          if (img.complete && img.naturalWidth > 0) {
            onDecoded();
          } else {
            img.onload = onDecoded;
            img.onerror = onError;
          }
        });
      } else {
        img.onload = onDecoded;
        img.onerror = onError;
      }
    }

    addToCache(index, drawable, isPersistent = false) {
      // Frame 0 and Frame 167 are always persistent anchors
      const persistent = isPersistent || index === 0 || index === (this.totalFrames - 1);

      this.cache.set(index, {
        drawable,
        lastAccessed: performance.now(),
        persistent
      });

      // Memory management: enforce bounded cache size
      if (this.cache.size > this.maxCacheSize) {
        this.evictDistantFrames();
      }
    }

    evictDistantFrames() {
      // Do not evict persistent frames (0 and totalFrames - 1)
      const evictable = [];
      const curr = this.currentFrameIndex;

      for (const [idx, item] of this.cache.entries()) {
        if (!item.persistent) {
          const dist = Math.abs(idx - curr);
          evictable.push({ index: idx, dist, lastAccessed: item.lastAccessed, drawable: item.drawable });
        }
      }

      // Sort by distance from current frame descending (furthest frames evicted first),
      // then by oldest access time
      evictable.sort((a, b) => {
        if (b.dist !== a.dist) return b.dist - a.dist;
        return a.lastAccessed - b.lastAccessed;
      });

      const excessCount = this.cache.size - this.maxCacheSize;
      const toRemove = evictable.slice(0, Math.max(0, excessCount));

      for (const item of toRemove) {
        // Instantly free GPU memory if ImageBitmap, otherwise release src
        if (item.drawable && typeof item.drawable.close === 'function') {
          item.drawable.close();
        } else if (item.drawable) {
          item.drawable.onload = null;
          item.drawable.onerror = null;
          item.drawable.src = '';
        }
        this.cache.delete(item.index);
        this.status[item.index] = 'idle';
      }
    }

    waitForFrame(index) {
      if (this.cache.has(index)) {
        return Promise.resolve(this.cache.get(index).drawable);
      }
      return new Promise((resolve) => {
        const check = () => {
          if (this.cache.has(index)) {
            resolve(this.cache.get(index).drawable);
          } else if (this.status[index] === 'error') {
            resolve(null);
          } else {
            setTimeout(check, 25);
          }
        };
        this.enqueueFrame(index, 100);
        check();
      });
    }

    getBestAvailableFrame(targetIndex, direction = 1) {
      // 1. Direct hit in cache
      if (this.cache.has(targetIndex)) {
        const item = this.cache.get(targetIndex);
        item.lastAccessed = performance.now();
        return { drawable: item.drawable, actualIndex: targetIndex };
      }

      // 2. Search outward for closest decoded frame
      // When scrolling forward (direction >= 0), prefer prev (frames user already passed) over future frames.
      // When scrolling backward (direction < 0), prefer next over prev.
      for (let offset = 1; offset < this.totalFrames; offset++) {
        const first = direction >= 0 ? targetIndex - offset : targetIndex + offset;
        const second = direction >= 0 ? targetIndex + offset : targetIndex - offset;

        if (first >= 0 && first < this.totalFrames && this.cache.has(first)) {
          return { drawable: this.cache.get(first).drawable, actualIndex: first };
        }
        if (second >= 0 && second < this.totalFrames && this.cache.has(second)) {
          return { drawable: this.cache.get(second).drawable, actualIndex: second };
        }
      }

      // 3. Fallback to anchor Frame 0
      if (this.cache.has(0)) {
        return { drawable: this.cache.get(0).drawable, actualIndex: 0 };
      }

      return null;
    }

    prioritizeNeighborhood(centerIndex, direction = 1) {
      // 1. Prune distant pending requests so active scrubbing stays 100% responsive
      this.pruneQueue(centerIndex);

      // 2. High Priority: Immediate ±3 frames
      for (let i = Math.max(0, centerIndex - 3); i <= Math.min(this.totalFrames - 1, centerIndex + 3); i++) {
        if (!this.cache.has(i)) {
          this.enqueueFrame(i, 95 - Math.abs(i - centerIndex));
        }
      }

      // 3. Medium Priority: Directional window (lookahead in scrub direction)
      const lookahead = 14;
      if (direction > 0) {
        const start = centerIndex + 4;
        const end = Math.min(this.totalFrames - 1, centerIndex + lookahead);
        for (let i = start; i <= end; i++) {
          if (!this.cache.has(i)) {
            this.enqueueFrame(i, 65 - (i - centerIndex));
          }
        }
      } else {
        const start = centerIndex - 4;
        const end = Math.max(0, centerIndex - lookahead);
        for (let i = start; i >= end; i--) {
          if (!this.cache.has(i)) {
            this.enqueueFrame(i, 65 - (centerIndex - i));
          }
        }
      }

      // 4. Preload anchor Frame 167 (totalFrames - 1) persistently once approaching 70% progress
      if (centerIndex >= Math.round(this.totalFrames * 0.70) && !this.cache.has(this.totalFrames - 1)) {
        this.enqueueFrame(this.totalFrames - 1, 80, true);
      }
    }

    pruneQueue(centerIndex) {
      // Drop queued items that are now distant (>20 frames away)
      const maxDistance = 20;
      this.loadQueue = this.loadQueue.filter(item => {
        if (item.isPersistent || item.index === 0 || item.index === (this.totalFrames - 1)) return true;
        const dist = Math.abs(item.index - centerIndex);
        if (dist > maxDistance) {
          this.status[item.index] = 'idle';
          return false;
        }
        return true;
      });
    }

    /* =========================================================================
       SCROLL PROGRESS & CANVAS RENDERING
       ========================================================================= */

    bindEvents() {
      // Passive scroll listener for buttery 60/120Hz response
      window.addEventListener('scroll', () => this.onScroll(), { passive: true });

      // Resize & orientation changes
      window.addEventListener('resize', () => this.handleResize(), { passive: true });
      window.addEventListener('orientationchange', () => this.handleResize(), { passive: true });

      // Smooth scroll specifically for navigation anchor links (without polluting mouse wheel scroll)
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#' || !href) return;
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });

      // Idle background warming
      this.startIdlePreload();
    }

    startIdlePreload() {
      const preloadNext = () => {
        // Pause idle preloading if user is actively scrolling (within last 500ms)
        const now = performance.now();
        if (now - this.lastScrollTime < 500) {
          scheduleNext(600);
          return;
        }

        // Only preload when active queue is completely clear and requests are low
        if (this.loadQueue.length === 0 && this.activeRequests < 2) {
          const curr = this.currentFrameIndex;
          for (let d = 1; d <= 20; d++) {
            const ahead = curr + d;
            if (ahead < this.totalFrames && !this.cache.has(ahead) && this.status[ahead] === 'idle') {
              this.enqueueFrame(ahead, 10);
              break;
            }
          }
        }

        scheduleNext(250);
      };

      const scheduleNext = (delay = 250) => {
        setTimeout(preloadNext, Math.max(delay, 200));
      };

      // Defer initial idle preload until 1 second after page load
      setTimeout(() => scheduleNext(1000), 1000);
    }

    onScroll() {
      this.lastScrollTime = performance.now(); // track for idle preloader gating
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.updateScrollPosition();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }

    updateScrollPosition() {
      if (!this.section) return;

      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollableDist = this.scrollableDist || (this.section.offsetHeight - window.innerHeight);

      if (scrollableDist <= 0) return;

      // Distance scrolled into section using cached offset (zero reflows!)
      const scrolled = currentScrollY - (this.sectionOffsetTop || 0);

      // Normalized progress strictly clamped 0 to 1
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDist));

      // Direct, instantaneous target frame mapping (zero rubber-banding / lag!)
      const targetIndex = Math.min(this.totalFrames - 1, Math.max(0, Math.round(progress * (this.totalFrames - 1))));

      // Determine hero section ending boundary:
      // When the bottom of scrollHeroSection reaches the top of the viewport,
      // the hero animation is finished and the user enters the product listing.
      const heroBottom = (this.sectionOffsetTop || 0) + (this.sectionH || this.section.offsetHeight);
      // Reveal header right at hero ending boundary (40px lead-in for smooth docked transition)
      const isPastHero = currentScrollY >= (heroBottom - 40);
      this.setHeaderVisibility(isPastHero);

      // Detect scroll direction
      this.scrollDirection = currentScrollY >= this.lastScrollY ? 1 : -1;
      this.lastScrollY = currentScrollY;

      this.currentProgress = progress;
      this.currentFrameIndex = targetIndex;
      this.targetFrameIndex = targetIndex;

      // Update sleek edge progress indicator only when percentage value changes
      if (this.progressFill) {
        const pct = (progress * 100).toFixed(1);
        if (pct !== this.lastProgressPct) {
          this.progressFill.style.height = `${pct}%`;
          this.lastProgressPct = pct;
        }
      }

      // Smoothly fade out initial scroll hint once user scrolls (state-guarded)
      if (this.scrollHint) {
        if (progress > 0.012) {
          if (!this.hintFaded) {
            this.scrollHint.classList.add('faded');
            this.hintFaded = true;
          }
        } else {
          if (this.hintFaded) {
            this.scrollHint.classList.remove('faded');
            this.hintFaded = false;
          }
        }
      }

      // Prioritize neighborhood preloading around current scrub point
      this.prioritizeNeighborhood(targetIndex, this.scrollDirection);

      // Render target frame directly
      this.renderFrame(targetIndex);

      // Diagnostic HUD update
      if (this.debugEnabled) {
        this.updateDebugHUD();
      }
    }

    setupHeroBoundaryObserver() {
      if (!this.section || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

      this.heroObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          // If hero section has scrolled above the viewport (boundingClientRect.bottom <= 40),
          // user has reached the end of the hero section and entered the product listing.
          const isPastHero = !entry.isIntersecting && entry.boundingClientRect.bottom <= 40;
          this.setHeaderVisibility(isPastHero);
        }
      }, {
        threshold: 0,
        rootMargin: '0px 0px 0px 0px'
      });

      this.heroObserver.observe(this.section);
    }

    setHeaderVisibility(visible) {
      if (this.isHeaderVisible === visible) return;
      this.isHeaderVisible = visible;

      if (visible) {
        if (this.header) this.header.classList.add('header-visible');
        document.body.classList.remove('in-scroll-hero');
        this.inHero = false;
      } else {
        if (this.header) this.header.classList.remove('header-visible');
        document.body.classList.add('in-scroll-hero');
        this.inHero = true;
      }
    }

    getInterpolatedBgColor(frameIndex) {
      // Keyframe color stops sampled from the 4 drinks in sequence:
      // Strawberry Cream: ~#C7837C (199, 131, 124)
      // Pistachio Kiwi Frappe: ~#859B5C (133, 155, 92)
      // Mango Bliss: ~#C5B147 (197, 177, 71)
      // Dark Chocolate Mocha: ~#654524 (101, 69, 36)
      const stops = [
        { f: 0,   rgb: [199, 131, 124] },
        { f: 28,  rgb: [199, 130, 124] },
        { f: 42,  rgb: [133, 155, 92]  },
        { f: 70,  rgb: [133, 155, 92]  },
        { f: 84,  rgb: [197, 177, 71]  },
        { f: 130, rgb: [180, 150, 64]  },
        { f: 147, rgb: [101, 69, 36]   },
        { f: 167, rgb: [102, 69, 37]   }
      ];

      if (frameIndex <= stops[0].f) return `rgb(${stops[0].rgb.join(',')})`;
      if (frameIndex >= stops[stops.length - 1].f) return `rgb(${stops[stops.length - 1].rgb.join(',')})`;

      for (let i = 0; i < stops.length - 1; i++) {
        const s1 = stops[i];
        const s2 = stops[i + 1];
        if (frameIndex >= s1.f && frameIndex <= s2.f) {
          const ratio = (frameIndex - s1.f) / (s2.f - s1.f);
          const r = Math.round(s1.rgb[0] + (s2.rgb[0] - s1.rgb[0]) * ratio);
          const g = Math.round(s1.rgb[1] + (s2.rgb[1] - s1.rgb[1]) * ratio);
          const b = Math.round(s1.rgb[2] + (s2.rgb[2] - s1.rgb[2]) * ratio);
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      return 'rgb(199, 131, 124)';
    }

    renderFrame(frameIndex, forceRedraw = false) {
      if (!this.canvas || !this.ctx) return;

      const result = this.getBestAvailableFrame(frameIndex, this.scrollDirection);
      if (!result || !result.drawable) return;

      const { drawable, actualIndex } = result;

      // Guard: Skip redundant draw ONLY if the canvas is already displaying this exact frame
      if (actualIndex === this.lastRenderedActualIndex && !forceRedraw) {
        return;
      }

      const startTime = performance.now();

      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const iw = drawable.width || drawable.naturalWidth || FRAME_WIDTH;
      const ih = drawable.height || drawable.naturalHeight || FRAME_HEIGHT;

      // Full-bleed edge-to-edge COVER strategy:
      // Guarantees ZERO empty side gaps by scaling to fill the entire viewport width and height.
      const scale = Math.max(cw / iw, ch / ih);
      const dw = Math.round(iw * scale);
      const dh = Math.round(ih * scale);

      // Center horizontally: since dw >= cw, dx <= 0, guaranteeing edge-to-edge cover with zero side gaps
      const dx = Math.round((cw - dw) * 0.5);

      // Vertical positioning: when dh > ch, clamp top crop so the "HIDDEN" typography (at y=50px in 1080p source) is preserved
      const idealDy = Math.round((ch - dh) * 0.5);
      const maxTopCrop = -Math.round(42 * scale); // Leaves safe padding above 'HIDDEN'
      const dy = Math.max(ch - dh, Math.max(idealDy, maxTopCrop));

      // Interpolate background color to match drink palette across 168 frames:
      const bgColor = this.getInterpolatedBgColor(actualIndex);

      // Update container background only when it changes to prevent DOM style invalidation
      if (bgColor !== this.lastBgColor) {
        if (this.section) this.section.style.backgroundColor = bgColor;
        if (this.sticky) this.sticky.style.backgroundColor = bgColor;
        this.lastBgColor = bgColor;
      }

      // Render image centered and razor-sharp (covers entire canvas edge-to-edge without redundant fillRect clear)
      this.ctx.drawImage(drawable, dx, dy, dw, dh);
      this.lastRenderedActualIndex = actualIndex;
      this.lastRenderedTargetIndex = frameIndex;
      this.lastRenderedIndex = actualIndex;

      const renderDuration = performance.now() - startTime;
      this.recordPerformance(renderDuration);
    }

    handleResize() {
      if (!this.canvas) return;

      // Use window viewport dimensions directly to guarantee 100% full-screen coverage
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Cache section geometry for fast O(1) scroll calculations without reflows
      if (this.section) {
        this.sectionH = this.section.offsetHeight;
        this.sectionOffsetTop = this.section.offsetTop;
        this.scrollableDist = Math.max(1, this.sectionH - h);
      }

      // Mobile memory & fill-rate safety:
      // Cap DPR to 2.0 on desktop, 1.5 on mobile
      const isMobile = w <= 768;
      const maxDpr = isMobile ? 1.5 : 2.0;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }

      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = true;
        // 'high' = bicubic resampling — excellent on desktop; 'medium' saves GPU fill-rate on mobile
        this.ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';
      }

      this.renderFrame(this.currentFrameIndex, true);
    }



    /* =========================================================================
       PERFORMANCE MONITORING & DEVELOPMENT DIAGNOSTIC HUD
       ========================================================================= */

    recordPerformance(durationMs) {
      this.lastRenderTimeMs = durationMs;
      const now = performance.now();

      // FPS tracking via timestamps
      this.fpsTimestamps.push(now);
      while (this.fpsTimestamps.length > 0 && this.fpsTimestamps[0] < now - 1000) {
        this.fpsTimestamps.shift();
      }
      this.currentFps = this.fpsTimestamps.length;

      // Keep recent render times
      this.renderTimes.push(durationMs);
      if (this.renderTimes.length > 60) this.renderTimes.shift();
    }

    getEstimatedMemoryMB() {
      // 1920 x 1080 x 4 bytes per RGBA pixel = 8,294,400 bytes (~7.91 MB per decoded frame)
      const bytesPerFrame = FRAME_WIDTH * FRAME_HEIGHT * 4;
      const totalBytes = this.cache.size * bytesPerFrame;
      return (totalBytes / (1024 * 1024)).toFixed(1);
    }

    getDecodedCount() {
      return this.status.filter(s => s === 'decoded').length;
    }

    getMetrics() {
      return {
        fps: this.currentFps,
        renderTimeMs: Number(this.lastRenderTimeMs.toFixed(2)),
        currentFrame: this.currentFrameIndex + 1,
        targetFrame: this.targetFrameIndex + 1,
        totalFrames: this.totalFrames,
        progressPercent: Number(((this.currentProgress || 0) * 100).toFixed(1)),
        cachedFrames: this.cache.size,
        maxCacheFrames: this.maxCacheSize,
        decodedTotal: this.getDecodedCount(),
        estimatedMemoryMB: Number(this.getEstimatedMemoryMB()),
        activeRequests: this.activeRequests,
        queuedRequests: this.loadQueue.length,
        canvasResolution: `${this.canvas ? this.canvas.width : 0}x${this.canvas ? this.canvas.height : 0}`,
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.75).toFixed(2)
      };
    }

    initDebugHUD() {
      if (document.getElementById('scrollPerfHUD')) return;

      const hud = document.createElement('aside');
      hud.id = 'scrollPerfHUD';
      hud.className = 'scroll-perf-hud';
      hud.setAttribute('role', 'region');
      hud.setAttribute('aria-label', 'Scroll Sequence Performance HUD');
      hud.innerHTML = `
        <div class="hud-title">
          <span>⚡ Gem Scrub Diagnostics</span>
          <button type="button" id="hudCloseBtn" style="color: #FFB347; font-size: 13px; line-height: 1; padding: 2px;">✕</button>
        </div>
        <div class="hud-row">
          <span>FPS:</span>
          <span class="hud-val hud-fps-good" id="hudFps">-- FPS</span>
        </div>
        <div class="hud-row">
          <span>Render Latency:</span>
          <span class="hud-val" id="hudRenderTime">-- ms</span>
        </div>
        <div class="hud-row">
          <span>Frame:</span>
          <span class="hud-val" id="hudFrame">1 / ${this.totalFrames}</span>
        </div>
        <div class="hud-row">
          <span>Scroll Progress:</span>
          <span class="hud-val" id="hudProgress">0.0%</span>
        </div>
        <div class="hud-row">
          <span>Decoded / Total:</span>
          <span class="hud-val" id="hudDecoded">0 / ${this.totalFrames}</span>
        </div>
        <div class="hud-row">
          <span>In-Memory Cache:</span>
          <span class="hud-val" id="hudCache">0 / ${this.maxCacheSize} frames</span>
        </div>
        <div class="hud-row">
          <span>Est. RAM:</span>
          <span class="hud-val" id="hudMemory">0 MB</span>
        </div>
        <div class="hud-row">
          <span>Network Queue:</span>
          <span class="hud-val" id="hudQueue">0 active | 0 queued</span>
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.12); display: flex; gap: 6px;">
          <button type="button" id="hudBenchBtn" style="background: rgba(255,179,71,0.2); color: #FFDFBA; border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer;">Run Benchmark</button>
          <button type="button" id="hudClearBtn" style="background: rgba(255,255,255,0.1); color: #FFF; border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer;">Evict Cache</button>
        </div>
      `;

      document.body.appendChild(hud);
      this.hudElement = hud;

      // HUD Button Listeners
      const closeBtn = document.getElementById('hudCloseBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          hud.style.display = 'none';
        });
      }

      const benchBtn = document.getElementById('hudBenchBtn');
      if (benchBtn) {
        benchBtn.addEventListener('click', () => {
          this.runBenchmark();
        });
      }

      const clearBtn = document.getElementById('hudClearBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.evictDistantFrames();
          this.updateDebugHUD();
        });
      }
    }

    updateDebugHUD() {
      if (!this.hudElement || this.hudElement.style.display === 'none') return;

      const m = this.getMetrics();
      const elFps = document.getElementById('hudFps');
      const elRender = document.getElementById('hudRenderTime');
      const elFrame = document.getElementById('hudFrame');
      const elProgress = document.getElementById('hudProgress');
      const elDecoded = document.getElementById('hudDecoded');
      const elCache = document.getElementById('hudCache');
      const elMemory = document.getElementById('hudMemory');
      const elQueue = document.getElementById('hudQueue');

      if (elFps) {
        elFps.textContent = `${m.fps} FPS`;
        elFps.className = `hud-val ${m.fps >= 50 ? 'hud-fps-good' : m.fps >= 30 ? 'hud-fps-med' : 'hud-fps-bad'}`;
      }
      if (elRender) elRender.textContent = `${m.renderTimeMs} ms`;
      if (elFrame) elFrame.textContent = `${m.currentFrame} / ${m.totalFrames}`;
      if (elProgress) elProgress.textContent = `${m.progressPercent}%`;
      if (elDecoded) elDecoded.textContent = `${m.decodedTotal} / ${m.totalFrames}`;
      if (elCache) elCache.textContent = `${m.cachedFrames} / ${m.maxCacheFrames}`;
      if (elMemory) elMemory.textContent = `~${m.estimatedMemoryMB} MB`;
      if (elQueue) elQueue.textContent = `${m.activeRequests} active | ${m.queuedRequests} queued`;
    }

    exposeDiagnostics() {
      if (typeof window === 'undefined') return;

      window.__SCROLL_PERF__ = {
        controller: this,
        getMetrics: () => this.getMetrics(),
        toggleDebugHUD: (forceState) => {
          if (!this.hudElement) {
            this.initDebugHUD();
          }
          if (this.hudElement) {
            const show = typeof forceState === 'boolean' ? forceState : this.hudElement.style.display === 'none';
            this.hudElement.style.display = show ? 'block' : 'none';
            this.debugEnabled = show;
            if (show) this.updateDebugHUD();
          }
        },
        clearCache: () => {
          this.evictDistantFrames();
          return this.getMetrics();
        },
        benchmark: (durationMs = 3000) => this.runBenchmark(durationMs)
      };
    }

    runBenchmark(durationMs = 3000) {
      console.log('⚡ Starting Scroll Sequence Automated Scrub Benchmark...');
      const start = performance.now();
      let framesDrawn = 0;
      let totalRenderTime = 0;

      const runStep = () => {
        const elapsed = performance.now() - start;
        const p = Math.min(1, elapsed / durationMs);
        
        // Scrub 0 -> 1 -> 0
        const scrubProgress = p <= 0.5 ? p * 2 : (1 - p) * 2;
        const frameIdx = Math.min(this.totalFrames - 1, Math.max(0, Math.round(scrubProgress * (this.totalFrames - 1))));
        
        this.currentFrameIndex = frameIdx;
        const drawStart = performance.now();
        this.renderFrame(frameIdx, true);
        totalRenderTime += (performance.now() - drawStart);
        framesDrawn++;

        if (elapsed < durationMs) {
          window.requestAnimationFrame(runStep);
        } else {
          const totalTime = performance.now() - start;
          const avgFps = ((framesDrawn / totalTime) * 1000).toFixed(1);
          const avgDraw = (totalRenderTime / framesDrawn).toFixed(2);
          const summary = {
            durationMs: Math.round(totalTime),
            framesDrawn,
            averageFps: Number(avgFps),
            averageDrawTimeMs: Number(avgDraw),
            cachedFrames: this.cache.size,
            estimatedMemoryMB: Number(this.getEstimatedMemoryMB())
          };
          console.table(summary);
          alert(`Benchmark Complete!\nAverage FPS: ${avgFps}\nAverage Draw Time: ${avgDraw}ms\nFrames Rendered: ${framesDrawn}`);
        }
      };

      window.requestAnimationFrame(runStep);
    }
  }

  // Instantiate globally
  window.scrollSequence = new ScrollSequenceController();
})();
