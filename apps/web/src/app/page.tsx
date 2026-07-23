/**
 * MODULE: Web Root Page
 *
 * Responsibility:
 * Serves as the Next.js landing page for the Life OS web application, providing
 * navigation entry points to the Work and Calendar modules.
 *
 * Boundaries:
 * - Presentation-only route page; no state management or data fetching.
 * - Navigation is implemented with simple anchor links.
 *
 * Critical invariants:
 * - The page must render without requiring authentication.
 * - Links must route to existing Next.js pages at /work and /calendar.
 *
 * Side effects:
 * - None.
 *
 * Change risk:
 * - Low. Affects only the public landing view.
 *
 * Links:
 * - apps/web/src/app/work/page.tsx
 * - apps/web/src/app/calendar/page.tsx
 *
 * Tags:
 * - domain: web
 * - risk: low
 * - layer: presentation
 * - stability: stable
 * - concerns: landing, navigation
 *
 * File:
 * - apps/web/src/app/page.tsx
 *
 * Last updated:
 * - July 22, 2026
 */

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
