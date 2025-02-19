import { expect } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Extend matchers
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
}); 