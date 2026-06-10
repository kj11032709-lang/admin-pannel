import SvgColor from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const navConfig = [
  {
    title: 'dashboard',
    path: '/',
    icon: icon('ic_analytics'),
  },
  {
    title: 'events',
    path: '/events',
    icon: icon('ic_blog'),
  },
  {
    title: 'user master',
    path: '/users',
    icon: icon('ic_user'),
  },
  {
    title: 'activity planner',
    path: '/planner',
    icon: icon('ic_calendar'),
  },
];

export default navConfig;
