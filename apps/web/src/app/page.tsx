export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Life OS</h1>
      <p>Personal productivity system</p>
      <nav style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <a href="/work">Work</a>
        <a href="/calendar">Calendar</a>
      </nav>
    </main>
  );
}
