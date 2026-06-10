/* eslint-disable react-hooks/exhaustive-deps, no-void */
import PropTypes from 'prop-types';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { apiRequest } from 'src/utils/api';

import { useAuth } from 'src/context/auth-context';

import Scrollbar from 'src/components/scrollbar';

import AppWidgetSummary from 'src/sections/overview/app-widget-summary';

export default function UserView() {
  const { token, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    void loadUserMaster();
  }, []);

  async function loadUserMaster() {
    setLoading(true);
    setError('');

    try {
      const payload = await apiRequest('/api/admin/user-master', { token });
      setSummary(payload.data?.summary || null);
      setItems(payload.data?.items || []);
    } catch (fetchError) {
      if (fetchError.message.toLowerCase().includes('token')) {
        logout();
      }
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const typeFilteredItems = items.filter((item) => {
      if (activeFilter === 'registered') {
        return item.account_type === 'registered';
      }

      if (activeFilter === 'active_trials') {
        return item.account_type === 'trial' && item.trial_status === 'active';
      }

      if (activeFilter === 'expired_trials') {
        return item.account_type === 'trial' && item.trial_status === 'expired';
      }

      return true;
    });

    if (!query) {
      return typeFilteredItems;
    }

    return typeFilteredItems.filter((item) =>
      [item.full_name, item.phone_number, item.email, item.account_type, item.device_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [activeFilter, items, search]);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, width: 1 }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4" sx={{ mb: 1 }}>
            User Master
          </Typography>
          <Typography variant="body1" color="text.secondary">
            See all registered and trial users in one place, including trial status and days left.
          </Typography>
        </div>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={3}>
            <FilterSummaryCard
              active={activeFilter === 'all'}
              borderColor="primary.main"
              onClick={() => setActiveFilter('all')}
            >
              <AppWidgetSummary
                title="Total Users"
                total={loading ? 0 : summary?.total_users || 0}
                color="primary"
                icon={<img alt="users" src="/assets/icons/glass/ic_glass_users.png" />}
              />
            </FilterSummaryCard>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <FilterSummaryCard
              active={activeFilter === 'registered'}
              borderColor="success.main"
              onClick={() => setActiveFilter('registered')}
            >
              <AppWidgetSummary
                title="Registered Users"
                total={loading ? 0 : summary?.registered_users || 0}
                color="success"
                icon={<img alt="registered" src="/assets/icons/glass/ic_glass_buy.png" />}
              />
            </FilterSummaryCard>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <FilterSummaryCard
              active={activeFilter === 'active_trials'}
              borderColor="warning.main"
              onClick={() => setActiveFilter('active_trials')}
            >
              <AppWidgetSummary
                title="Active Trials"
                total={loading ? 0 : summary?.active_trials || 0}
                color="warning"
                icon={<img alt="active trials" src="/assets/icons/glass/ic_glass_bag.png" />}
              />
            </FilterSummaryCard>
          </Grid>

          <Grid xs={12} sm={6} md={3}>
            <FilterSummaryCard
              active={activeFilter === 'expired_trials'}
              borderColor="error.main"
              onClick={() => setActiveFilter('expired_trials')}
            >
              <AppWidgetSummary
                title="Expired Trials"
                total={loading ? 0 : summary?.expired_trials || 0}
                color="error"
                icon={<img alt="expired trials" src="/assets/icons/glass/ic_glass_message.png" />}
              />
            </FilterSummaryCard>
          </Grid>
        </Grid>

        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 3 }}
          >
            <div>
              <Typography variant="subtitle1">{filteredUsers.length} users</Typography>
              <Typography variant="body2" color="text.secondary">
                Search by name, phone, email, account type, or device ID.
              </Typography>
              <Typography variant="caption" color="primary.main">
                {getFilterLabel(activeFilter)}
              </Typography>
            </div>

            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              sx={{ minWidth: { md: 320 } }}
            />
          </Stack>

          {isMobile ? (
            <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
              {loading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <CircularProgress size={26} />
                </Stack>
              ) : null}

              {!loading && !filteredUsers.length ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No users found.
                  </Typography>
                </Box>
              ) : null}

              {!loading &&
                filteredUsers.map((item) => (
                  <Card key={item.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1">{item.full_name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.phone_number || item.email || '-'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                          <Chip
                            label={item.account_type === 'trial' ? 'Trial' : 'Registered'}
                            color={item.account_type === 'trial' ? 'warning' : 'success'}
                            size="small"
                          />
                          <Chip
                            label={item.is_active ? 'Active' : 'Inactive'}
                            color={item.is_active ? 'primary' : 'default'}
                            variant="outlined"
                            size="small"
                          />
                        </Stack>
                      </Stack>

                      <InfoRow label="Email" value={item.email || '-'} />
                      <InfoRow label="Device" value={item.device_id || '-'} />
                      <InfoRow label="Pregnancy" value={formatPregnancy(item)} />
                      <InfoRow label="Due date" value={formatDate(item.due_date)} />
                      {item.account_type === 'trial' ? (
                        <InfoRow
                          label="Trial"
                          value={
                            item.trial_status === 'active' ? `${item.trial_days_left} day(s) left` : 'Expired'
                          }
                        />
                      ) : null}
                    </Stack>
                  </Card>
                ))}
            </Stack>
          ) : (
            <Scrollbar>
              <Table sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pregnancy</TableCell>
                    <TableCell>Trial</TableCell>
                    <TableCell>Device</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={26} />
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!loading && !filteredUsers.length ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No users found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!loading &&
                    filteredUsers.map((item) => (
                      <TableRow hover key={item.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{item.full_name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Joined {formatDateTime(item.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.phone_number || '-'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.email || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.account_type === 'trial' ? 'Trial' : 'Registered'}
                            color={item.account_type === 'trial' ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.is_active ? 'Active' : 'Inactive'}
                            color={item.is_active ? 'primary' : 'default'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatPregnancy(item)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Due {formatDate(item.due_date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.account_type === 'trial' ? (
                            <>
                              <Typography variant="body2">
                                {item.trial_status === 'active' ? 'Active trial' : 'Expired trial'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.trial_status === 'active'
                                  ? `${item.trial_days_left} day(s) left`
                                  : formatDateTime(item.trial_expires_at)}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Not applicable
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.device_id || '-'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {[item.device_type, item.app_version].filter(Boolean).join(' | ') || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </Card>
      </Stack>
    </Box>
  );
}

function FilterSummaryCard({ active, borderColor, onClick, children }) {
  return (
    <Box sx={{ cursor: 'pointer' }} onClick={onClick}>
      <Card
        variant={active ? 'elevation' : 'outlined'}
        sx={{
          borderRadius: 2,
          borderColor: active ? borderColor : 'divider',
          boxShadow: active ? 8 : 'none',
        }}
      >
        {children}
      </Card>
    </Box>
  );
}

FilterSummaryCard.propTypes = {
  active: PropTypes.bool,
  borderColor: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
};

function InfoRow({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72, pt: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatPregnancy(item) {
  if (!item.current_week && !item.current_day) {
    return '-';
  }

  return `Week ${item.current_week || '-'} | Day ${item.current_day || '-'}`;
}

function getFilterLabel(activeFilter) {
  if (activeFilter === 'registered') {
    return 'Showing registered users';
  }

  if (activeFilter === 'active_trials') {
    return 'Showing active trial users';
  }

  if (activeFilter === 'expired_trials') {
    return 'Showing expired trial users';
  }

  return 'Showing all users';
}
