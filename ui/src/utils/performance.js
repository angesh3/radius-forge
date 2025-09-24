// Performance Optimization Utilities - RadiusForge
// Created by: Performance Agent (PA)
// Sprint 3: Performance optimization

import React, { lazy, Suspense, memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { Skeleton, CircularProgress, Box } from '@mui/material';

/**
 * Lazy load component with loading fallback
 * @param {Function} importFunc - Dynamic import function
 * @param {Object} options - Loading options
 */
export const lazyLoadComponent = (importFunc, options = {}) => {
  const {
    fallback = <CircularProgress />,
    delay = 0,
    chunkName = 'component'
  } = options;
  
  const LazyComponent = lazy(() => {
    return new Promise(resolve => {
      setTimeout(() => resolve(importFunc()), delay);
    });
  });
  
  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Memoize component with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} propsAreEqual - Custom comparison function
 */
export const memoizeComponent = (Component, propsAreEqual) => {
  return memo(Component, propsAreEqual);
};

/**
 * Debounce hook for input handlers
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
};

/**
 * Throttle hook for scroll/resize handlers
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());
  
  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    }
  }, [callback, delay]);
  
  return throttledCallback;
};

/**
 * Virtual scroll hook for large lists
 * @param {Array} items - List items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Visible container height
 */
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight)
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
};

/**
 * Intersection Observer hook for lazy loading
 * @param {Object} options - Observer options
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options, hasIntersected]);
  
  return { ref, isIntersecting, hasIntersected };
};

/**
 * Image lazy loading component
 */
export const LazyImage = ({ src, alt, placeholder, ...props }) => {
  const { ref, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });
  
  return (
    <Box ref={ref} {...props}>
      {hasIntersected ? (
        <img src={src} alt={alt} loading="lazy" style={{ width: '100%', height: 'auto' }} />
      ) : (
        placeholder || <Skeleton variant="rectangular" width="100%" height={200} />
      )}
    </Box>
  );
};

/**
 * Optimize re-renders with shallow comparison
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @param {Array} keys - Keys to compare
 */
export const shallowCompare = (prevProps, nextProps, keys = []) => {
  if (keys.length === 0) {
    keys = Object.keys(nextProps);
  }
  
  return keys.every(key => prevProps[key] === nextProps[key]);
};

/**
 * Request Animation Frame hook
 * @param {Function} callback - Animation callback
 */
export const useAnimationFrame = (callback) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();
  
  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);
  
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);
};

/**
 * Batch DOM updates
 * @param {Array} updates - Array of update functions
 */
export const batchUpdates = (updates) => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

/**
 * Web Worker hook for heavy computations
 * @param {Function} workerFunction - Function to run in worker
 * @param {Array} deps - Dependencies
 */
export const useWebWorker = (workerFunction, deps = []) => {
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const workerRef = useRef(null);
  
  useEffect(() => {
    const blob = new Blob([`(${workerFunction.toString()})()`], {
      type: 'application/javascript',
    });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    workerRef.current.onmessage = (e) => {
      setResult(e.data);
      setLoading(false);
    };
    
    workerRef.current.onerror = (e) => {
      setError(e);
      setLoading(false);
    };
    
    return () => {
      workerRef.current.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, deps);
  
  const runWorker = useCallback((data) => {
    setLoading(true);
    setError(null);
    workerRef.current.postMessage(data);
  }, []);
  
  return { result, error, loading, runWorker };
};

/**
 * Memory cache for expensive computations
 */
class MemoryCache {
  constructor(maxSize = 100, ttl = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();

/**
 * Memoize expensive function calls
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Generate cache key
 */
export const memoizeFunction = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  return (...args) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Preload component
 * @param {Function} importFunc - Dynamic import function
 */
export const preloadComponent = (importFunc) => {
  importFunc();
};

/**
 * Performance monitoring
 */
export const measurePerformance = (name, fn) => {
  if (typeof window !== 'undefined' && window.performance) {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-duration`;
    
    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    console.log(`${name} took ${measure.duration.toFixed(2)}ms`);
    
    return result;
  }
  
  return fn();
};

/**
 * Code splitting utilities
 */
export const splitChunks = {
  // Route-based splitting
  routes: {
    Dashboard: () => import('../pages/Dashboard'),
    ScaleTest: () => import('../pages/ScaleTest'),
    PerformanceTest: () => import('../pages/PerformanceTestEnhanced'),
    ThreatGenerator: () => import('../pages/ThreatGeneratorEnhanced'),
    Report: () => import('../pages/ReportEnhanced'),
    TestCoverage: () => import('../pages/TestCoverageReport'),
    Topology: () => import('../pages/TopologyEnhanced'),
    History: () => import('../pages/History'),
    Help: () => import('../pages/HelpEnhanced'),
  },
  
  // Component-based splitting
  components: {
    Charts: () => import('recharts'),
    Editor: () => import('@monaco-editor/react'),
    PDF: () => import('react-pdf'),
  },
};

// Export all utilities
export default {
  lazyLoadComponent,
  memoizeComponent,
  useDebounce,
  useThrottle,
  useVirtualScroll,
  useIntersectionObserver,
  LazyImage,
  shallowCompare,
  useAnimationFrame,
  batchUpdates,
  useWebWorker,
  cache,
  memoizeFunction,
  preloadComponent,
  measurePerformance,
  splitChunks,
};