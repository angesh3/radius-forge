// Enhanced Theme with Design System Integration - RadiusForge
// Created by: Design System Agent (DSA) & Spacing/Layout Agent (SLA)
// Sprint 1: Foundation Setup
// Integrates design system with existing theme

import { createTheme } from '@mui/material/styles';
import designSystem from './designSystem';

const { spacing, typography, colors, borderRadius, animation, touchTargets, focusStyles, elevation } = designSystem;

// Create enhanced theme with design system integration
const enhancedTheme = createTheme({
  // Use 8pt grid system
  spacing: spacing.unit, // This makes theme.spacing(1) = 8px, theme.spacing(2) = 16px, etc.
  
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[700], // Using darker shade for better contrast
      dark: colors.primary[900],
      light: colors.primary[400],
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: colors.gray[700],
      dark: colors.gray[900],
      light: colors.gray[600],
      contrastText: '#ffffff',
    },
    success: {
      main: colors.success.darker, // Using darker for WCAG compliance
      dark: colors.success.dark,
      light: colors.success.light,
      contrastText: colors.success.contrastText,
    },
    warning: {
      main: colors.warning.darker, // Using darker for WCAG compliance
      dark: colors.warning.dark,
      light: colors.warning.light,
      contrastText: '#ffffff',
    },
    error: {
      main: colors.error.dark,
      dark: colors.error.darker,
      light: colors.error.light,
      contrastText: colors.error.contrastText,
    },
    info: {
      main: colors.info.dark,
      dark: colors.info.darker,
      light: colors.info.light,
      contrastText: colors.info.contrastText,
    },
    background: {
      default: colors.background.elevated,
      paper: colors.background.paper,
      // Custom backgrounds
      sidebar: colors.background.paper,
      header: colors.background.paper,
      dashboard: colors.background.elevated,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    divider: colors.text.divider,
    grey: colors.gray,
  },
  
  typography: {
    fontFamily: typography.fontFamily.primary,
    
    // Use design system typography scale
    h1: {
      fontSize: typography.fontSize.xxxl.size,
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.fontSize.xxxl.lineHeight / typography.fontSize.xxxl.size,
      letterSpacing: typography.letterSpacing.tight,
      color: colors.text.primary,
    },
    h2: {
      fontSize: typography.fontSize.xxl.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.xxl.lineHeight / typography.fontSize.xxl.size,
      letterSpacing: typography.letterSpacing.tight,
      color: colors.text.primary,
    },
    h3: {
      fontSize: typography.fontSize.xl.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.xl.lineHeight / typography.fontSize.xl.size,
      color: colors.text.primary,
    },
    h4: {
      fontSize: typography.fontSize.lg.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.lg.lineHeight / typography.fontSize.lg.size,
      color: colors.text.primary,
    },
    h5: {
      fontSize: typography.fontSize.md.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.md.lineHeight / typography.fontSize.md.size,
      color: colors.text.primary,
    },
    h6: {
      fontSize: typography.fontSize.sm.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.sm.lineHeight / typography.fontSize.sm.size,
      color: colors.text.primary,
    },
    subtitle1: {
      fontSize: typography.fontSize.md.size,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.md.lineHeight / typography.fontSize.md.size,
      color: colors.text.primary,
    },
    subtitle2: {
      fontSize: typography.fontSize.sm.size,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm.lineHeight / typography.fontSize.sm.size,
      color: colors.text.secondary,
    },
    body1: {
      fontSize: typography.fontSize.md.size,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.fontSize.md.lineHeight / typography.fontSize.md.size,
      color: colors.text.primary,
    },
    body2: {
      fontSize: typography.fontSize.sm.size,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.fontSize.sm.lineHeight / typography.fontSize.sm.size,
      color: colors.text.secondary,
    },
    caption: {
      fontSize: typography.fontSize.xs.size,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.fontSize.xs.lineHeight / typography.fontSize.xs.size,
      color: colors.text.secondary,
    },
    overline: {
      fontSize: typography.fontSize.xs.size,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: 2,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing.wider,
      color: colors.text.secondary,
    },
    button: {
      fontSize: typography.fontSize.sm.size,
      fontWeight: typography.fontWeight.medium,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'none', // Override MUI default
    },
  },
  
  shape: {
    borderRadius: borderRadius.md,
  },
  
  // Use design system shadows
  shadows: [
    elevation[0],
    elevation[1],
    elevation[2],
    elevation[3],
    elevation[4],
    elevation[4],
    elevation[6],
    elevation[6],
    elevation[8],
    elevation[8],
    elevation[8],
    elevation[8],
    elevation[12],
    elevation[12],
    elevation[12],
    elevation[12],
    elevation[16],
    elevation[16],
    elevation[16],
    elevation[16],
    elevation[24],
    elevation[24],
    elevation[24],
    elevation[24],
    elevation[24],
  ],
  
  transitions: {
    duration: animation.duration,
    easing: animation.easing,
  },
  
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          fontFamily: typography.fontFamily.primary,
        },
        '*': {
          boxSizing: 'border-box',
        },
        // Accessible focus styles globally
        '*:focus-visible': {
          outline: focusStyles.outline,
          outlineOffset: focusStyles.outlineOffset,
          borderRadius: focusStyles.borderRadius,
        },
        // Consistent scrollbar
        '::-webkit-scrollbar': {
          width: spacing.sm,
          height: spacing.sm,
        },
        '::-webkit-scrollbar-track': {
          background: colors.gray[100],
        },
        '::-webkit-scrollbar-thumb': {
          background: colors.gray[400],
          borderRadius: borderRadius.sm,
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: colors.gray[500],
        },
      },
    },
    
    // Button with touch targets and focus styles
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: touchTargets.minimum,
          minWidth: touchTargets.minimum,
          textTransform: 'none',
          fontWeight: typography.fontWeight.medium,
          borderRadius: borderRadius.md,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          transition: animation.easing.easeInOut,
          '&:focus-visible': {
            outline: focusStyles.outline,
            outlineOffset: focusStyles.outlineOffset,
          },
        },
        sizeLarge: {
          minHeight: touchTargets.recommended,
          padding: `${spacing.md}px ${spacing.xl}px`,
          fontSize: typography.fontSize.md.size,
        },
        sizeMedium: {
          padding: `${spacing.sm + 4}px ${spacing.lg}px`,
        },
        sizeSmall: {
          padding: `${spacing.sm}px ${spacing.md}px`,
          fontSize: typography.fontSize.sm.size,
        },
        contained: {
          boxShadow: elevation[2],
          '&:hover': {
            boxShadow: elevation[4],
          },
          '&:active': {
            boxShadow: elevation[1],
          },
        },
      },
    },
    
    // Icon buttons with touch targets
    MuiIconButton: {
      styleOverrides: {
        root: {
          minHeight: touchTargets.minimum,
          minWidth: touchTargets.minimum,
          padding: spacing.sm,
          '&:focus-visible': {
            outline: focusStyles.outline,
            outlineOffset: focusStyles.outlineOffset,
          },
        },
        sizeLarge: {
          minHeight: touchTargets.recommended,
          minWidth: touchTargets.recommended,
        },
      },
    },
    
    // Cards with consistent elevation
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: elevation[2],
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.gray[200]}`,
          '&:hover': {
            boxShadow: elevation[4],
          },
        },
      },
    },
    
    // Paper with proper elevation
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
        },
        elevation1: { boxShadow: elevation[1] },
        elevation2: { boxShadow: elevation[2] },
        elevation3: { boxShadow: elevation[3] },
        elevation4: { boxShadow: elevation[4] },
        elevation6: { boxShadow: elevation[6] },
        elevation8: { boxShadow: elevation[8] },
        elevation12: { boxShadow: elevation[12] },
        elevation16: { boxShadow: elevation[16] },
        elevation24: { boxShadow: elevation[24] },
      },
    },
    
    // TextField with touch targets
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: touchTargets.minimum,
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: colors.gray[300],
            },
            '&:hover fieldset': {
              borderColor: colors.primary[500],
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary[700],
              borderWidth: 2,
            },
          },
        },
      },
    },
    
    // List items with touch targets
    MuiListItem: {
      styleOverrides: {
        root: {
          minHeight: touchTargets.minimum,
          borderRadius: borderRadius.md,
          marginBottom: spacing.xs,
          '&.Mui-selected': {
            backgroundColor: colors.primary[700],
            color: colors.primary.contrastText,
            '& .MuiListItemIcon-root': {
              color: colors.primary.contrastText,
            },
            '&:hover': {
              backgroundColor: colors.primary[800],
            },
          },
          '&:hover': {
            backgroundColor: colors.gray[50],
          },
        },
      },
    },
    
    // Table cells with consistent spacing
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: `${spacing.sm}px ${spacing.md}px`,
        },
        head: {
          fontWeight: typography.fontWeight.semibold,
          backgroundColor: colors.gray[50],
        },
      },
    },
    
    // Chips with minimum size
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: borderRadius.pill,
        },
      },
    },
    
    // Alerts with proper contrast
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
        },
        standardSuccess: {
          backgroundColor: colors.success.light + '20',
          color: colors.success.darker,
        },
        standardError: {
          backgroundColor: colors.error.light + '20',
          color: colors.error.darker,
        },
        standardWarning: {
          backgroundColor: colors.warning.light + '20',
          color: colors.warning.darker,
        },
        standardInfo: {
          backgroundColor: colors.info.light + '20',
          color: colors.info.darker,
        },
      },
    },
    
    // Drawer with consistent spacing
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.paper,
          borderRight: `1px solid ${colors.gray[200]}`,
          padding: spacing.md,
        },
      },
    },
    
    // AppBar with proper elevation
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          color: colors.text.primary,
          boxShadow: elevation[1],
        },
      },
    },
  },
});

export default enhancedTheme;