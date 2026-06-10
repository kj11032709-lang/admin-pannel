import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import Nav from './nav';
import Main from './main';
import Header from './header';

// ----------------------------------------------------------------------

export default function DashboardLayout({ children }) {
  const [openNav, setOpenNav] = useState(false);
  const [navMini, setNavMini] = useState(true);

  return (
    <>
      <Header onOpenNav={() => setOpenNav(true)} navMini={navMini} />

      <Box
        sx={{
          minHeight: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
        }}
      >
        <Nav
          navMini={navMini}
          onToggleNavMini={() => setNavMini((current) => !current)}
          openNav={openNav}
          onCloseNav={() => setOpenNav(false)}
        />

        <Main navMini={navMini}>{children}</Main>
      </Box>
    </>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node,
};
