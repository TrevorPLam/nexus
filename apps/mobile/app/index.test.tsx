import { render, screen } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';

import HomeScreen from './index';

describe('Mobile Home Screen', () => {
  it('renders title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Life OS')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Personal productivity system')).toBeInTheDocument();
  });

  it('renders Work button', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('renders Calendar button', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
