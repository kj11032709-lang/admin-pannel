import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { useResponsive } from 'src/hooks/use-responsive';

import { bgBlur } from 'src/theme/css';

import Iconify from 'src/components/iconify';

import { NAV, HEADER } from './config-layout';
import AccountPopover from './common/account-popover';

// ----------------------------------------------------------------------

export default function Header({ onOpenNav, navMini }) {
  const theme = useTheme();

  const lgUp = useResponsive('up', 'lg');

  const renderContent = (
    <>
      {!lgUp && (
        <IconButton
          aria-label="Open navigation menu"
          onClick={onOpenNav}
          sx={{
            mr: 1.5,
            width: 42,
            height: 42,
            border: (currentTheme) => `1px solid ${currentTheme.palette.divider}`,
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[2],
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <Iconify icon="eva:menu-2-fill" width={24} />
        </IconButton>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <AccountPopover />
    </>
  );

  return (
    <AppBar
      sx={{
        boxShadow: 'none',
        height: HEADER.H_MOBILE,
        zIndex: theme.zIndex.appBar + 1,
        ...bgBlur({
          color: theme.palette.background.default,
        }),
        transition: theme.transitions.create(['height'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...(lgUp && {
          width: `calc(100% - ${(navMini ? NAV.MINI_WIDTH : NAV.WIDTH) + 1}px)`,
          height: HEADER.H_DESKTOP,
        }),
      }}
    >
      <Toolbar
        sx={{
          height: 1,
          px: { xs: 2, sm: 3, lg: 5 },
        }}
      >
        {renderContent}
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  navMini: PropTypes.bool,
  onOpenNav: PropTypes.func,
};
