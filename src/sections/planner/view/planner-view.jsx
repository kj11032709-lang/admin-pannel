/* eslint-disable react-hooks/exhaustive-deps, react/jsx-no-bind, no-void, no-nested-ternary */
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { apiRequest, extractCollection } from 'src/utils/api';

import { useAuth } from 'src/context/auth-context';

import Iconify from 'src/components/iconify';

const SESSIONS = ['morning', 'afternoon', 'evening'];
const SESSION_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};
const ACTIVITY_TYPES = [
  'generic',
  'meditation',
  'music',
  'video',
  'audio',
  'text',
  'reading',
  'affirmation',
  'tip',
];
const SUB_ACTIVITY_TYPES = ['text', 'audio', 'video'];
const TRIMESTERS = [
  { id: 1, label: 'Trimester 1', start: 1, end: 93 },
  { id: 2, label: 'Trimester 2', start: 94, end: 186 },
  { id: 3, label: 'Trimester 3', start: 187, end: 280 },
];
const MONTHS = Array.from({ length: 10 }, (_, index) => {
  const start = index * 28 + 1;
  const end = Math.min(start + 27, 280);

  return {
    id: index + 1,
    label: `Month ${index + 1}`,
    start,
    end,
  };
});

const activityEditorInitialState = {
  mode: 'create',
  session: 'morning',
  index: -1,
  values: createEmptyActivity(),
};

const bulkRuleInitialState = {
  apply_mode: 'month',
  session: 'morning',
  range_start: 1,
  range_end: 28,
  values: createEmptyActivity(),
};

