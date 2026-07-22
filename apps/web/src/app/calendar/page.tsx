export default function CalendarPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Calendar</h1>
      <p>Manage your events and schedule</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Calendars</h2>
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>No calendars yet. Create your first calendar to get started.</p>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Create Calendar
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Events</h2>
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>No events scheduled. Create an event to add it to your calendar.</p>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Create Event
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a href="/" style={{ color: 'blue' }}>← Back to Home</a>
      </div>
    </main>
  );
}
