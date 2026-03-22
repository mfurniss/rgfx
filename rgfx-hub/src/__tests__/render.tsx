import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';

const testTheme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
  },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={testTheme}>{children}</ThemeProvider>;
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: TestWrapper, ...options });

export { customRender as render };
export { screen, within, waitFor, act, fireEvent, cleanup, renderHook } from '@testing-library/react';
export type { RenderResult } from '@testing-library/react';
