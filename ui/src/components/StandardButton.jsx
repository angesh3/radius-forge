// Standardized Button Component - RadiusForge
// Created by: Component Standardization Agent (CSA)
// Sprint 1: Component Foundation
// Replaces all button variations with consistent implementation

import React, { forwardRef } from 'react';
import { Button as MuiButton, CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import designSystem from '../theme/designSystem';

const { spacing, touchTargets, focusStyles, animation, colors } = designSystem;

// Styled button with consistent design system implementation
const StyledButton = styled(MuiButton)(({ theme, size, variant }) => ({
  // Enforce minimum touch target size
  minHeight: touchTargets.minimum,
  minWidth: touchTargets.minimum,
  
  // Consistent padding using spacing scale
  padding: size === 'small' 
    ? `${spacing.sm}px ${spacing.md}px`
    : size === 'large'
    ? `${spacing.md}px ${spacing.xl}px`
    : `${spacing.sm + 4}px ${spacing.lg}px`, // medium default
  
  // Typography based on size
  fontSize: size === 'small'
    ? theme.typography.body2.fontSize
    : size === 'large'
    ? theme.typography.h6.fontSize
    : theme.typography.button.fontSize,
  
  // Consistent border radius
  borderRadius: theme.shape.borderRadius,
  
  // Animation
  transition: theme.transitions.create(
    ['background-color', 'box-shadow', 'border-color', 'color'],
    { duration: animation.duration.short }
  ),
  
  // Text transformation
  textTransform: 'none', // Override MUI default uppercase
  
  // Font weight
  fontWeight: theme.typography.fontWeightMedium,
  
  // Focus styles for accessibility
  '&:focus-visible': {
    outline: focusStyles.outline,
    outlineOffset: focusStyles.outlineOffset,
  },
  
  // Hover states with proper contrast
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[4],
  },
  
  // Active state
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: theme.shadows[2],
  },
  
  // Disabled state with proper contrast
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  
  // Loading state
  '&.loading': {
    pointerEvents: 'none',
    opacity: 0.7,
  }
}));

// Icon size mapping
const iconSizeMap = {
  small: 16,
  medium: 20,
  large: 24
};

/**
 * StandardButton Component
 * 
 * A fully accessible, consistent button component that replaces all button variations
 * 
 * @param {Object} props
 * @param {string} props.variant - 'contained' | 'outlined' | 'text' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'
 * @param {string} props.size - 'small' | 'medium' | 'large'
 * @param {boolean} props.fullWidth - Whether button should take full width
 * @param {boolean} props.loading - Show loading state
 * @param {string} props.loadingText - Text to show while loading
 * @param {ReactNode} props.startIcon - Icon at the start
 * @param {ReactNode} props.endIcon - Icon at the end
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.ariaLabel - Accessibility label
 * @param {string} props.ariaDescribedBy - ID of element describing the button
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - 'button' | 'submit' | 'reset'
 * @param {Object} props.sx - Additional styles
 */
const StandardButton = forwardRef(({
  children,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  fullWidth = false,
  loading = false,
  loadingText = 'Loading...',
  startIcon,
  endIcon,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  onClick,
  type = 'button',
  className,
  sx,
  ...otherProps
}, ref) => {
  
  // Map custom variants to MUI variants
  const getMuiVariant = () => {
    if (['contained', 'outlined', 'text'].includes(variant)) {
      return variant;
    }
    // Default to contained for color variants
    return 'contained';
  };
  
  // Map color prop
  const getColor = () => {
    if (['primary', 'secondary', 'success', 'error', 'warning', 'info'].includes(variant)) {
      return variant;
    }
    return color;
  };
  
  // Handle loading icon size
  const loadingIconSize = iconSizeMap[size];
  
  // Combine className for loading state
  const combinedClassName = `${className || ''} ${loading ? 'loading' : ''}`.trim();
  
  return (
    <StyledButton
      ref={ref}
      variant={getMuiVariant()}
      color={getColor()}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={combinedClassName}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      startIcon={loading ? (
        <CircularProgress size={loadingIconSize} color="inherit" />
      ) : startIcon}
      endIcon={!loading ? endIcon : undefined}
      sx={{
        position: 'relative',
        ...sx
      }}
      {...otherProps}
    >
      {loading && loadingText ? loadingText : children}
    </StyledButton>
  );
});

StandardButton.displayName = 'StandardButton';

// Export button group for related buttons
export const StandardButtonGroup = styled(Box)(({ theme, orientation = 'horizontal' }) => ({
  display: 'flex',
  flexDirection: orientation === 'vertical' ? 'column' : 'row',
  gap: spacing.sm,
  
  // Remove gap between grouped buttons
  '&.no-gap': {
    gap: 0,
    '& > .MuiButton-root': {
      borderRadius: 0,
      '&:first-of-type': {
        borderTopLeftRadius: theme.shape.borderRadius,
        borderBottomLeftRadius: orientation === 'horizontal' ? theme.shape.borderRadius : 0,
        borderTopRightRadius: orientation === 'vertical' ? theme.shape.borderRadius : 0,
      },
      '&:last-of-type': {
        borderTopRightRadius: orientation === 'horizontal' ? theme.shape.borderRadius : 0,
        borderBottomRightRadius: theme.shape.borderRadius,
        borderBottomLeftRadius: orientation === 'vertical' ? theme.shape.borderRadius : 0,
      },
      '&:not(:first-of-type)': {
        marginLeft: orientation === 'horizontal' ? -1 : 0,
        marginTop: orientation === 'vertical' ? -1 : 0,
      }
    }
  }
}));

// Quick action button presets
export const ButtonPresets = {
  // Primary actions
  Save: (props) => (
    <StandardButton variant="primary" {...props}>
      Save
    </StandardButton>
  ),
  
  Cancel: (props) => (
    <StandardButton variant="outlined" color="inherit" {...props}>
      Cancel
    </StandardButton>
  ),
  
  Delete: (props) => (
    <StandardButton variant="error" {...props}>
      Delete
    </StandardButton>
  ),
  
  Submit: (props) => (
    <StandardButton variant="primary" type="submit" {...props}>
      Submit
    </StandardButton>
  ),
  
  // Navigation
  Back: (props) => (
    <StandardButton variant="text" startIcon="←" {...props}>
      Back
    </StandardButton>
  ),
  
  Next: (props) => (
    <StandardButton variant="primary" endIcon="→" {...props}>
      Next
    </StandardButton>
  ),
};

export default StandardButton;