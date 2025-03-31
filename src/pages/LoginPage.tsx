import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get intended destination after login, default to dashboard
    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
             console.log("Login successful, navigating to:", from);
            navigate(from, { replace: true }); // Redirect to intended page
        } catch (err: any) {
            console.error("Login Page Error:", err);
            setError(err.message || "Erreur de connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Admin Panel Login
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal" required fullWidth id="email"
                        label="Adresse Email" name="email" autoComplete="email"
                        autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <TextField
                        margin="normal" required fullWidth name="password"
                        label="Mot de passe" type="password" id="password"
                        autoComplete="current-password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    {error && <Alert severity="error" sx={{ mt: 1, width: '100%' }}>{error}</Alert>}
                    <Button
                        type="submit" fullWidth variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Se Connecter"}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginPage;