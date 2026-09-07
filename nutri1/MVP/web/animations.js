/**
 * NUTRI.N°1 - Ultra Modern Animations & Interactions
 * Investor-Grade UI Enhancements
 * 
 * This file adds sophisticated animations and interactions
 * to make the UI more dynamic and engaging for investors.
 */

(function() {
  'use strict';

  // =====================================================
  // WAIT FOR DOM TO BE READY
  // =====================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Initialize all animation modules
    initSmoothScroll();
    initIntersectionObserver();
    initHoverEffects();
    initClickEffects();
    initProgressBars();
    initChartAnimations();
    initToastSystem();
    initSidebarEnhancements();
    initCardParallax();
    initTypeWriter();
    initPulseEffects();
  }

  // =====================================================
  // SMOOTH SCROLL
  // =====================================================
  function initSmoothScroll() {
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  // =====================================================
  // INTERSECTION OBSERVER FOR ANIMATIONS
  // =====================================================
  function initIntersectionObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          
          // Add staggered delay based on data-animate-delay
          const delay = entry.target.dataset.animateDelay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          
          // Stop observing once animated
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all cards and animated elements
    const animatedElements = document.querySelectorAll(
      '.card, .hero, .condition-card, .ncd-card, .executive-center-card, ' +
      '.product-card, .core-card, .module-grid > div, .v52-card, .v53-card'
    );

    animatedElements.forEach((el, index) => {
      el.classList.add('animate-on-scroll');
      el.dataset.animateDelay = (index % 8) * 50;
      observer.observe(el);
    });
  }

  // =====================================================
  // HOVER EFFECTS
  // =====================================================
  function initHoverEffects() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn, .nav button, .store-tab, .step');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', createRipple);
    });

    // Add scale effect to cards
    const cards = document.querySelectorAll(
      '.card, .condition-card, .ncd-card, .executive-center-card, ' +
      '.product-card, .role-card'
    );
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.01)';
        card.style.boxShadow = '0 12px 32px rgba(8, 115, 63, 0.15)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });

    // Add glow effect to active elements
    const activeElements = document.querySelectorAll('.step.active, .nav button.on');
    activeElements.forEach(el => {
      el.style.boxShadow = '0 0 15px rgba(201, 238, 89, 0.3)';
    });
  }

  function createRipple(e) {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');

    const ripple = btn.getElementsByClassName('ripple')[0];
    if (ripple) {
      ripple.remove();
    }

    btn.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 600);
  }

  // Add ripple CSS
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `
    .ripple {
      position: absolute;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
      z-index: 1;
    }
    
    @keyframes ripple {
      to {
        transform: scale(2);
        opacity: 0;
      }
    }
    
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    
    .animate-on-scroll.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    /* Enhanced card styles */
    .card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Glow effect on focus */
    .btn:focus-visible,
    .nav button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(8, 115, 63, 0.2);
    }
  `;
  document.head.appendChild(rippleStyle);

  // =====================================================
  // CLICK EFFECTS
  // =====================================================
  function initClickEffects() {
    // Add click feedback to interactive elements
    const clickableElements = document.querySelectorAll(
      '.card, .btn, .condition-card, .ncd-card, .executive-center-card, ' +
      '.product-card, .step, .nav button, .store-tab, .role-card'
    );

    clickableElements.forEach(el => {
      el.addEventListener('mousedown', () => {
        el.style.transform = 'scale(0.98)';
      });
      el.addEventListener('mouseup', () => {
        el.style.transform = '';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // =====================================================
  // PROGRESS BARS ANIMATION
  // =====================================================
  function initProgressBars() {
    const progressBars = document.querySelectorAll('.progress i, .match-bar, .bar-fill, .v52-bar, .v53-bar');
    
    progressBars.forEach(bar => {
      // Only animate if the bar has a width set inline
      if (bar.style.width && bar.style.width !== '0px') {
        bar.style.width = '0';
        bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
          bar.style.width = bar.dataset.targetWidth || bar.style.width;
        }, 100);
      }
    });
  }

  // =====================================================
  // CHART ANIMATIONS
  // =====================================================
  function initChartAnimations() {
    // Animate SVG elements in charts
    const svgPaths = document.querySelectorAll('svg path, svg polyline, svg line');
    svgPaths.forEach(path => {
      if (!path.classList.contains('no-animate')) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.style.transition = 'stroke-dashoffset 1s ease';
        
        setTimeout(() => {
          path.style.strokeDashoffset = '0';
        }, 200);
      }
    });
  }

  // =====================================================
  // TOAST NOTIFICATION SYSTEM
  // =====================================================
  function initToastSystem() {
    // Enhance existing toast
    const toast = document.querySelector('.toast');
    if (toast) {
      toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    // Create toast function
    window.showToast = function(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        right: 24px;
        bottom: 24px;
        background: ${type === 'success' ? '#08733f' : type === 'error' ? '#a62f35' : '#2469aa'};
        color: #fff;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    // Add toast animations
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: none;
        }
        to {
          opacity: 0;
          transform: translateX(100%) translateY(20px);
        }
      }
    `;
    document.head.appendChild(toastStyle);
  }

  // =====================================================
  // SIDEBAR ENHANCEMENTS
  // =====================================================
  function initSidebarEnhancements() {
    const sidebar = document.querySelector('.side');
    if (!sidebar) return;

    // Add hover effect to sidebar
    sidebar.addEventListener('mouseenter', () => {
      sidebar.style.width = '290px';
    });
    sidebar.addEventListener('mouseleave', () => {
      sidebar.style.width = '280px';
    });

    // Add active state to nav buttons
    const navButtons = document.querySelectorAll('.nav button');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
      });
    });
  }

  // =====================================================
  // CARD PARALLAX EFFECT
  // =====================================================
  function initCardParallax() {
    const cards = document.querySelectorAll('.card, .hero');
    
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    });
  }

  // =====================================================
  // TYPEWRITER EFFECT FOR HERO
  // =====================================================
  function initTypeWriter() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const h1 = hero.querySelector('h1');
    if (!h1) return;

    const text = h1.textContent;
    h1.textContent = '';
    h1.style.opacity = '1';
    
    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        h1.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
      }
    };

    // Start typing after a delay
    setTimeout(typeWriter, 500);
  }

  // =====================================================
  // PULSE EFFECTS FOR LIVE ELEMENTS
  // =====================================================
  function initPulseEffects() {
    // Add pulse animation to live indicators
    const liveElements = document.querySelectorAll(
      '.v44-led, .v46-led, .v47-led, .v52-live-dot, .v54-live, .v56-live:before'
    );

    liveElements.forEach(el => {
      el.style.animation = 'pulse 1.5s infinite';
    });

    // Add pulse keyframes
    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.1);
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(8, 115, 63, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(8, 115, 63, 0.6);
        }
      }
      
      .pulse {
        animation: pulse 1.5s infinite !important;
      }
      
      .glow {
        animation: glow 2s infinite !important;
      }
    `;
    document.head.appendChild(pulseStyle);
  }

  // =====================================================
  // ADD SHIMMER EFFECT TO LOADING ELEMENTS
  // =====================================================
  function addShimmerEffect() {
    const shimmerStyle = document.createElement('style');
    shimmerStyle.textContent = `
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      
      .shimmer {
        background: linear-gradient(
          90deg,
          rgba(8, 115, 63, 0.1) 0%,
          rgba(8, 115, 63, 0.2) 50%,
          rgba(8, 115, 63, 0.1) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
      
      .loading {
        position: relative;
        overflow: hidden;
      }
      
      .loading:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.5) 50%,
          transparent 100%
        );
        animation: shimmer 1.5s infinite;
      }
    `;
    document.head.appendChild(shimmerStyle);
  }
  
  // Initialize shimmer
  addShimmerEffect();

  // =====================================================
  // ADD FLOATING ACTION BUTTON (OPTIONAL)
  // =====================================================
  function initFloatingActionButton() {
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
    fab.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #08733f, #054a28);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(8, 115, 63, 0.3);
      z-index: 999;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    fab.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'scale(1.1)';
      fab.style.boxShadow = '0 8px 24px rgba(8, 115, 63, 0.4)';
    });
    
    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'scale(1)';
      fab.style.boxShadow = '0 4px 12px rgba(8, 115, 63, 0.3)';
    });
    
    document.body.appendChild(fab);
  }
  
  // Initialize FAB
  initFloatingActionButton();

  // =====================================================
  // CONSOLE WELCOME MESSAGE
  // =====================================================
  console.log('%c NUTRI.N°1 ', 'background: #08733f; color: #fff; font-size: 20px; padding: 10px;');
  console.log('%c Ultra Modern UI ', 'background: #c9ee59; color: #08733f; font-size: 14px; padding: 5px;');
  console.log('%c Investor-Grade Design ', 'background: #032d1a; color: #c9ee59; font-size: 12px; padding: 5px;');
})();
