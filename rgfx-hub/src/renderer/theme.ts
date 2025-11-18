import { createTheme } from '@mui/material';

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  colorSchemes: {
    dark: true,
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      lineHeight: 1.3,
      paddingBottom: '4pt',
    },
  },
});
