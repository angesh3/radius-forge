import React from 'react';
import { Box, Typography } from '@mui/material';

const Logo = ({ variant = 'full', size = 'medium', color = 'primary' }) => {
  const sizes = {
    small: {
      iconSize: 24,
      fontSize: '1rem',
      gap: 1
    },
    medium: {
      iconSize: 32,
      fontSize: '1.25rem',
      gap: 1.5
    },
    large: {
      iconSize: 40,
      fontSize: '1.5rem',
      gap: 2
    }
  };

  const { iconSize, fontSize, gap } = sizes[size];

  const RadiusForgeIcon = ({ size, color }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring representing network radius */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke={color === 'primary' ? '#1565C0' : '#37474F'}
        strokeWidth="2"
        fill="none"
      />
      
      {/* Inner rings representing multiple authentication layers */}
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke={color === 'primary' ? '#42A5F5' : '#546E7A'}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="2 2"
      />
      
      <circle
        cx="16"
        cy="16"
        r="6"
        stroke={color === 'primary' ? '#1565C0' : '#37474F'}
        strokeWidth="1"
        fill="none"
      />
      
      {/* Central forge/anvil symbol */}
      <path
        d="M12 14 L20 14 L20 18 L18 18 L18 20 L14 20 L14 18 L12 18 Z"
        fill={color === 'primary' ? '#1565C0' : '#37474F'}
      />
      
      {/* Hammer striking the anvil - representing "forging" */}
      <path
        d="M10 10 L14 14 L12 16 L8 12 Z"
        fill={color === 'primary' ? '#F57C00' : '#FF9800'}
      />
      
      {/* Sparks from forging */}
      <circle cx="22" cy="10" r="1" fill={color === 'primary' ? '#F57C00' : '#FF9800'} />
      <circle cx="24" cy="12" r="0.5" fill={color === 'primary' ? '#F57C00' : '#FF9800'} />
      <circle cx="23" cy="8" r="0.5" fill={color === 'primary' ? '#F57C00' : '#FF9800'} />
      
      {/* Data flow lines */}
      <path
        d="M4 16 L8 16"
        stroke={color === 'primary' ? '#2E7D32' : '#4CAF50'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 16 L28 16"
        stroke={color === 'primary' ? '#2E7D32' : '#4CAF50'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 4 L16 8"
        stroke={color === 'primary' ? '#2E7D32' : '#4CAF50'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 24 L16 28"
        stroke={color === 'primary' ? '#2E7D32' : '#4CAF50'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <RadiusForgeIcon size={iconSize} color={color} />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: gap,
        userSelect: 'none',
        cursor: 'default'
      }}
    >
      <RadiusForgeIcon size={iconSize} color={color} />
      {variant === 'full' && (
        <Typography
          variant="h6"
          component="span"
          sx={{
            fontSize: fontSize,
            fontWeight: 700,
            color: color === 'primary' ? 'primary.main' : 'secondary.main',
            background: color === 'primary' 
              ? 'linear-gradient(45deg, #1565C0 30%, #42A5F5 90%)'
              : 'linear-gradient(45deg, #37474F 30%, #546E7A 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}
        >
          RadiusForge
        </Typography>
      )}
    </Box>
  );
};

export default Logo;