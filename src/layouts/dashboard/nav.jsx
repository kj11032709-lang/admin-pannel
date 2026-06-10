/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemButton from '@mui/material/ListItemButton';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useResponsive } from 'src/hooks/use-responsive';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

import { NAV } from './config-layout';
import navConfig from './config-navigation';

export default function Nav({ navMini, onToggleNavMini, openNav, onCloseNav }) {
  const pathname = usePathname();
  const upLg = useResponsive('up', 'lg');

  useEffect(() => {
    if (openNav) {
      onCloseNav();
    }
  }, [pathname]);

  const renderDesktopContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: navMini ? 'center' : 'stretch',
        },
      }}
    >
      <Stack
        direction={navMini ? 'column' : 'row'}
        alignItems="center"
        justifyContent={navMini ? 'center' : 'flex-start'}
        spacing={1}
        sx={{ px: navMini ? 0 : 2.5, pt: 3, pb: 2 }}
      >
        <Logo sx={navMini ? undefined : { ml: 0.5 }} />
      </Stack>

      {!navMini ? (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 3, pb: 1, pt: 1 }}
        >
          Navigation
        </Typography>
      ) : null}

      <Stack component="nav" spacing={1} sx={{ px: navMini ? 1.5 : 2 }}>
        {navConfig.map((item) => (
          <NavItem key={item.title} item={item} expanded={!navMini} />
        ))}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />
    </Scrollbar>
  );

  const renderMobileContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 3, pb: 2 }}>
        <Logo />
        <IconButton onClick={onCloseNav}>
          <Iconify icon="eva:close-fill" />
        </IconButton>
      </Stack>

      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 3, pb: 1, pt: 1 }}
      >
        Navigation
      </Typography>

      <Stack component="nav" spacing={0.5} sx={{ px: 2 }}>
        {navConfig.map((item) => (
          <NavItem key={item.title} item={item} expanded />
        ))}
      </Stack>
    </Scrollbar>
  );

  return (
    <Box
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: navMini ? NAV.MINI_WIDTH : NAV.WIDTH },
        transition: (theme) =>
          theme.transitions.create('width', {
            duration: theme.transitions.duration.shorter,
          }),
      }}
    >
      {upLg ? (
        <Box
          sx={{
            height: 1,
            position: 'fixed',
            width: navMini ? NAV.MINI_WIDTH : NAV.WIDTH,
            borderRight: (theme) => `dashed 1px ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            overflow: 'visible',
            transition: (theme) =>
              theme.transitions.create('width', {
                duration: theme.transitions.duration.shorter,
              }),
          }}
        >
          <IconButton
            onClick={onToggleNavMini}
            sx={{
              position: 'absolute',
              top: 20,
              right: -16,
              zIndex: 2,
              width: 32,
              height: 32,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
              '&:hover': {
                bgcolor: 'background.paper',
              },
            }}
          >
            <Iconify icon={navMini ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-back-fill'} width={16} />
          </IconButton>

          {renderDesktopContent}
        </Box>
      ) : (
        <Drawer
          open={openNav}
          onClose={onCloseNav}
          PaperProps={{
            sx: {
              width: NAV.WIDTH,
            },
          }}
        >
          {renderMobileContent}
        </Drawer>
      )}
    </Box>
  );
}

Nav.propTypes = {
  navMini: PropTypes.bool,
  onCloseNav: PropTypes.func,
  onToggleNavMini: PropTypes.func,
  openNav: PropTypes.bool,
};

function NavItem({ item, expanded = false }) {
  const pathname = usePathname();
  const active = item.path === pathname;

  const content = (
    <ListItemButton
      component={RouterLink}
      href={item.path}
      sx={{
        minHeight: 48,
        minWidth: expanded ? 'auto' : 48,
        px: expanded ? 1.75 : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: 1.5,
        typography: 'body2',
        color: 'text.secondary',
        textTransform: 'capitalize',
        fontWeight: 'fontWeightMedium',
        ...(active && {
          color: 'primary.main',
          fontWeight: 'fontWeightSemiBold',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          '&:hover': {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
          },
        }),
      }}
    >
      <Box
        component="span"
        sx={{
          width: 24,
          height: 24,
          mr: expanded ? 2 : 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.icon}
      </Box>

      {expanded ? <Box component="span">{item.title}</Box> : null}
    </ListItemButton>
  );

  if (expanded) {
    return content;
  }

  return (
    <Tooltip title={item.title} placement="right">
      {content}
    </Tooltip>
  );
}

NavItem.propTypes = {
  expanded: PropTypes.bool,
  item: PropTypes.object,
};
