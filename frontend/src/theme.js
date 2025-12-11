
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#e2e8f0', // Slate-200 (White/Light Gray)
        },
        secondary: {
            main: '#94a3b8', // Slate-400
        },
        background: {
            default: '#18181b', // Zinc-900 (Deep Gray)
            paper: '#27272a', // Zinc-800
        },
        text: {
            primary: '#f4f4f5', // Zinc-100
            secondary: '#a1a1aa', // Zinc-400
        },
    },
    typography: {
        fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 600,
        },
        subtitle1: {
            fontWeight: 500,
        },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#18181b', // Zinc-900 to match background
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'none',
                },
            },
        },
    },
});

export default theme;
