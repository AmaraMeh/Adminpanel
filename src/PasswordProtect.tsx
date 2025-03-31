// admin-panel/src/PasswordProtect.tsx
import React, { useState, ReactNode } from 'react';
import { Box, TextField, Button, Typography, Container, Alert } from '@mui/material';

// !!! INSECURE - Hardcoded Password !!!
const ADMIN_PASSWORD = "Legpcoty20+AmaraMehdi20+";

interface PasswordProtectProps {
    children: ReactNode; // The content to render if password is correct
}

const PasswordProtect: React.FC<PasswordProtectProps> = ({ children }) => {
    const [passwordAttempt, setPasswordAttempt] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        if (passwordAttempt === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
        } else {
            setError("Mot de passe incorrect.");
            setPasswordAttempt(''); // Clear attempt on failure
        }
    };

    if (isAuthenticated) {
        return <>{children}</>; // Render the protected content
    }

    // Show password prompt
    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    padding: 4,
                    borderRadius: 2,
                }}
            >
                <Typography component="h1" variant="h6">
                    Accès Administrateur Requis
                </Typography>
                <Box component="form" onSubmit={handlePasswordSubmit} noValidate sx={{ mt: 2 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="adminPassword"
                        label="Mot de passe Admin"
                        type="password"
                        id="adminPassword"
                        value={passwordAttempt}
                        onChange={(e) => setPasswordAttempt(e.target.value)}
                        error={!!error}
                        autoFocus
                    />
                    {error && <Alert severity="error" sx={{ mt: 1, width: '100%' }}>{error}</Alert>}
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Vérifier
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default PasswordProtect;