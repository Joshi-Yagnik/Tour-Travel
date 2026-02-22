/* ============================================================
   WANDERLUST — Shared Navigation, Scroll & Auth-Aware Navbar
   ============================================================ */
(function () {
  'use strict';

  /* ── Auth-aware navbar ─────────────────────────────────── */
  function updateNavbarAuth() {
    if (!window.WL || !WL.Session) return;
    const loggedIn = WL.Session.isLoggedIn();
    const user = WL.Session.getUser();
    const actions = document.querySelector('.navbar__actions');
    const mobileAct = document.querySelector('.navbar__mobile-actions');

    // Set the user avatar and dashboard links
    if (loggedIn && user && actions) {
      const avatarUrl = WL.Session.getAvatarUrl(user.name, 36);
      const firstName = user.name.split(' ')[0];

      actions.innerHTML = `
        <a href="dashboard.html" class="nav-user-btn">
          <img src="${avatarUrl}" alt="${firstName}" class="nav-user-avatar" width="32" height="32">
          <span class="nav-user-name">${firstName}</span>
        </a>
        <button class="btn btn-outline btn-sm" onclick="WL.Session.logout()" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </button>`;

      if (mobileAct) {
        mobileAct.innerHTML = `
          <a href="dashboard.html" class="btn btn-primary">My Dashboard</a>
          <button class="btn btn-ghost" onclick="WL.Session.logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>`;
      }
    }
  }

  /* ── Navbar: scroll effect ─────────────────────────────── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    function onScroll() {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
        navbar.classList.remove('transparent');
      } else {
        if (navbar.dataset.transparent === 'true') {
          navbar.classList.add('transparent');
          navbar.classList.remove('scrolled');
        }
      }
    }
    if (navbar.dataset.transparent === 'true') {
      navbar.classList.add('transparent');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Run auth update after session.js has loaded
  updateNavbarAuth();

  /* ── Hamburger: mobile menu toggle ────────────────────── */
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.querySelector('.navbar__mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  /* ── Active nav link ────────────────────────────────────── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a, .navbar__mobile-menu a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === currentPage ||
      (currentPage === '' && href === 'index.html') ||
      (currentPage === 'index.html' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── Scroll to top button ──────────────────────────────── */
  const scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Wishlist button toggle ─────────────────────────────── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tour-card__wishlist');
    if (btn) {
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-heart');
        icon.classList.toggle('fas');
        icon.classList.toggle('far');
      }
    }
  });

  /* ── Counter animation ─────────────────────────────────── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counters = document.querySelectorAll('[data-target]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          animateCounter(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));
  }

  /* ── AOS-style scroll reveal ──────────────────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || '0';
          setTimeout(() => entry.target.classList.add('revealed'), parseInt(delay, 10));
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    });
  }

  /* ── Modal helper ─────────────────────────────────────── */
  window.openModal = function (id) {
    const overlay = document.getElementById(id);
    if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };
  window.closeModal = function (id) {
    const overlay = document.getElementById(id);
    if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  };
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
    });
  });

  /* ── Toast helper ─────────────────────────────────────── */
  window.showToast = function (msg, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(16px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

}());
