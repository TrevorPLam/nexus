import { render } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';

import RootLayout from './_layout';

describe('Mobile Root Layout', () => {
  it('renders the root layout', () => {
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeTruthy();
  });
});
