import { Helmet } from 'react-helmet-async';

import { EventsView } from 'src/sections/events';

export default function EventsPage() {
  return (
    <>
      <Helmet>
        <title> Event Master | Garbhotsav Admin </title>
      </Helmet>

      <EventsView />
    </>
  );
}
