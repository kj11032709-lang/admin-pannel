/* eslint-disable react-hooks/exhaustive-deps, no-void, no-restricted-syntax */
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { apiRequest, extractCollection } from 'src/utils/api';

import { useAuth } from 'src/context/auth-context';

import AppWidgetSummary from '../app-widget-summary';

export default function AppView() {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [eventsPayload, activitiesPayload, rulesPayload, usersPayload] = await Promise.all([
        apiRequest('/api/admin/events', { token }),
        apiRequest('/api/activities', { token }),
        apiRequest('/api/activity-rules', { token }),
        apiRequest('/api/sys-users', { token }),
      ]);

      setEvents(extractCollection(eventsPayload));
      setActivities(extractCollection(activitiesPayload));
      setRules(extractCollection(rulesPayload));
      setUsers(extractCollection(usersPayload));
      console.log(extractCollection(usersPayload))
    } catch (fetchError) {
      if (fetchError.message.toLowerCase().includes('token')) {
        logout();
      }

      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const activeEvents = events.filter((item) => item.is_active).length;
    const activityLibrary = activities.length;
    const coveredDays = new Set();

    for (const rule of rules) {
      const startDay = Number(rule.start_day) || 0;
      const endDay = Number(rule.end_day) || 0;

      for (let day = startDay; day <= endDay; day += 1) {
        coveredDays.add(day);
      }
    }

    return {
      activeEvents,
      activityLibrary,
      coveredDays: coveredDays.size,
    };
  }, [activities, events, rules]);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, width: 1 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <div>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              See the latest event and activity planning status at a glance.
            </Typography>
          </div>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} href="/events" variant="contained" color="inherit">
              Event Master
            </Button>
            <Button component={RouterLink} href="/planner" variant="outlined" color="inherit">
              Activity Planner
            </Button>
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={4}>
            <AppWidgetSummary
              title="Active Events"
              total={loading ? 0 : stats.activeEvents}
              color="success"
              icon={<img alt="events" src="/assets/icons/glass/ic_glass_bag.png" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4}>
            <AppWidgetSummary
              title="Activity Library"
              total={loading ? 0 : stats.activityLibrary}
              color="info"
              icon={<img alt="activities" src="/assets/icons/glass/ic_glass_users.png" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4}>
            <AppWidgetSummary
              title="Planned Days"
              total={loading ? 0 : stats.coveredDays}
              color="warning"
              icon={<img alt="planned days" src="/assets/icons/glass/ic_glass_buy.png" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4}>
            <AppWidgetSummary
              title="Total Users"
              total={loading ? 0 : users.length}
              color="warning"
              icon={<img alt="total users " src="/assets/icons/glass/ic_glass_buy.png" />}
            />
          </Grid>

          <Grid xs={12} sm={6} md={4}>
            <AppWidgetSummary
              title="Trial Users"
              total={loading ? 0 : users.filter((user) => user.full_name === 'Trial User').length}
              color="warning"
              icon={<img alt="trial users " src="/assets/icons/glass/ic_glass_buy.png" />}
            />
          </Grid>

          <Grid xs={12}>
            <Card sx={{ p: 4, minHeight: 260 }}>
              <Typography variant="overline" color="primary.main">
                Reserved
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, mb: 1.5 }}>
                Empty dashboard section
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Keeping this space empty for now. We can later add participant trends,
                reminders, recent registrations, or operational insights here.
              </Typography>
              <Typography variant="body2" sx={{ mt: 3 }}>
                Quick links:{' '}
                <Link component={RouterLink} href="/events" underline="hover">
                  Manage events
                </Link>{' '}
                and{' '}
                <Link component={RouterLink} href="/planner" underline="hover">
                  open the activity planner
                </Link>
                .
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
