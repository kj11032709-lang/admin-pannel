import { Helmet } from 'react-helmet-async';

import { PlannerView } from 'src/sections/planner';

export default function PlannerPage() {
  return (
    <>
      <Helmet>
        <title> Activity Planner | Garbhotsav Admin </title>
      </Helmet>

      <PlannerView />
    </>
  );
}
