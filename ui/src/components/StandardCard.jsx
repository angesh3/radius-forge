// Standardized Card Component - RadiusForge
// Created by: Component Standardization Agent (CSA)
// Sprint 1: Component Foundation
// Replaces all card variations with consistent implementation

import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  CardActions,
  CardMedia,
  Typography,
  IconButton,
  Box,
  Skeleton,
  Chip,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { MoreVert as MoreIcon } from '@mui/icons-material';
import designSystem from '../theme/designSystem';

const { spacing, borderRadius, colors, elevation, animation } = designSystem;

// Base styled card with consistent design
const StyledCard = styled(MuiCard)(({ theme, variant, noPadding, interactive, selected }) => ({
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.gray[200]}`,
  boxShadow: selected ? elevation[4] : elevation[2],
  transition: theme.transitions.create(
    ['box-shadow', 'transform', 'border-color'],
    { duration: animation.duration.short }
  ),
  overflow: 'visible',
  
  ...(interactive && {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: elevation[6],
      borderColor: colors.primary[500],
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: elevation[2],
    },
  }),
  
  ...(selected && {
    borderColor: colors.primary[500],
    borderWidth: 2,
  }),
  
  ...(variant === 'outlined' && {
    boxShadow: 'none',
    border: `2px solid ${colors.gray[300]}`,
  }),
  
  ...(variant === 'elevated' && {
    boxShadow: elevation[6],
    border: 'none',
  }),
  
  ...(variant === 'flat' && {
    boxShadow: 'none',
    border: 'none',
    backgroundColor: colors.gray[50],
  }),
  
  ...(noPadding && {
    '& .MuiCardContent-root': {
      padding: 0,
      '&:last-child': {
        paddingBottom: 0,
      },
    },
  }),
}));

// Consistent card header styling
const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderBottom: `1px solid ${colors.gray[200]}`,
  '& .MuiCardHeader-title': {
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.fontWeightSemibold,
    color: colors.text.primary,
  },
  '& .MuiCardHeader-subheader': {
    fontSize: theme.typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
}));

// Consistent card content styling
const StyledCardContent = styled(CardContent)(({ theme, dense }) => ({
  padding: dense ? spacing.md : spacing.lg,
  '&:last-child': {
    paddingBottom: dense ? spacing.md : spacing.lg,
  },
}));

// Consistent card actions styling
const StyledCardActions = styled(CardActions)(({ theme, align }) => ({
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderTop: `1px solid ${colors.gray[200]}`,
  justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'space-between',
  gap: spacing.sm,
}));

// Status indicator component
const StatusIndicator = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return colors.success.main;
      case 'warning': return colors.warning.main;
      case 'error': return colors.error.main;
      case 'info': return colors.info.main;
      default: return colors.gray[500];
    }
  };
  
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        boxShadow: `0 0 0 2px ${getStatusColor()}20`,
      }}
    />
  );
};

/**
 * StandardCard Component
 * 
 * A consistent card component that replaces all card variations
 * 
 * @param {Object} props
 * @param {string} props.variant - 'default' | 'outlined' | 'elevated' | 'flat'
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Card subtitle
 * @param {ReactNode} props.action - Action element for header
 * @param {ReactNode} props.media - Media element (image/video)
 * @param {string} props.mediaHeight - Height of media element
 * @param {ReactNode} props.children - Card content
 * @param {ReactNode} props.actions - Card action buttons
 * @param {string} props.actionsAlign - 'left' | 'right' | 'space-between'
 * @param {boolean} props.loading - Show loading state
 * @param {boolean} props.interactive - Make card interactive (hover/click)
 * @param {boolean} props.selected - Selected state
 * @param {string} props.status - 'success' | 'warning' | 'error' | 'info'
 * @param {Array} props.badges - Array of badge objects {label, color}
 * @param {boolean} props.dense - Use dense padding
 * @param {boolean} props.noPadding - Remove all padding
 * @param {boolean} props.noHeader - Hide header section
 * @param {boolean} props.noDivider - Remove dividers
 * @param {Function} props.onClick - Click handler
 * @param {string} props.ariaLabel - Accessibility label
 * @param {Object} props.sx - Additional styles
 */
const StandardCard = ({
  variant = 'default',
  title,
  subtitle,
  action,
  media,
  mediaHeight = 140,
  children,
  actions,
  actionsAlign = 'right',
  loading = false,
  interactive = false,
  selected = false,
  status,
  badges = [],
  dense = false,
  noPadding = false,
  noHeader = false,
  noDivider = false,
  onClick,
  onActionClick,
  ariaLabel,
  className,
  sx,
  ...otherProps
}) => {
  
  const handleClick = (e) => {
    if (interactive && onClick) {
      onClick(e);
    }
  };
  
  const handleActionClick = (e) => {
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(e);
    }
  };
  
  // Loading skeleton
  if (loading) {
    return (
      <StyledCard variant={variant} sx={sx} {...otherProps}>
        {!noHeader && (title || subtitle) && (
          <StyledCardHeader
            title={<Skeleton width="60%" />}
            subheader={subtitle && <Skeleton width="40%" />}
          />
        )}
        <StyledCardContent dense={dense}>
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </StyledCardContent>
        {actions && (
          <StyledCardActions align={actionsAlign}>
            <Skeleton variant="rectangular" width={80} height={36} />
            <Skeleton variant="rectangular" width={80} height={36} />
          </StyledCardActions>
        )}
      </StyledCard>
    );
  }
  
  return (
    <StyledCard
      variant={variant}
      interactive={interactive}
      selected={selected}
      noPadding={noPadding}
      onClick={handleClick}
      className={className}
      sx={sx}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel || title}
      aria-pressed={selected}
      {...otherProps}
    >
      {/* Header Section */}
      {!noHeader && (title || subtitle || action || status || badges.length > 0) && (
        <StyledCardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              {status && <StatusIndicator status={status} />}
              <Typography variant="h6" component="div" sx={{ flex: 1 }}>
                {title}
              </Typography>
              {badges.map((badge, index) => (
                <Chip
                  key={index}
                  label={badge.label}
                  size="small"
                  color={badge.color || 'default'}
                  variant={badge.variant || 'filled'}
                />
              ))}
            </Box>
          }
          subheader={subtitle}
          action={
            action || (onActionClick && (
              <IconButton
                size="small"
                onClick={handleActionClick}
                aria-label="More options"
              >
                <MoreIcon />
              </IconButton>
            ))
          }
        />
      )}
      
      {/* Media Section */}
      {media && (
        <CardMedia
          component={typeof media === 'string' ? 'img' : 'div'}
          height={mediaHeight}
          image={typeof media === 'string' ? media : undefined}
          sx={{ borderBottom: !noDivider ? `1px solid ${colors.gray[200]}` : undefined }}
        >
          {typeof media !== 'string' && media}
        </CardMedia>
      )}
      
      {/* Content Section */}
      {children && (
        <StyledCardContent dense={dense}>
          {children}
        </StyledCardContent>
      )}
      
      {/* Actions Section */}
      {actions && (
        <>
          {!noDivider && <Divider />}
          <StyledCardActions align={actionsAlign}>
            {actions}
          </StyledCardActions>
        </>
      )}
    </StyledCard>
  );
};

// Export card variants as presets
export const CardPresets = {
  // Metric card for dashboard
  Metric: ({ label, value, change, icon, ...props }) => (
    <StandardCard dense {...props}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.5 }}>
            {value}
          </Typography>
          {change && (
            <Typography
              variant="caption"
              sx={{
                color: change > 0 ? colors.success.main : colors.error.main,
                mt: 0.5,
                display: 'block',
              }}
            >
              {change > 0 ? '+' : ''}{change}%
            </Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ fontSize: 40, color: colors.primary[500], opacity: 0.3 }}>
            {icon}
          </Box>
        )}
      </Box>
    </StandardCard>
  ),
  
  // List item card
  ListItem: ({ primary, secondary, avatar, action, ...props }) => (
    <StandardCard variant="outlined" noPadding interactive {...props}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: spacing.md }}>
        {avatar && (
          <Box sx={{ mr: spacing.md }}>
            {avatar}
          </Box>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {primary}
          </Typography>
          {secondary && (
            <Typography variant="body2" color="text.secondary">
              {secondary}
            </Typography>
          )}
        </Box>
        {action && (
          <Box sx={{ ml: spacing.md }}>
            {action}
          </Box>
        )}
      </Box>
    </StandardCard>
  ),
  
  // Empty state card
  EmptyState: ({ title, description, action, icon, ...props }) => (
    <StandardCard variant="flat" {...props}>
      <Box sx={{ textAlign: 'center', py: spacing.xl }}>
        {icon && (
          <Box sx={{ fontSize: 64, color: colors.gray[400], mb: spacing.md }}>
            {icon}
          </Box>
        )}
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        {action && (
          <Box sx={{ mt: spacing.lg }}>
            {action}
          </Box>
        )}
      </Box>
    </StandardCard>
  ),
};

export default StandardCard;