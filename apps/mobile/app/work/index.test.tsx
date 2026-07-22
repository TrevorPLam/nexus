import { render, screen } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';

import WorkScreen from './index';

describe('Mobile Work Page', () => {
  it('renders the work screen', () => {
    render(<WorkScreen />);

    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
  });

  it('displays empty state for projects', () => {
    render(<WorkScreen />);

    expect(
      screen.getByText('No projects yet. Create your first project to get started.'),
    ).toBeTruthy();
  });

  it('displays empty state for tasks', () => {
    render(<WorkScreen />);

    expect(
      screen.getByText('No tasks yet. Create a task to start tracking your work.'),
    ).toBeTruthy();
  });

  it('displays create project button', () => {
    render(<WorkScreen />);

    expect(screen.getByText('Create Project')).toBeTruthy();
  });

  it('displays create task button', () => {
    render(<WorkScreen />);

    expect(screen.getByText('Create Task')).toBeTruthy();
  });
});
