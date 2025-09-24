// Enhanced Global Styles with Design System - RadiusForge
// Created by: Spacing/Layout Agent (SLA)
// Sprint 2: Complete spacing migration

import React from 'react';
import { GlobalStyles as MuiGlobalStyles } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import designSystem from '../theme/designSystem';

const { spacing, typography, colors, borderRadius, focusStyles, touchTargets } = designSystem;

const GlobalStylesEnhanced = () => {
  const theme = useTheme();

  return (
    <MuiGlobalStyles
      styles={{
        // Reset and base styles
        '*': {
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        },
        
        'html, body, #root': {
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        },
        
        body: {
          fontFamily: typography.fontFamily.primary,
          fontSize: typography.fontSize.md.size,
          lineHeight: typography.fontSize.md.lineHeight / typography.fontSize.md.size,
          color: colors.text.primary,
          backgroundColor: colors.background.default,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        
        // Consistent focus styles for accessibility
        '*:focus-visible': {
          outline: focusStyles.outline,
          outlineOffset: focusStyles.outlineOffset,
          borderRadius: focusStyles.borderRadius,
        },
        
        // Remove default focus outline for mouse users
        '*:focus:not(:focus-visible)': {
          outline: 'none',
        },
        
        // Consistent link styles
        a: {
          color: colors.primary[700],
          textDecoration: 'none',
          transition: `color ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeInOut}`,
          
          '&:hover': {
            color: colors.primary[800],
            textDecoration: 'underline',
          },
          
          '&:focus-visible': {
            outline: focusStyles.outline,
            outlineOffset: focusStyles.outlineOffset,
            borderRadius: focusStyles.borderRadius,
          },
          
          '&:visited': {
            color: colors.primary[900],
          },
        },
        
        // Ensure all buttons meet touch target requirements
        'button, [role="button"]': {
          minHeight: touchTargets.minimum,
          minWidth: touchTargets.minimum,
          cursor: 'pointer',
        },
        
        // Consistent scrollbar styling
        '::-webkit-scrollbar': {
          width: spacing.sm,
          height: spacing.sm,
        },
        
        '::-webkit-scrollbar-track': {
          backgroundColor: colors.gray[100],
          borderRadius: borderRadius.sm,
        },
        
        '::-webkit-scrollbar-thumb': {
          backgroundColor: colors.gray[400],
          borderRadius: borderRadius.sm,
          
          '&:hover': {
            backgroundColor: colors.gray[500],
          },
        },
        
        // Typography classes using design system
        '.text-xs': {
          fontSize: typography.fontSize.xs.size,
          lineHeight: typography.fontSize.xs.lineHeight / typography.fontSize.xs.size,
        },
        '.text-sm': {
          fontSize: typography.fontSize.sm.size,
          lineHeight: typography.fontSize.sm.lineHeight / typography.fontSize.sm.size,
        },
        '.text-md': {
          fontSize: typography.fontSize.md.size,
          lineHeight: typography.fontSize.md.lineHeight / typography.fontSize.md.size,
        },
        '.text-lg': {
          fontSize: typography.fontSize.lg.size,
          lineHeight: typography.fontSize.lg.lineHeight / typography.fontSize.lg.size,
        },
        '.text-xl': {
          fontSize: typography.fontSize.xl.size,
          lineHeight: typography.fontSize.xl.lineHeight / typography.fontSize.xl.size,
        },
        
        // Spacing utility classes using 8pt grid
        '.p-0': { padding: 0 },
        '.p-xs': { padding: spacing.xs },
        '.p-sm': { padding: spacing.sm },
        '.p-md': { padding: spacing.md },
        '.p-lg': { padding: spacing.lg },
        '.p-xl': { padding: spacing.xl },
        '.p-xxl': { padding: spacing.xxl },
        
        '.m-0': { margin: 0 },
        '.m-xs': { margin: spacing.xs },
        '.m-sm': { margin: spacing.sm },
        '.m-md': { margin: spacing.md },
        '.m-lg': { margin: spacing.lg },
        '.m-xl': { margin: spacing.xl },
        '.m-xxl': { margin: spacing.xxl },
        
        // Padding directions
        '.pt-0': { paddingTop: 0 },
        '.pt-xs': { paddingTop: spacing.xs },
        '.pt-sm': { paddingTop: spacing.sm },
        '.pt-md': { paddingTop: spacing.md },
        '.pt-lg': { paddingTop: spacing.lg },
        '.pt-xl': { paddingTop: spacing.xl },
        
        '.pb-0': { paddingBottom: 0 },
        '.pb-xs': { paddingBottom: spacing.xs },
        '.pb-sm': { paddingBottom: spacing.sm },
        '.pb-md': { paddingBottom: spacing.md },
        '.pb-lg': { paddingBottom: spacing.lg },
        '.pb-xl': { paddingBottom: spacing.xl },
        
        '.pl-0': { paddingLeft: 0 },
        '.pl-xs': { paddingLeft: spacing.xs },
        '.pl-sm': { paddingLeft: spacing.sm },
        '.pl-md': { paddingLeft: spacing.md },
        '.pl-lg': { paddingLeft: spacing.lg },
        '.pl-xl': { paddingLeft: spacing.xl },
        
        '.pr-0': { paddingRight: 0 },
        '.pr-xs': { paddingRight: spacing.xs },
        '.pr-sm': { paddingRight: spacing.sm },
        '.pr-md': { paddingRight: spacing.md },
        '.pr-lg': { paddingRight: spacing.lg },
        '.pr-xl': { paddingRight: spacing.xl },
        
        // Margin directions
        '.mt-0': { marginTop: 0 },
        '.mt-xs': { marginTop: spacing.xs },
        '.mt-sm': { marginTop: spacing.sm },
        '.mt-md': { marginTop: spacing.md },
        '.mt-lg': { marginTop: spacing.lg },
        '.mt-xl': { marginTop: spacing.xl },
        
        '.mb-0': { marginBottom: 0 },
        '.mb-xs': { marginBottom: spacing.xs },
        '.mb-sm': { marginBottom: spacing.sm },
        '.mb-md': { marginBottom: spacing.md },
        '.mb-lg': { marginBottom: spacing.lg },
        '.mb-xl': { marginBottom: spacing.xl },
        
        '.ml-0': { marginLeft: 0 },
        '.ml-xs': { marginLeft: spacing.xs },
        '.ml-sm': { marginLeft: spacing.sm },
        '.ml-md': { marginLeft: spacing.md },
        '.ml-lg': { marginLeft: spacing.lg },
        '.ml-xl': { marginLeft: spacing.xl },
        
        '.mr-0': { marginRight: 0 },
        '.mr-xs': { marginRight: spacing.xs },
        '.mr-sm': { marginRight: spacing.sm },
        '.mr-md': { marginRight: spacing.md },
        '.mr-lg': { marginRight: spacing.lg },
        '.mr-xl': { marginRight: spacing.xl },
        
        // Responsive utilities
        '@media (max-width: 768px)': {
          // Mobile-specific styles
          '.hide-mobile': {
            display: 'none !important',
          },
          
          // Ensure touch targets on mobile
          'button, [role="button"], a, input, select, textarea': {
            minHeight: touchTargets.recommended,
            minWidth: touchTargets.recommended,
          },
          
          // Responsive tables
          '.table-responsive': {
            display: 'block',
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          },
          
          // Stack elements on mobile
          '.stack-mobile': {
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
          },
          
          // Full width on mobile
          '.full-width-mobile': {
            width: '100% !important',
            maxWidth: '100% !important',
          },
        },
        
        '@media (min-width: 769px)': {
          '.hide-desktop': {
            display: 'none !important',
          },
        },
        
        // Print styles
        '@media print': {
          body: {
            backgroundColor: 'white',
            color: 'black',
          },
          
          '.no-print': {
            display: 'none !important',
          },
          
          '.page-break-after': {
            pageBreakAfter: 'always',
          },
          
          '.page-break-before': {
            pageBreakBefore: 'always',
          },
        },
        
        // Animation utilities
        '.transition-all': {
          transition: `all ${designSystem.animation.duration.standard}ms ${designSystem.animation.easing.easeInOut}`,
        },
        
        '.transition-colors': {
          transition: `color ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeInOut}, ` +
                     `background-color ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeInOut}`,
        },
        
        '.transition-transform': {
          transition: `transform ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeOut}`,
        },
        
        // Hover effects
        '.hover-lift': {
          transition: `transform ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeOut}`,
          
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        
        '.hover-grow': {
          transition: `transform ${designSystem.animation.duration.short}ms ${designSystem.animation.easing.easeOut}`,
          
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
        
        // Loading states
        '.skeleton': {
          backgroundColor: colors.gray[200],
          animation: 'skeleton-loading 1.5s ease-in-out infinite',
        },
        
        '@keyframes skeleton-loading': {
          '0%': {
            backgroundColor: colors.gray[200],
          },
          '50%': {
            backgroundColor: colors.gray[300],
          },
          '100%': {
            backgroundColor: colors.gray[200],
          },
        },
        
        // Ensure color contrast for all text
        '.text-primary': {
          color: colors.text.primary,
        },
        
        '.text-secondary': {
          color: colors.text.secondary,
        },
        
        '.text-disabled': {
          color: colors.text.disabled,
        },
        
        '.text-error': {
          color: colors.error.darker,
        },
        
        '.text-warning': {
          color: colors.warning.darker,
        },
        
        '.text-success': {
          color: colors.success.darker,
        },
        
        '.text-info': {
          color: colors.info.darker,
        },
        
        // Background colors with proper contrast
        '.bg-primary': {
          backgroundColor: colors.primary[700],
          color: colors.primary.contrastText,
        },
        
        '.bg-secondary': {
          backgroundColor: colors.gray[700],
          color: '#ffffff',
        },
        
        '.bg-error': {
          backgroundColor: colors.error.light + '20',
          color: colors.error.darker,
        },
        
        '.bg-warning': {
          backgroundColor: colors.warning.light + '20',
          color: colors.warning.darker,
        },
        
        '.bg-success': {
          backgroundColor: colors.success.light + '20',
          color: colors.success.darker,
        },
        
        '.bg-info': {
          backgroundColor: colors.info.light + '20',
          color: colors.info.darker,
        },
        
        // Screen reader only content
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        },
        
        // Skip to main content link
        '.skip-to-main': {
          position: 'absolute',
          top: '-40px',
          left: 0,
          backgroundColor: colors.primary[700],
          color: colors.primary.contrastText,
          padding: spacing.sm,
          zIndex: 100,
          textDecoration: 'none',
          
          '&:focus': {
            top: 0,
          },
        },
      }}
    />
  );
};

export default GlobalStylesEnhanced;