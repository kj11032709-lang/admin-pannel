/* eslint-disable react/jsx-no-bind */
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { apiRequest } from 'src/utils/api';

import { bgGradient } from 'src/theme/css';
import { useAuth } from 'src/context/auth-context';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';

export default function LoginView() {
  const theme = useTheme();
  const router = useRouter();
  const { setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    email: 'admin@garbhotsav.com',
    password: 'admin123',
  });

  function validate() {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const payload = await apiRequest('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setSession(payload.data.access_token, payload.data.admin);
      router.push('/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        ...bgGradient({
          color: alpha(theme.palette.background.default, 0.72),
          imgUrl: '/assets/background/overlay_5.jpg',
        }),
        height: 1,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: alpha(theme.palette.common.white, 0.08),
        },
      }}
    >
      <Logo
        sx={{
          position: 'fixed',
          top: { xs: 16, md: 24 },
          left: { xs: 16, md: 24 },
          zIndex: 2,
        }}
      />

      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: '100vh', px: 2, position: 'relative', zIndex: 1 }}
      >
        <Card
          sx={{
            p: 5,
            width: 1,
            maxWidth: 420,
          }}
        >
          <Typography variant="h4">Sign in to your account</Typography>

          <Typography variant="body2" sx={{ mt: 2, mb: 3 }}>
            Manage Garbhotsav admin tools from one workspace.
          </Typography>

          {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <TextField
              name="email"
              label="Email address"
              value={form.email}
              onChange={(event) => {
                const { value } = event.target;
                setForm((current) => ({ ...current, email: value }));
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
            />

            <TextField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => {
                const { value } = event.target;
                setForm((current) => ({ ...current, password: value }));
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      <Iconify icon={showPassword ? 'eva:eye-fill' : 'eva:eye-off-fill'} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              color="inherit"
              loading={loading}
              disabled={!form.email.trim() || !form.password.trim()}
            >
              Login
            </LoadingButton>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
