// Cross-Browser Compatibility Utilities - RadiusForge
// Created by: Cross-browser Agent (CBA)
// Sprint 3: Browser compatibility fixes

/**
 * Detect browser and version
 */
export const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let isIE = false;
  let isEdge = false;
  let isChrome = false;
  let isFirefox = false;
  let isSafari = false;
  let isOpera = false;
  
  // Internet Explorer
  if (userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident/') !== -1) {
    browserName = 'Internet Explorer';
    isIE = true;
    const match = userAgent.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  // Edge
  else if (userAgent.indexOf('Edg') !== -1) {
    browserName = 'Edge';
    isEdge = true;
    const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  // Chrome
  else if (userAgent.indexOf('Chrome') !== -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    isChrome = true;
    const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  // Firefox
  else if (userAgent.indexOf('Firefox') !== -1) {
    browserName = 'Firefox';
    isFirefox = true;
    const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  // Safari
  else if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    isSafari = true;
    const match = userAgent.match(/Version\/(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  // Opera
  else if (userAgent.indexOf('Opera') !== -1 || userAgent.indexOf('OPR') !== -1) {
    browserName = 'Opera';
    isOpera = true;
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+(\.\d+)?)/);
    if (match) browserVersion = match[1];
  }
  
  return {
    name: browserName,
    version: browserVersion,
    isIE,
    isEdge,
    isChrome,
    isFirefox,
    isSafari,
    isOpera,
    userAgent,
  };
};

/**
 * Check if browser supports a feature
 */
export const supportsFeature = (feature) => {
  const features = {
    flexbox: () => {
      const elem = document.createElement('div');
      elem.style.display = 'flex';
      return elem.style.display === 'flex';
    },
    grid: () => {
      const elem = document.createElement('div');
      elem.style.display = 'grid';
      return elem.style.display === 'grid';
    },
    customProperties: () => CSS && CSS.supports && CSS.supports('--test', '0'),
    webp: () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
    },
    intersectionObserver: () => 'IntersectionObserver' in window,
    resizeObserver: () => 'ResizeObserver' in window,
    mutationObserver: () => 'MutationObserver' in window,
    fetch: () => 'fetch' in window,
    promise: () => 'Promise' in window,
    webWorker: () => 'Worker' in window,
    serviceWorker: () => 'serviceWorker' in navigator,
    localStorage: () => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },
    sessionStorage: () => {
      try {
        const test = '__test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },
    webGL: () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    },
    touchEvents: () => 'ontouchstart' in window,
    pointerEvents: () => 'PointerEvent' in window,
    clipboard: () => navigator.clipboard && navigator.clipboard.writeText,
  };
  
  return features[feature] ? features[feature]() : false;
};

/**
 * Add vendor prefixes to CSS property
 */
export const addVendorPrefix = (property, value) => {
  const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
  const styles = {};
  
  prefixes.forEach(prefix => {
    const prefixedProperty = prefix + property;
    styles[prefixedProperty] = value;
  });
  
  return styles;
};

/**
 * Get prefixed CSS property
 */
export const getPrefixedProperty = (property) => {
  const style = document.createElement('div').style;
  const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
  
  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
    const prop = prefix
      ? prefix + property.charAt(0).toUpperCase() + property.slice(1)
      : property;
    
    if (prop in style) {
      return prop;
    }
  }
  
  return null;
};

/**
 * Polyfill for requestAnimationFrame
 */
export const requestAnimationFramePolyfill = () => {
  let lastTime = 0;
  const vendors = ['ms', 'moz', 'webkit', 'o'];
  
  for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                                 window[vendors[x] + 'CancelRequestAnimationFrame'];
  }
  
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(() => {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }
  
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
};

/**
 * Smooth scroll polyfill
 */
export const smoothScrollPolyfill = () => {
  if (!('scrollBehavior' in document.documentElement.style)) {
    const originalScrollTo = window.scrollTo;
    const originalScrollBy = window.scrollBy;
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    
    window.scrollTo = function(options) {
      if (options && typeof options === 'object' && options.behavior === 'smooth') {
        smoothScroll(window, options.left || 0, options.top || 0);
      } else {
        originalScrollTo.apply(window, arguments);
      }
    };
    
    window.scrollBy = function(options) {
      if (options && typeof options === 'object' && options.behavior === 'smooth') {
        const currentX = window.pageXOffset || document.documentElement.scrollLeft;
        const currentY = window.pageYOffset || document.documentElement.scrollTop;
        smoothScroll(window, currentX + (options.left || 0), currentY + (options.top || 0));
      } else {
        originalScrollBy.apply(window, arguments);
      }
    };
    
    Element.prototype.scrollIntoView = function(options) {
      if (options && typeof options === 'object' && options.behavior === 'smooth') {
        const rect = this.getBoundingClientRect();
        const currentY = window.pageYOffset || document.documentElement.scrollTop;
        smoothScroll(window, 0, currentY + rect.top);
      } else {
        originalScrollIntoView.apply(this, arguments);
      }
    };
  }
  
  function smoothScroll(element, x, y) {
    const startX = element.pageXOffset || element.scrollLeft || 0;
    const startY = element.pageYOffset || element.scrollTop || 0;
    const distanceX = x - startX;
    const distanceY = y - startY;
    const duration = 500;
    const startTime = performance.now();
    
    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
      
      element.scrollTo(
        startX + distanceX * easeProgress,
        startY + distanceY * easeProgress
      );
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    
    requestAnimationFrame(step);
  }
};

/**
 * CSS.supports polyfill
 */
export const cssSupportsPolyfill = () => {
  if (!window.CSS || !window.CSS.supports) {
    window.CSS = window.CSS || {};
    window.CSS.supports = function(property, value) {
      const elem = document.createElement('div');
      elem.style[property] = value;
      return elem.style[property] === value;
    };
  }
};

/**
 * Object.assign polyfill
 */
export const objectAssignPolyfill = () => {
  if (typeof Object.assign !== 'function') {
    Object.assign = function(target) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      
      const to = Object(target);
      
      for (let index = 1; index < arguments.length; index++) {
        const nextSource = arguments[index];
        
        if (nextSource != null) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      
      return to;
    };
  }
};

/**
 * Array.from polyfill
 */
export const arrayFromPolyfill = () => {
  if (!Array.from) {
    Array.from = function(arrayLike, mapFn, thisArg) {
      const C = this;
      const items = Object(arrayLike);
      
      if (arrayLike == null) {
        throw new TypeError('Array.from requires an array-like object');
      }
      
      const len = parseInt(items.length) || 0;
      const A = typeof C === 'function' ? new C(len) : new Array(len);
      
      for (let k = 0; k < len; k++) {
        if (k in items) {
          if (mapFn) {
            A[k] = mapFn.call(thisArg, items[k], k);
          } else {
            A[k] = items[k];
          }
        }
      }
      
      A.length = len;
      return A;
    };
  }
};

/**
 * Check WebP support
 */
export const checkWebPSupport = () => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Get scrollbar width
 */
export const getScrollbarWidth = () => {
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  outer.style.msOverflowStyle = 'scrollbar';
  document.body.appendChild(outer);
  
  const inner = document.createElement('div');
  outer.appendChild(inner);
  
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode.removeChild(outer);
  
  return scrollbarWidth;
};

/**
 * Normalize wheel event
 */
export const normalizeWheel = (event) => {
  let deltaX = event.deltaX;
  let deltaY = event.deltaY;
  let deltaZ = event.deltaZ;
  
  // Firefox
  if (event.deltaMode === 1) {
    deltaX *= 40;
    deltaY *= 40;
    deltaZ *= 40;
  } else if (event.deltaMode === 2) {
    deltaX *= 800;
    deltaY *= 800;
    deltaZ *= 800;
  }
  
  return { deltaX, deltaY, deltaZ };
};

/**
 * Initialize all polyfills
 */
export const initializePolyfills = () => {
  requestAnimationFramePolyfill();
  smoothScrollPolyfill();
  cssSupportsPolyfill();
  objectAssignPolyfill();
  arrayFromPolyfill();
};

/**
 * Browser-specific CSS fixes
 */
export const getBrowserSpecificStyles = () => {
  const browser = detectBrowser();
  const styles = {};
  
  if (browser.isSafari) {
    // Safari-specific fixes
    styles.WebkitOverflowScrolling = 'touch';
    styles.WebkitBackfaceVisibility = 'hidden';
    styles.WebkitTransform = 'translateZ(0)';
  }
  
  if (browser.isFirefox) {
    // Firefox-specific fixes
    styles.scrollbarWidth = 'thin';
  }
  
  if (browser.isIE) {
    // IE-specific fixes
    styles.msOverflowStyle = 'scrollbar';
  }
  
  return styles;
};

// Export all utilities
export default {
  detectBrowser,
  supportsFeature,
  addVendorPrefix,
  getPrefixedProperty,
  requestAnimationFramePolyfill,
  smoothScrollPolyfill,
  cssSupportsPolyfill,
  objectAssignPolyfill,
  arrayFromPolyfill,
  checkWebPSupport,
  getScrollbarWidth,
  normalizeWheel,
  initializePolyfills,
  getBrowserSpecificStyles,
};