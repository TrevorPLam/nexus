import { render, screen } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';

import CalendarScreen from './index';

describe('Mobile Calendar Page', () => {
  it('renders the calendar screen', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Calendars')).toBeTruthy();
    expect(screen.getByText('Events')).toBeTruthy();
  });

  it('displays empty state for calendars', () => {
    render(<CalendarScreen />);

    expect(
      screen.getByText('No calendars yet. Create your first calendar to get started.'),
    ).toBeTruthy();
  });

  it('displays empty state for events', () => {
    render(<CalendarScreen />);

    expect(
      screen.getByText('No events scheduled. Create an event to add it to your calendar.'),
    ).toBeTruthy();
  });

  it('displays create calendar button', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Create Calendar')).toBeTruthy();
  });

  it('displays create event button', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Create Event')).toBeTruthy();
  });
});