export default function PlannerView() {
  const { token, logout } = useAuth();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('md'));
  const [dayLoading, setDayLoading] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [grid, setGrid] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedTrimester, setSelectedTrimester] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(createEmptyDayPlan(1));
  const [selectedSession, setSelectedSession] = useState('morning');
  const [search, setSearch] = useState('');
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState(activityEditorInitialState);
  const [bulkRuleOpen, setBulkRuleOpen] = useState(false);
  const [bulkRuleState, setBulkRuleState] = useState(bulkRuleInitialState);

  useEffect(() => {
    void loadPlanner();
  }, []);

  async function loadPlanner(preferredDay) {
    setError('');

    try {
      const [gridPayload, rulesPayload] = await Promise.all([
        apiRequest('/api/admin/daily-activity-days', { token }),
        apiRequest('/api/activity-rules', { token }),
      ]);

      const nextGrid = extractCollection(gridPayload).sort((left, right) => left.day_number - right.day_number);
      const nextRules = extractCollection(rulesPayload);
      const nextDay =
        preferredDay ||
        nextGrid.find((item) => item.has_custom_content)?.day_number ||
        nextGrid.find((item) => item.has_legacy_content)?.day_number ||
        1;

      setGrid(nextGrid);
      setRules(nextRules);
      setSelectedTrimester(getTrimesterForDay(nextDay));
      setSelectedMonth(getMonthForDay(nextDay));
      await loadDay(nextDay, false);
    } catch (fetchError) {
      if (fetchError.message.toLowerCase().includes('token')) {
        logout();
      }

      setError(fetchError.message);
    }
  }

  async function loadDay(dayNumber, openDialog = true) {
    setDayLoading(true);

    try {
      const payload = await apiRequest(`/api/admin/daily-activity-days/${dayNumber}`, { token });
      setSelectedDayNumber(dayNumber);
      setSelectedTrimester(getTrimesterForDay(dayNumber));
      setSelectedMonth(getMonthForDay(dayNumber));
      setSelectedPlan(normalizeDayPlan(payload.data));
      setSelectedSession('morning');

      if (openDialog) {
        setDayDialogOpen(true);
      }
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setDayLoading(false);
    }
  }

  const countsByDay = useMemo(() => {
    const map = new Map();

    Array.from({ length: 280 }, (_, index) => index + 1).forEach((day) => {
      map.set(day, { morning: 0, afternoon: 0, evening: 0 });
    });

    rules.forEach((rule) => {
        const session = normalizeSession(rule.timeslot);
      const startDay = Number(rule.start_day) || 0;
      const endDay = Number(rule.end_day) || 0;

      Array.from({ length: Math.max(endDay - startDay + 1, 0) }, (_, index) => startDay + index).forEach((day) => {
        const current = map.get(day) || { morning: 0, afternoon: 0, evening: 0 };
        current[session] += 1;
        map.set(day, current);
      });
    });

    map.set(selectedDayNumber, {
      morning: selectedPlan.sessions.morning.length,
      afternoon: selectedPlan.sessions.afternoon.length,
      evening: selectedPlan.sessions.evening.length,
    });

    return map;
  }, [rules, selectedDayNumber, selectedPlan]);

  const trimesterSummaries = useMemo(
    () =>
      TRIMESTERS.map((trimester) => {
        const days = grid.filter(
          (item) => item.day_number >= trimester.start && item.day_number <= trimester.end
        );
        const customDays = days.filter((item) => item.has_custom_content).length;
        const ruleDays = days.filter((item) => item.has_legacy_content).length;

        return {
          ...trimester,
          customDays,
          ruleDays,
        };
      }),
    [grid]
  );

  const monthOptions = useMemo(
    () =>
      MONTHS.filter((month) => {
        const monthTrimester = getTrimesterForDay(month.start);
        return monthTrimester === selectedTrimester;
      }),
    [selectedTrimester]
  );

  const visibleDays = useMemo(() => {
    const activeMonth = MONTHS.find((month) => month.id === selectedMonth) || MONTHS[0];
    const query = search.trim().toLowerCase();

    return grid.filter((item) => {
      const inMonth =
        item.day_number >= activeMonth.start && item.day_number <= activeMonth.end;

      if (!inMonth) {
        return false;
      }

      if (!query) {
        return true;
      }

      return String(item.day_number).includes(query);
    });
  }, [grid, search, selectedMonth]);

  const currentSessionActivities = selectedPlan.sessions[selectedSession] || [];

  function handleTrimesterChange(trimesterId) {
    setSelectedTrimester(trimesterId);
    const firstMonth = MONTHS.find((month) => getTrimesterForDay(month.start) === trimesterId);
    if (firstMonth) {
      setSelectedMonth(firstMonth.id);
    }
  }

  function handleOpenBulkRule(session = 'morning', applyMode = 'month') {
    const currentMonth = MONTHS.find((month) => month.id === selectedMonth) || MONTHS[0];

    setBulkRuleState({
      apply_mode: applyMode,
      session,
      range_start: applyMode === 'single_day' ? selectedDayNumber : currentMonth.start,
      range_end: applyMode === 'single_day' ? selectedDayNumber : currentMonth.end,
      values: createEmptyActivity(),
    });
    setBulkRuleOpen(true);
  }

  function handleOpenEditEditor(session, index) {
    setEditorState({
      mode: 'edit',
      session,
      index,
      values: { ...selectedPlan.sessions[session][index] },
    });
    setEditorOpen(true);
  }

  async function persistDayPlan(nextPlan, options = {}) {
    const { closeEditor = false, closeDayDialog = false } = options;

    setSavingActivity(true);

    try {
      await apiRequest(`/api/admin/daily-activity-days/${selectedDayNumber}`, {
        token,
        method: 'PUT',
        body: JSON.stringify(serializeDayPlan(nextPlan)),
      });

      setSelectedPlan(nextPlan);
      await loadPlanner(selectedDayNumber);

      if (closeEditor) {
        setEditorOpen(false);
      }

      if (closeDayDialog) {
        setDayDialogOpen(false);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingActivity(false);
    }
  }

  async function handleEditorSave() {
    const { mode, session, index, values } = editorState;

    if (!values.title.trim() || !values.type.trim()) {
      return;
    }

    const nextPlan = structuredClone(selectedPlan);

    if (mode === 'edit' && index > -1) {
      nextPlan.sessions[session][index] = values;
    } else {
      nextPlan.sessions[session].push(values);
    }

    setSelectedSession(session);
    await persistDayPlan(nextPlan, { closeEditor: true });
  }

  async function handleRemoveActivity(session, index) {
    const nextPlan = structuredClone(selectedPlan);
    nextPlan.sessions[session] = nextPlan.sessions[session].filter((_, itemIndex) => itemIndex !== index);
    await persistDayPlan(nextPlan);
  }

  async function handleResetDay() {
    setResetting(true);
    try {
      await apiRequest(`/api/admin/daily-activity-days/${selectedDayNumber}`, {
        token,
        method: 'DELETE',
      });
      await loadPlanner(selectedDayNumber);
      setDayDialogOpen(false);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleBulkRuleSave() {
    const { session, values } = bulkRuleState;
    const { startDay, endDay } = resolveRuleRange(bulkRuleState, selectedMonth, selectedDayNumber);

    if (!values.title.trim() || startDay < 1 || endDay > 280 || startDay > endDay) {
      return;
    }

    setSavingActivity(true);

    try {
      const activityPayload = await apiRequest('/api/activities', {
        token,
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.content.trim() || null,
          activity_type: values.type.trim() || 'generic',
        }),
      });

      const activityId = activityPayload?.data?.id;
      const contentRequests = buildActivityContentPayloads(activityId, values).map((payload) =>
        apiRequest('/api/activity-content', {
          token,
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );

      if (contentRequests.length > 0) {
        await Promise.all(contentRequests);
      }

      await apiRequest('/api/activity-rules', {
        token,
        method: 'POST',
        body: JSON.stringify({
          activity_id: activityId,
          timeslot: capitalize(session),
          start_day: startDay,
          end_day: endDay,
          order_index: getNextOrderIndex(rules, session),
        }),
      });

      setBulkRuleOpen(false);
      await loadPlanner(startDay);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingActivity(false);
    }
  }

  const activeMonth = MONTHS.find((month) => month.id === selectedMonth) || MONTHS[0];

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, width: 1 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Activity Planner</Typography>
          <Typography variant="body1" color="text.secondary">
            Explore days by trimester and month, then open a day to manage its morning,
            afternoon, and evening activities in one focused panel.
          </Typography>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {trimesterSummaries.map((trimester) => (
              <Card
                key={trimester.id}
                sx={{
                  flex: 1,
                  p: 3,
                  cursor: 'pointer',
                  border: trimester.id === selectedTrimester ? 2 : 1,
                  borderColor:
                    trimester.id === selectedTrimester ? 'primary.main' : 'divider',
                }}
                onClick={() => handleTrimesterChange(trimester.id)}
              >
                <Stack spacing={1.5}>
                  <Typography variant="overline" color="primary.main">
                    {trimester.label}
                  </Typography>
                  <Typography variant="h5">
                    Day {trimester.start} - {trimester.end}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={`${trimester.customDays} custom`} color="success" variant="outlined" />
                    <Chip size="small" label={`${trimester.ruleDays} rule based`} color="warning" variant="outlined" />
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>

          <Card sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', lg: 'center' }}
                spacing={2}
              >
                <div>
                  <Typography variant="overline" color="primary.main">
                    Pregnancy Calendar
                  </Typography>
                  <Typography variant="h5">
                    {activeMonth.label} • Day {activeMonth.start}-{activeMonth.end}
                  </Typography>
                </div>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button variant="contained" color="inherit" onClick={() => handleOpenBulkRule('morning', 'month')}>
                    Add Activity Rule
                  </Button>
                  {monthOptions.map((month) => (
                    <Chip
                      key={month.id}
                      label={month.label}
                      clickable
                      color={month.id === selectedMonth ? 'primary' : 'default'}
                      variant={month.id === selectedMonth ? 'filled' : 'outlined'}
                      onClick={() => setSelectedMonth(month.id)}
                    />
                  ))}
                </Box>
              </Stack>

              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search day number"
                sx={{ maxWidth: 320 }}
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(4, minmax(0, 1fr))',
                    sm: 'repeat(6, minmax(0, 1fr))',
                    md: 'repeat(7, minmax(0, 1fr))',
                  },
                  gap: 1.5,
                }}
              >
                {visibleDays.map((day) => {
                  const counts = countsByDay.get(day.day_number) || {
                    morning: 0,
                    afternoon: 0,
                    evening: 0,
                  };

                  return (
                    <Tooltip
                      key={day.day_number}
                      title={`Morning ${counts.morning}, Afternoon ${counts.afternoon}, Evening ${counts.evening}`}
                      arrow
                    >
                      <Button
                        variant={day.day_number === selectedDayNumber ? 'contained' : 'outlined'}
                        color={
                          day.day_number === selectedDayNumber
                            ? 'primary'
                            : day.has_custom_content
                              ? 'success'
                              : day.has_legacy_content
                                ? 'warning'
                                : 'inherit'
                        }
                        onClick={() => loadDay(day.day_number, true)}
                        sx={{
                          minWidth: 0,
                          minHeight: { xs: 52, md: 64 },
                          borderRadius: 3,
                          fontWeight: 700,
                        }}
                      >
                        {day.day_number}
                      </Button>
                    </Tooltip>
                  );
                })}
              </Box>
            </Stack>
          </Card>
        </Stack>
      </Stack>

      <Dialog
        open={dayDialogOpen}
        onClose={() => setDayDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        fullScreen={fullScreenDialog}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
          >
            <div>
              <Typography variant="overline" color="primary.main">
                {TRIMESTERS.find((item) => item.id === getTrimesterForDay(selectedDayNumber))?.label} •{' '}
                {MONTHS.find((item) => item.id === getMonthForDay(selectedDayNumber))?.label}
              </Typography>
              <Typography variant="h5">Day {selectedDayNumber}</Typography>
              <Typography variant="body2" color="text.secondary">
                {buildSourceLabel(selectedPlan.source)}
              </Typography>
            </div>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                color="inherit"
                disabled={selectedPlan.source !== 'custom' || resetting}
                onClick={handleResetDay}
              >
                {resetting ? 'Resetting...' : 'Reset Day'}
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
          {dayLoading ? (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Tabs
                value={selectedSession}
                onChange={(_, value) => setSelectedSession(value)}
                variant="scrollable"
                allowScrollButtonsMobile
              >
                {SESSIONS.map((session) => (
                  <Tab
                    key={session}
                    label={`${SESSION_LABELS[session]} (${selectedPlan.sessions[session].length})`}
                    value={session}
                  />
                ))}
              </Tabs>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
              >
                <div>
                  <Typography variant="h6">{SESSION_LABELS[selectedSession]} Activities</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use this panel to review a day, and add a new rule for just this day if needed.
                  </Typography>
                </div>

                <Button
                  variant="contained"
                  color="inherit"
                  disabled={savingActivity}
                  onClick={() => handleOpenBulkRule(selectedSession, 'single_day')}
                >
                  {savingActivity ? 'Saving...' : 'Add Activity Rule'}
                </Button>
              </Stack>

              {!currentSessionActivities.length ? (
                <Card variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    No {selectedSession} activities
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add a new activity for this session to start building the day plan.
                  </Typography>
                </Card>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      lg: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  {currentSessionActivities.map((activity, index) => (
                    <Card key={`${selectedSession}-${index}`} variant="outlined" sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          spacing={2}
                        >
                          <div>
                            <Typography variant="subtitle1">
                              {activity.title || `Activity ${index + 1}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {capitalize(activity.type)}
                            </Typography>
                          </div>

                          <Stack direction="row" spacing={1}>
                            <IconButton
                              color="inherit"
                              sx={{ border: 1, borderColor: 'divider' }}
                              disabled={savingActivity}
                              onClick={() => handleOpenEditEditor(selectedSession, index)}
                            >
                              <Iconify icon="eva:edit-fill" />
                            </IconButton>
                            <IconButton
                              color="error"
                              sx={{ border: 1, borderColor: 'divider' }}
                              disabled={savingActivity}
                              onClick={() => void handleRemoveActivity(selectedSession, index)}
                            >
                              <Iconify icon="eva:trash-2-outline" />
                            </IconButton>
                          </Stack>
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: 64,
                          }}
                        >
                          {activity.content || 'No text content added yet.'}
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={capitalize(activity.type)} />
                          {activity.media_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={activity.media_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Audio Link
                            </Button>
                          ) : null}
                          {activity.video_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={activity.video_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Video Link
                            </Button>
                          ) : null}
                          {(activity.sub_activities || []).map((subActivity, subIndex) => (
                            <Chip
                              key={`${activity.id || index}-${subActivity.type}-${subIndex}`}
                              size="small"
                              variant="outlined"
                              label={`${capitalize(subActivity.type)} ${subIndex + 1}`}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>
          {editorState.mode === 'edit' ? 'Edit Activity' : 'Add New Activity'} •{' '}
          {SESSION_LABELS[editorState.session]}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Type"
              value={editorState.values.type}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  values: { ...current.values, type: event.target.value },
                }))
              }
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {capitalize(type)}
                </option>
              ))}
            </TextField>

            <TextField
              label="Title"
              value={editorState.values.title}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  values: { ...current.values, title: event.target.value },
                }))
              }
            />

            <TextField
              label="Text content"
              multiline
              rows={4}
              value={editorState.values.content}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  values: { ...current.values, content: event.target.value },
                }))
              }
            />

            <TextField
              label="Audio URL / file reference"
              value={editorState.values.media_url}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  values: { ...current.values, media_url: event.target.value },
                }))
              }
            />

            <TextField
              label="Video URL / file reference"
              value={editorState.values.video_url}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  values: { ...current.values, video_url: event.target.value },
                }))
              }
            />

            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Sub activities</Typography>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() =>
                    setEditorState((current) => ({
                      ...current,
                      values: {
                        ...current.values,
                        sub_activities: [
                          ...(current.values.sub_activities || []),
                          createEmptySubActivity(),
                        ],
                      },
                    }))
                  }
                >
                  Add sub activity
                </Button>
              </Stack>

              {(editorState.values.sub_activities || []).map((subActivity, subIndex) => (
                <Card key={`editor-sub-${subIndex}`} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Sub activity {subIndex + 1}
                      </Typography>
                      <IconButton
                        color="error"
                        onClick={() =>
                          setEditorState((current) => ({
                            ...current,
                            values: {
                              ...current.values,
                              sub_activities: current.values.sub_activities.filter(
                                (_, index) => index !== subIndex
                              ),
                            },
                          }))
                        }
                      >
                        <Iconify icon="eva:trash-2-outline" />
                      </IconButton>
                    </Stack>

                    <TextField
                      select
                      SelectProps={{ native: true }}
                      label="Sub activity type"
                      value={subActivity.type}
                      onChange={(event) =>
                        setEditorState((current) => ({
                          ...current,
                          values: {
                            ...current.values,
                            sub_activities: current.values.sub_activities.map((item, index) =>
                              index === subIndex ? { ...item, type: event.target.value } : item
                            ),
                          },
                        }))
                      }
                    >
                      {SUB_ACTIVITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {capitalize(type)}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      label={subActivity.type === 'text' ? 'Sub activity text' : 'Sub activity URL'}
                      multiline={subActivity.type === 'text'}
                      rows={subActivity.type === 'text' ? 3 : 1}
                      value={subActivity.value}
                      onChange={(event) =>
                        setEditorState((current) => ({
                          ...current,
                          values: {
                            ...current.values,
                            sub_activities: current.values.sub_activities.map((item, index) =>
                              index === subIndex ? { ...item, value: event.target.value } : item
                            ),
                          },
                        }))
                      }
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={() => setEditorOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="inherit"
            disabled={
              savingActivity ||
              !editorState.values.title.trim() ||
              !editorState.values.type.trim()
            }
            onClick={() => void handleEditorSave()}
          >
            {savingActivity ? 'Saving...' : 'Save Activity'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bulkRuleOpen}
        onClose={() => setBulkRuleOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>Create Activity Rule</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Apply to"
              value={bulkRuleState.apply_mode}
              onChange={(event) => {
                const applyMode = event.target.value;
                const currentMonth = MONTHS.find((month) => month.id === selectedMonth) || MONTHS[0];
                setBulkRuleState((current) => ({
                  ...current,
                  apply_mode: applyMode,
                  range_start: applyMode === 'single_day' ? selectedDayNumber : currentMonth.start,
                  range_end: applyMode === 'single_day' ? selectedDayNumber : currentMonth.end,
                }));
              }}
            >
              <option value="month">Selected month</option>
              <option value="custom_range">Custom range</option>
              <option value="single_day">Only selected day</option>
            </TextField>

            <TextField
              select
              SelectProps={{ native: true }}
              label="Session"
              value={bulkRuleState.session}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  session: event.target.value,
                }))
              }
            >
              {SESSIONS.map((session) => (
                <option key={session} value={session}>
                  {SESSION_LABELS[session]}
                </option>
              ))}
            </TextField>

            {bulkRuleState.apply_mode === 'custom_range' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start day"
                  type="number"
                  inputProps={{ min: 1, max: 280 }}
                  value={bulkRuleState.range_start}
                  onChange={(event) =>
                    setBulkRuleState((current) => ({
                      ...current,
                      range_start: Number(event.target.value),
                    }))
                  }
                  fullWidth
                />
                <TextField
                  label="End day"
                  type="number"
                  inputProps={{ min: 1, max: 280 }}
                  value={bulkRuleState.range_end}
                  onChange={(event) =>
                    setBulkRuleState((current) => ({
                      ...current,
                      range_end: Number(event.target.value),
                    }))
                  }
                  fullWidth
                />
              </Stack>
            ) : null}

            <Alert severity="info">
              {buildRuleScopeSummary(bulkRuleState, selectedMonth, selectedDayNumber)}
            </Alert>

            <TextField
              select
              SelectProps={{ native: true }}
              label="Type"
              value={bulkRuleState.values.type}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  values: { ...current.values, type: event.target.value },
                }))
              }
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {capitalize(type)}
                </option>
              ))}
            </TextField>

            <TextField
              label="Title"
              value={bulkRuleState.values.title}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  values: { ...current.values, title: event.target.value },
                }))
              }
            />

            <TextField
              label="Text content"
              multiline
              rows={4}
              value={bulkRuleState.values.content}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  values: { ...current.values, content: event.target.value },
                }))
              }
            />

            <TextField
              label="Audio URL / file reference"
              value={bulkRuleState.values.media_url}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  values: { ...current.values, media_url: event.target.value },
                }))
              }
            />

            <TextField
              label="Video URL / file reference"
              value={bulkRuleState.values.video_url}
              onChange={(event) =>
                setBulkRuleState((current) => ({
                  ...current,
                  values: { ...current.values, video_url: event.target.value },
                }))
              }
            />

            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Sub activities</Typography>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() =>
                    setBulkRuleState((current) => ({
                      ...current,
                      values: {
                        ...current.values,
                        sub_activities: [
                          ...(current.values.sub_activities || []),
                          createEmptySubActivity(),
                        ],
                      },
                    }))
                  }
                >
                  Add sub activity
                </Button>
              </Stack>

              {(bulkRuleState.values.sub_activities || []).map((subActivity, subIndex) => (
                <Card key={`bulk-sub-${subIndex}`} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Sub activity {subIndex + 1}
                      </Typography>
                      <IconButton
                        color="error"
                        onClick={() =>
                          setBulkRuleState((current) => ({
                            ...current,
                            values: {
                              ...current.values,
                              sub_activities: current.values.sub_activities.filter(
                                (_, index) => index !== subIndex
                              ),
                            },
                          }))
                        }
                      >
                        <Iconify icon="eva:trash-2-outline" />
                      </IconButton>
                    </Stack>

                    <TextField
                      select
                      SelectProps={{ native: true }}
                      label="Sub activity type"
                      value={subActivity.type}
                      onChange={(event) =>
                        setBulkRuleState((current) => ({
                          ...current,
                          values: {
                            ...current.values,
                            sub_activities: current.values.sub_activities.map((item, index) =>
                              index === subIndex ? { ...item, type: event.target.value } : item
                            ),
                          },
                        }))
                      }
                    >
                      {SUB_ACTIVITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {capitalize(type)}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      label={subActivity.type === 'text' ? 'Sub activity text' : 'Sub activity URL'}
                      multiline={subActivity.type === 'text'}
                      rows={subActivity.type === 'text' ? 3 : 1}
                      value={subActivity.value}
                      onChange={(event) =>
                        setBulkRuleState((current) => ({
                          ...current,
                          values: {
                            ...current.values,
                            sub_activities: current.values.sub_activities.map((item, index) =>
                              index === subIndex ? { ...item, value: event.target.value } : item
                            ),
                          },
                        }))
                      }
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="inherit" onClick={() => setBulkRuleOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="inherit"
            disabled={savingActivity || !bulkRuleState.values.title.trim()}
            onClick={() => void handleBulkRuleSave()}
          >
            {savingActivity ? 'Saving...' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function createEmptyDayPlan(dayNumber = 1) {
  return {
    source: 'empty',
    day_number: dayNumber,
    sessions: {
      morning: [],
      afternoon: [],
      evening: [],
    },
  };
}

function createEmptyActivity() {
  return {
    type: 'generic',
    title: '',
    content: '',
    media_url: '',
    video_url: '',
    sub_activities: [],
  };
}

function createEmptySubActivity() {
  return {
    type: 'video',
    value: '',
  };
}

function normalizeDayPlan(day) {
  return {
    source: day.source || 'empty',
    day_number: day.day_number || 1,
    sessions: {
      morning: (day.sessions?.morning || []).map((item) => normalizeActivity(item)),
      afternoon: (day.sessions?.afternoon || []).map((item) => normalizeActivity(item)),
      evening: (day.sessions?.evening || []).map((item) => normalizeActivity(item)),
    },
  };
}

function normalizeActivity(activity) {
  return {
    id: activity.id || '',
    type: activity.type || 'generic',
    title: activity.title || '',
    content: activity.content || '',
    media_url: normalizeResourceValue(activity.media_url),
    video_url: normalizeResourceValue(activity.video_url || activity.youtube_video_url),
    sub_activities: (activity.sub_activities || []).map((item) => ({
      id: item.id || '',
      type: item.type || 'video',
      value: item.value || '',
    })),
  };
}

function serializeDayPlan(plan) {
  return {
    sessions: Object.fromEntries(
      SESSIONS.map((session) => [
        session,
        (plan.sessions?.[session] || [])
          .filter((activity) => activity.title.trim())
          .map((activity) => ({
            type: activity.type.trim() || 'generic',
            title: activity.title.trim(),
            content: activity.content.trim() || null,
            media_url: activity.media_url.trim() || null,
            video_url: activity.video_url.trim() || null,
            sub_activities: (activity.sub_activities || [])
              .filter((item) => item.value?.trim())
              .map((item) => ({
                type: item.type,
                value: item.value.trim(),
              })),
          })),
      ])
    ),
  };
}

function normalizeSession(value) {
  const session = String(value || '').toLowerCase();

  if (session === 'afternoon' || session === 'evening') {
    return session;
  }

  return 'morning';
}

function getTrimesterForDay(dayNumber) {
  if (dayNumber <= 93) {
    return 1;
  }

  if (dayNumber <= 186) {
    return 2;
  }

  return 3;
}

function getMonthForDay(dayNumber) {
  return Math.min(Math.ceil(dayNumber / 28), 10);
}

function buildSourceLabel(source) {
  if (source === 'custom') {
    return 'This day is using a custom override.';
  }

  if (source === 'rule_based') {
    return 'This day is driven by activity rules.';
  }

  return 'No activities saved for this day yet.';
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveRuleRange(state, selectedMonth, selectedDayNumber) {
  if (state.apply_mode === 'single_day') {
    return { startDay: selectedDayNumber, endDay: selectedDayNumber };
  }

  if (state.apply_mode === 'custom_range') {
    return {
      startDay: Number(state.range_start) || 1,
      endDay: Number(state.range_end) || 1,
    };
  }

  const month = MONTHS.find((item) => item.id === selectedMonth) || MONTHS[0];
  return { startDay: month.start, endDay: month.end };
}

function getNextOrderIndex(rules, session) {
  const matching = rules
    .filter((rule) => normalizeSession(rule.timeslot) === session)
    .map((rule) => Number(rule.order_index) || 0);

  return matching.length ? Math.max(...matching) + 1 : 0;
}

function buildRuleScopeSummary(state, selectedMonth, selectedDayNumber) {
  const { startDay, endDay } = resolveRuleRange(state, selectedMonth, selectedDayNumber);

  if (startDay === endDay) {
    return `This rule will apply to ${SESSION_LABELS[state.session]} on day ${startDay}.`;
  }

  return `This rule will apply to ${SESSION_LABELS[state.session]} from day ${startDay} to day ${endDay}.`;
}

function buildActivityContentPayloads(activityId, values) {
  const items = [];
  const seen = new Set();

  const pushItem = (type, value) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      return;
    }

    const key = `${type}:${normalized}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push({
      activity_id: activityId,
      type,
      url: normalized,
      day_number: null,
      is_primary: true,
    });
  };

  pushItem('text', values.content);
  pushItem('audio', values.media_url);
  pushItem('video', values.video_url);

  (values.sub_activities || []).forEach((subActivity) => {
    const normalized = typeof subActivity.value === 'string' ? subActivity.value.trim() : '';
    if (!normalized) {
      return;
    }

    const key = `${subActivity.type}:${normalized}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push({
      activity_id: activityId,
      type: subActivity.type,
      url: normalized,
      day_number: null,
      is_primary: false,
    });
  });

  return items;
}

function normalizeResourceValue(value) {
  return typeof value === 'string' ? value : '';
}
