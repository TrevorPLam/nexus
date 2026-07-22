export default function WorkPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Work</h1>
      <p>Project management and task tracking</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Projects</h2>
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>No projects yet. Create your first project to get started.</p>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Create Project
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Tasks</h2>
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>No tasks yet. Create a task to start tracking your work.</p>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Create Task
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a href="/" style={{ color: 'blue' }}>← Back to Home</a>
      </div>
    </main>
  );
}
