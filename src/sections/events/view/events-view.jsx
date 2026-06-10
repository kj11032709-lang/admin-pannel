/* eslint-disable react-hooks/exhaustive-deps, react/jsx-no-bind, no-void, no-nested-ternary */
import PropTypes from 'prop-types';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { apiRequest, extractCollection } from 'src/utils/api';

import { useAuth } from 'src/context/auth-context';

import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

const initialForm = {
  title: '',
  description: '',
  event_date: '',
  start_time: '',
  end_time: '',
  program_name: '',
  address: '',
  state: '',
  city: '',
  pincode: '',
  gallery: '',
  role: '',
  legacy_user_id: '',
  remark: '',
  contact_person: '',
  webinar_url: '',
  webinar_password: '',
  status: 'Active',
  comment_reply: '',
  join_link: '',
};

export default function EventsView() {
  const { token, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuEvent, setMenuEvent] = useState(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [eventsPayload, registrationsPayload, usersPayload] = await Promise.all([
        apiRequest('/api/admin/events', { token }),
        apiRequest('/api/event-registrations', { token }),
        apiRequest('/api/sys-users', { token }),
      ]);

      setEvents(
        extractCollection(eventsPayload).sort(
          (left, right) => new Date(right.event_date || 0) - new Date(left.event_date || 0)
        )
      );
      setRegistrations(extractCollection(registrationsPayload));
      setUsers(extractCollection(usersPayload));
    } catch (fetchError) {
      if (fetchError.message.toLowerCase().includes('token')) {
        logout();
      }
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }

  const registrationMap = useMemo(() => {
    const map = new Map();

    registrations.forEach((registration) => {
      const current = map.get(registration.event_id) || [];
      current.push(registration);
      map.set(registration.event_id, current);
    });

    return map;
  }, [registrations]);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return events;
    }

    return events.filter((item) =>
      [
        item.title,
        item.description,
        item.program_name,
        item.address,
        item.city,
        item.state,
        item.contact_person,
        item.webinar_url,
        item.join_link,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [events, search]);

  const selectedParticipants = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }

    return (registrationMap.get(selectedEvent.id) || []).map((registration) => ({
      registration,
      user: userMap.get(registration.user_id) || null,
    }));
  }, [registrationMap, selectedEvent, userMap]);

  function openCreate() {
    setEditingId('');
    setForm(initialForm);
    setFormOpen(true);
  }

  function openEdit(eventItem) {
    setEditingId(eventItem.id);
    setForm({
      title: eventItem.title || '',
      description: eventItem.description || '',
      event_date: toDateInputValue(eventItem.event_date),
      start_time: toTimeInputValue(eventItem.start_time),
      end_time: toTimeInputValue(eventItem.end_time),
      program_name: eventItem.program_name || '',
      address: eventItem.address || '',
      state: eventItem.state || '',
      city: eventItem.city || '',
      pincode: eventItem.pincode || '',
      gallery: eventItem.gallery || '',
      role: eventItem.role || '',
      legacy_user_id: eventItem.legacy_user_id || '',
      remark: eventItem.remark || '',
      contact_person: eventItem.contact_person || '',
      webinar_url: eventItem.webinar_url || '',
      webinar_password: eventItem.webinar_password || '',
      status: eventItem.status || (eventItem.is_active ? 'Active' : 'Closed'),
      comment_reply: eventItem.comment_reply || '',
      join_link: eventItem.join_link || '',
    });
    closeMenu();
    setFormOpen(true);
  }

  function openDetails(eventItem) {
    setSelectedEvent(eventItem);
    closeMenu();
    setDetailsOpen(true);
  }

  function openParticipants(eventItem) {
    setSelectedEvent(eventItem);
    closeMenu();
    setParticipantsOpen(true);
  }

  function openMenu(currentEvent, clickEvent) {
    setMenuEvent(currentEvent);
    setAnchorEl(clickEvent.currentTarget);
  }

  function closeMenu() {
    setAnchorEl(null);
    setMenuEvent(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest(editingId ? `/api/admin/events/${editingId}` : '/api/admin/events', {
        token,
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(buildEventPayload(form)),
      });

      setFormOpen(false);
      setEditingId('');
      setForm(initialForm);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseEvent(eventItem) {
    try {
      await apiRequest(`/api/admin/events/${eventItem.id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ is_active: false, status: 'Closed' }),
      });
      closeMenu();
      await loadData();
    } catch (closeError) {
      setError(closeError.message);
    }
  }

  async function handleDeleteEvent(eventItem) {
    try {
      await apiRequest(`/api/admin/events/${eventItem.id}`, {
        token,
        method: 'DELETE',
      });
      closeMenu();
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const submitDisabled = submitting || !form.title.trim() || !form.description.trim() || !form.event_date.trim();

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, width: 1 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <div>
            <Typography variant="h4" sx={{ mb: 1 }}>
              Event Master
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View all event details, inspect registrations, and manage webinar or on-ground sessions.
            </Typography>
          </div>

          <Button
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="eva:plus-fill" />}
            onClick={openCreate}
          >
            Register New Event
          </Button>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 3 }}
          >
            <div>
              <Typography variant="subtitle1">{filteredEvents.length} events</Typography>
              <Typography variant="body2" color="text.secondary">
                Search through event title, program name, location, contact person, or link fields.
              </Typography>
            </div>

            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events"
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

              {!loading && !filteredEvents.length ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No events found.
                  </Typography>
                </Box>
              ) : null}

              {!loading &&
                filteredEvents.map((eventItem) => (
                  <Card
                    key={eventItem.id}
                    variant="outlined"
                    sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none' }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                            {eventItem.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {eventItem.program_name || eventItem.description || 'No description'}
                          </Typography>
                        </Box>

                        <Button
                          color="inherit"
                          sx={{ minWidth: 40, width: 40, height: 40, p: 0, borderRadius: 2 }}
                          onClick={(clickEvent) => openMenu(eventItem, clickEvent)}
                        >
                          <Iconify icon="eva:more-vertical-fill" />
                        </Button>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={eventItem.status || (eventItem.is_active ? 'Active' : 'Closed')}
                          color={getEventStatusColor(eventItem)}
                          size="small"
                        />
                        <Chip
                          label={`${(registrationMap.get(eventItem.id) || []).length} participants`}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>

                      <Stack spacing={1}>
                        <EventInfo label="Schedule" value={formatSchedule(eventItem)} />
                        <EventInfo label="Location" value={formatLocation(eventItem)} />
                        <EventInfo
                          label="Contact"
                          value={eventItem.contact_person || eventItem.webinar_url || eventItem.join_link || '-'}
                        />
                      </Stack>
                    </Stack>
                  </Card>
                ))}
            </Stack>
          ) : (
            <Scrollbar>
              <Table sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Participants</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={26} />
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!loading && !filteredEvents.length ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No events found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {!loading &&
                    filteredEvents.map((eventItem) => (
                      <TableRow hover key={eventItem.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{eventItem.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {eventItem.program_name || eventItem.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatSchedule(eventItem)}</TableCell>
                        <TableCell>{formatLocation(eventItem)}</TableCell>
                        <TableCell>
                          <Chip
                            label={eventItem.status || (eventItem.is_active ? 'Active' : 'Closed')}
                            color={getEventStatusColor(eventItem)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{(registrationMap.get(eventItem.id) || []).length}</TableCell>
                        <TableCell align="right">
                          <Button
                            color="inherit"
                            onClick={(clickEvent) => openMenu(eventItem, clickEvent)}
                          >
                            <Iconify icon="eva:more-vertical-fill" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Scrollbar>
          )}
        </Card>
      </Stack>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => openDetails(menuEvent)}>Details of event</MenuItem>
        <MenuItem onClick={() => openParticipants(menuEvent)}>Participants of event</MenuItem>
        <MenuItem onClick={() => openEdit(menuEvent)}>Edit event</MenuItem>
        <MenuItem onClick={() => handleCloseEvent(menuEvent)} disabled={!menuEvent?.is_active}>
          Close event
        </MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => handleDeleteEvent(menuEvent)}>
          Delete event
        </MenuItem>
      </Menu>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Update Event' : 'Register New Event'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2.5}>
              <TextField
                label="Event title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Program name"
                  value={form.program_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, program_name: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Status"
                  select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  fullWidth
                >
                  {['Active', 'Closed', 'Draft'].map((statusOption) => (
                    <MenuItem key={statusOption} value={statusOption}>
                      {statusOption}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Program details"
                multiline
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Event date"
                  type="date"
                  value={form.event_date}
                  onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Start time"
                  type="time"
                  value={form.start_time}
                  onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End time"
                  type="time"
                  value={form.end_time}
                  onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="State"
                  value={form.state}
                  onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="City"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Pincode"
                  value={form.pincode}
                  onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <TextField
                label="Address"
                multiline
                rows={2}
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Contact person"
                  value={form.contact_person}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact_person: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Role"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Join link"
                  value={form.join_link}
                  onChange={(event) => setForm((current) => ({ ...current, join_link: event.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Webinar URL"
                  value={form.webinar_url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, webinar_url: event.target.value }))
                  }
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Webinar password"
                  value={form.webinar_password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, webinar_password: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Gallery / image path"
                  value={form.gallery}
                  onChange={(event) => setForm((current) => ({ ...current, gallery: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Legacy user ID"
                  value={form.legacy_user_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, legacy_user_id: event.target.value }))
                  }
                  fullWidth
                />
                <TextField
                  label="Remark"
                  value={form.remark}
                  onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
                  fullWidth
                />
              </Stack>

              <TextField
                label="Comment reply"
                value={form.comment_reply}
                onChange={(event) =>
                  setForm((current) => ({ ...current, comment_reply: event.target.value }))
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setFormOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="inherit" disabled={submitDisabled}>
              {submitting ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent dividers>
          {selectedEvent ? (
            <Stack spacing={2}>
              <DetailRow label="Title" value={selectedEvent.title} />
              <DetailRow label="Program name" value={selectedEvent.program_name || '-'} />
              <DetailRow label="Program details" value={selectedEvent.description || '-'} />
              <DetailRow label="Schedule" value={formatSchedule(selectedEvent)} />
              <DetailRow label="Address" value={selectedEvent.address || '-'} />
              <DetailRow label="Location" value={formatLocation(selectedEvent)} />
              <DetailRow label="Contact person" value={selectedEvent.contact_person || '-'} />
              <DetailRow label="Role" value={selectedEvent.role || '-'} />
              <DetailRow label="Join link" value={selectedEvent.join_link || '-'} />
              <DetailRow label="Webinar URL" value={selectedEvent.webinar_url || '-'} />
              <DetailRow label="Webinar password" value={selectedEvent.webinar_password || '-'} />
              <DetailRow label="Gallery" value={selectedEvent.gallery || '-'} />
              <DetailRow label="Remark" value={selectedEvent.remark || '-'} />
              <DetailRow label="Comment reply" value={selectedEvent.comment_reply || '-'} />
              <DetailRow
                label="Status"
                value={selectedEvent.status || (selectedEvent.is_active ? 'Active' : 'Closed')}
              />
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={participantsOpen} onClose={() => setParticipantsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Participants of event</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {!selectedParticipants.length ? (
              <Typography variant="body2" color="text.secondary">
                No participants yet.
              </Typography>
            ) : (
              selectedParticipants.map(({ registration, user }) => (
                <Card key={registration.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2">{user?.full_name || 'Unknown user'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.phone_number || user?.email || registration.user_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Registered at {formatDateTime(registration.registered_at)}
                  </Typography>
                </Card>
              ))
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function EventInfo({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 68, pt: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  );
}

EventInfo.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

function DetailRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

DetailRow.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

function buildEventPayload(form) {
  return {
    ...form,
    event_date: toDateISOString(form.event_date),
    start_time: form.start_time ? toTimeISOString(form.start_time) : null,
    end_time: form.end_time ? toTimeISOString(form.end_time) : null,
    is_active: form.status !== 'Closed',
  };
}

function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toTimeInputValue(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value));
}

function toDateISOString(value) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function toTimeISOString(value) {
  return new Date(`1970-01-01T${value}:00Z`).toISOString();
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

function formatDateOnly(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatTimeValue(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatSchedule(eventItem) {
  const dateLabel = formatDateOnly(eventItem.event_date);
  const timeParts = [formatTimeValue(eventItem.start_time), formatTimeValue(eventItem.end_time)].filter(Boolean);

  return timeParts.length ? `${dateLabel} | ${timeParts.join(' - ')}` : dateLabel;
}

function formatLocation(eventItem) {
  return [eventItem.city, eventItem.state, eventItem.pincode].filter(Boolean).join(', ') || '-';
}

function getEventStatusColor(eventItem) {
  const status = (eventItem.status || '').toLowerCase();

  if (status === 'draft') {
    return 'warning';
  }

  if (status === 'closed' || eventItem.is_active === false) {
    return 'default';
  }

  return 'success';
}
