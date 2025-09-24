import React from 'react';
import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => {
  return (
    <MuiGlobalStyles
      styles={(theme) => ({
        // Ensure consistent box model
        '*': {
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
        },
        
        // HTML and body styles
        'html, body': {
          height: '100%',
          width: '100%',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.fontSize,
          lineHeight: theme.typography.body1.lineHeight,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.default,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        
        // Root element
        '#root': {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        
        // Consistent scrollbar styling
        '::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '::-webkit-scrollbar-track': {
          background: theme.palette.grey[100],
          borderRadius: 4,
        },
        '::-webkit-scrollbar-thumb': {
          background: theme.palette.grey[400],
          borderRadius: 4,
          '&:hover': {
            background: theme.palette.grey[500],
          },
        },
        
        // Consistent link styling
        'a': {
          color: theme.palette.primary.main,
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
        
        // Consistent form element styling
        'input, textarea, select': {
          fontFamily: 'inherit',
          fontSize: 'inherit',
        },
        
        // Consistent button cursor
        'button': {
          cursor: 'pointer',
        },
        
        // Disable text selection on UI elements
        '.no-select': {
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        },
        
        // Consistent card hover effects
        '.card-hover': {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          },
        },
        
        // Consistent animation for pulse effect
        '@keyframes pulse': {
          '0%': {
            boxShadow: `0 0 0 0 ${theme.palette.primary.main}40`,
          },
          '70%': {
            boxShadow: `0 0 0 10px ${theme.palette.primary.main}00`,
          },
          '100%': {
            boxShadow: `0 0 0 0 ${theme.palette.primary.main}00`,
          },
        },
        
        '.pulse': {
          animation: 'pulse 2s infinite',
        },
        
        // Consistent fade-in animation
        '@keyframes fadeIn': {
          from: {
            opacity: 0,
            transform: 'translateY(10px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        
        '.fade-in': {
          animation: 'fadeIn 0.3s ease-in',
        },
        
        // Consistent spacing utility classes
        '.mt-1': { marginTop: theme.spacing(1) },
        '.mt-2': { marginTop: theme.spacing(2) },
        '.mt-3': { marginTop: theme.spacing(3) },
        '.mb-1': { marginBottom: theme.spacing(1) },
        '.mb-2': { marginBottom: theme.spacing(2) },
        '.mb-3': { marginBottom: theme.spacing(3) },
        '.p-1': { padding: theme.spacing(1) },
        '.p-2': { padding: theme.spacing(2) },
        '.p-3': { padding: theme.spacing(3) },
        
        // Consistent text utility classes
        '.text-center': { textAlign: 'center' },
        '.text-right': { textAlign: 'right' },
        '.text-left': { textAlign: 'left' },
        '.font-bold': { fontWeight: 600 },
        '.font-medium': { fontWeight: 500 },
        '.font-normal': { fontWeight: 400 },
        
        // Consistent flex utility classes
        '.flex': { display: 'flex' },
        '.flex-col': { flexDirection: 'column' },
        '.flex-row': { flexDirection: 'row' },
        '.items-center': { alignItems: 'center' },
        '.justify-center': { justifyContent: 'center' },
        '.justify-between': { justifyContent: 'space-between' },
        '.gap-1': { gap: theme.spacing(1) },
        '.gap-2': { gap: theme.spacing(2) },
        '.gap-3': { gap: theme.spacing(3) },
        
        // Consistent width utility classes
        '.w-full': { width: '100%' },
        '.h-full': { height: '100%' },
        
        // Consistent overflow utility classes
        '.overflow-auto': { overflow: 'auto' },
        '.overflow-hidden': { overflow: 'hidden' },
        '.overflow-scroll': { overflow: 'scroll' },
        
        // Consistent monospace font for code/logs
        '.monospace': {
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.875rem',
        },
        
        // Ensure all pages have consistent padding
        '.page-container': {
          padding: theme.spacing(3),
          height: '100%',
          overflow: 'auto',
        },
        
        // Consistent header style across all pages
        '.page-header': {
          marginBottom: theme.spacing(3),
        },
        
        '.page-title': {
          fontSize: '2rem',
          fontWeight: 600,
          color: theme.palette.text.primary,
          marginBottom: theme.spacing(1),
        },
        
        '.page-subtitle': {
          fontSize: '1rem',
          color: theme.palette.text.secondary,
        },
        
        // Consistent card styles
        '.metric-card': {
          height: '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          },
        },
        
        // Consistent status colors
        '.status-healthy': { color: theme.palette.success.main },
        '.status-warning': { color: theme.palette.warning.main },
        '.status-error': { color: theme.palette.error.main },
        '.status-info': { color: theme.palette.info.main },
        
        // Consistent log level colors
        '.log-info': { color: theme.palette.info.main },
        '.log-warning': { color: theme.palette.warning.main },
        '.log-error': { color: theme.palette.error.main },
        '.log-success': { color: theme.palette.success.main },
        
        // Fix for Material-UI accordion
        '.MuiAccordion-root': {
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 !important',
          },
        },
        
        // Consistent table styles
        '.data-table': {
          '& .MuiTableHead-root': {
            backgroundColor: theme.palette.grey[50],
          },
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: theme.palette.text.secondary,
            borderBottom: `2px solid ${theme.palette.divider}`,
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        },
        
        // Consistent chart container
        '.chart-container': {
          height: 300,
          width: '100%',
          padding: theme.spacing(2),
        },
        
        // Print styles
        '@media print': {
          '.no-print': {
            display: 'none !important',
          },
        },
      })}
    />
  );
};

export default GlobalStyles;