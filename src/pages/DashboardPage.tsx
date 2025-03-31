import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext'; // Can use auth context here too

const DashboardPage: React.FC = () => {
    const { currentUser } = useAuth();

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Tableau de Bord Admin
            </Typography>
            <Typography variant="body1">
                Bienvenue, {currentUser?.displayName || currentUser?.email || 'Admin'} !
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
                Sélectionnez une section dans la barre latérale (à implémenter) pour commencer à gérer les données.
            </Typography>
            {/* Add summary widgets or quick actions here later */}
        </Box>
    );
};

export default DashboardPage;