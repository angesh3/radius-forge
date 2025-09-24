// Responsive Design Utilities - RadiusForge
// Created by: Responsive Design Agent (RDA)
// Sprint 2: Mobile responsiveness fixes

import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { Box, Hidden } from '@mui/material';
import designSystem from '../theme/designSystem';

const { breakpoints } = designSystem;

// Custom hook for responsive breakpoints
export const useResponsive = () => {
  const theme = useTheme();
  
  const isMobile = useMediaQuery(`(max-width:${breakpoints.sm}px)`);
  const isTablet = useMediaQuery(`(min-width:${breakpoints.sm}px) and (max-width:${breakpoints.md}px)`);
  const isDesktop = useMediaQuery(`(min-width:${breakpoints.md}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width:${breakpoints.lg}px)`);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large',
  };
};

// Responsive container component
export const ResponsiveContainer = ({ children, maxWidth = 'lg', ...props }) => {
  const getMaxWidth = () => {
    switch (maxWidth) {
      case 'sm': return breakpoints.sm;
      case 'md': return breakpoints.md;
      case 'lg': return breakpoints.lg;
      case 'xl': return breakpoints.xl;
      default: return breakpoints.lg;
    }
  };
  
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: getMaxWidth(),
        margin: '0 auto',
        padding: {
          xs: 2, // 16px on mobile
          sm: 3, // 24px on tablet
          md: 4, // 32px on desktop
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive grid component
export const ResponsiveGrid = ({ children, columns = { xs: 1, sm: 2, md: 3, lg: 4 }, gap = 2, ...props }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, 1fr)`,
          sm: `repeat(${columns.sm || columns.xs}, 1fr)`,
          md: `repeat(${columns.md || columns.sm || columns.xs}, 1fr)`,
          lg: `repeat(${columns.lg || columns.md || columns.sm || columns.xs}, 1fr)`,
        },
        gap: gap,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive table wrapper
export const ResponsiveTable = ({ children, ...props }) => {
  const { isMobile } = useResponsive();
  
  if (isMobile) {
    return (
      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '& table': {
            minWidth: 600,
          },
          '& th, & td': {
            whiteSpace: 'nowrap',
          },
          ...props.sx,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
  
  return children;
};

// Stack component that changes direction based on screen size
export const ResponsiveStack = ({ children, direction = { xs: 'column', sm: 'row' }, spacing = 2, ...props }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: direction,
        gap: spacing,
        alignItems: {
          xs: direction.xs === 'column' ? 'stretch' : 'center',
          sm: direction.sm === 'row' ? 'center' : 'stretch',
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive text component with size adjustments
export const ResponsiveText = ({ variant = 'body1', children, sizes, ...props }) => {
  const defaultSizes = {
    h1: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
    h2: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
    h3: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
    h4: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
    h5: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
    h6: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
    body1: { xs: '0.875rem', sm: '0.875rem', md: '1rem' },
    body2: { xs: '0.75rem', sm: '0.75rem', md: '0.875rem' },
  };
  
  const finalSizes = sizes || defaultSizes[variant] || defaultSizes.body1;
  
  return (
    <Box
      component="span"
      sx={{
        fontSize: finalSizes,
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Show/Hide components based on breakpoint
export const ShowOnMobile = ({ children }) => (
  <Hidden smUp>{children}</Hidden>
);

export const HideOnMobile = ({ children }) => (
  <Hidden smDown>{children}</Hidden>
);

export const ShowOnTablet = ({ children }) => (
  <Hidden smDown lgUp>{children}</Hidden>
);

export const ShowOnDesktop = ({ children }) => (
  <Hidden mdDown>{children}</Hidden>
);

// Responsive image component
export const ResponsiveImage = ({ src, alt, aspectRatio = '16/9', ...props }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        paddingTop: `calc(100% / (${aspectRatio}))`,
        overflow: 'hidden',
        borderRadius: 1,
        ...props.sx,
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  );
};

// Responsive button group
export const ResponsiveButtonGroup = ({ children, orientation = { xs: 'vertical', sm: 'horizontal' }, ...props }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: {
          xs: orientation.xs === 'vertical' ? 'column' : 'row',
          sm: orientation.sm === 'horizontal' ? 'row' : 'column',
        },
        gap: 1,
        '& > *': {
          flex: {
            xs: orientation.xs === 'vertical' ? '0 0 auto' : '1',
            sm: orientation.sm === 'horizontal' ? '0 0 auto' : '1',
          },
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Touch-friendly list item
export const TouchListItem = ({ children, onClick, ...props }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        minHeight: designSystem.touchTargets.recommended,
        display: 'flex',
        alignItems: 'center',
        padding: 2,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        '&:active': {
          backgroundColor: 'action.selected',
        },
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

// Responsive dialog that becomes full-screen on mobile
export const ResponsiveDialog = ({ children, ...props }) => {
  const { isMobile } = useResponsive();
  
  return React.cloneElement(children, {
    fullScreen: isMobile,
    ...props,
  });
};

// Export all utilities
export default {
  useResponsive,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveTable,
  ResponsiveStack,
  ResponsiveText,
  ShowOnMobile,
  HideOnMobile,
  ShowOnTablet,
  ShowOnDesktop,
  ResponsiveImage,
  ResponsiveButtonGroup,
  TouchListItem,
  ResponsiveDialog,
};