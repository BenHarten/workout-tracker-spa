import { CalendarView } from "../components/records/CalendarView";

/**
 * Calendar, promoted out of the history page's view toggle to its own route.
 *
 * Still the existing read-only month grid. The mobile agenda layout, workout
 * type pills and legend arrive in a later phase.
 */
export function CalendarPage() {
  return (
    <div className="page">
      <h1 className="page-title">Calendar</h1>
      <CalendarView />
    </div>
  );
}
