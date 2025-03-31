// admin-panel/src/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // Use the simplified AuthContext
import LoadingSpinner from './components/Common/LoadingSpinner';
import { Box, Typography, Button } from '@mui/material'; // Import MUI components for message

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { currentUser, loadingAuth, logout } = useAuth(); // Get logout from context
    const location = useLocation();

    if (loadingAuth) {
        // Wait for Firebase auth check to complete
        return <LoadingSpinner message="Vérification de l'authentification..." />;
    }

    if (!currentUser) {
        // Redirect to Firebase login if not authenticated
        console.log("ProtectedRoute: Not Firebase authenticated, redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If Firebase authenticated, render the children.
    // The password check happens within the PasswordProtect component now.
    return <>{children}</>;

    // --- REMOVED THE OLD isADMIN check and the faulty return statement ---
    /*
    // OLD LOGIC - No longer needed here if PasswordProtect is used outside
    if (!isAdminFirestore) { // Assuming you might have tried the Firestore check version
        console.warn("ProtectedRoute: User is not listed in admins collection.");
        return (
             // **FIXED: Replace comment with actual JSX**
            <Box sx={{ textAlign: 'center', mt: 10 }}>
                <Typography variant="h4" color="error" gutterBottom>
                    Accès Refusé
                </Typography>
                <Typography variant="body1">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                </Typography>
                 <Button variant="contained" sx={{ mt: 3 }} onClick={logout}>
                    Se Déconnecter
                </Button>
            </Box>
        );
    }

    return <>{children}</>;
    */
};

export default ProtectedRoute;