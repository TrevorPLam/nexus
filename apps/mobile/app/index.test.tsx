import { render, screen } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';

import HomeScreen from './index';

describe('Mobile Home Screen', () => {
  it('renders title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Life OS')).toBeTruthy();
  });

  it('renders subtitle', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Personal productivity system')).toBeTruthy();
  });

  it('renders Work button', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('renders Calendar button', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Calendar')).toBeTruthy();
  });
});
