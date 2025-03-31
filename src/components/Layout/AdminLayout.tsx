// src/components/Layout/AdminLayout.tsx
import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, CssBaseline } from '@mui/material';
import Sidebar from './Sidebar'; // Import the Sidebar
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const drawerWidth = 240; // Define drawer width here as well

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
     const { logout } = useAuth();

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline /> {/* Ensures consistent baseline styles */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" noWrap component="div">
                        CampusAdmin
                    </Typography>
                     <Button color="inherit" onClick={logout}>Déconnexion</Button>
                </Toolbar>
            </AppBar>

            {/* --- Include Sidebar --- */}
            <Sidebar />

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3, // Padding around content
                    mt: 8, // AppBar height offset (Toolbar is usually 64px, + a bit)
                    width: `calc(100% - ${drawerWidth}px)`, // Adjust width for drawer
                    ml: `${drawerWidth}px`, // Add left margin for drawer
                    bgcolor: 'background.default', // Use theme background
                    minHeight: 'calc(100vh - 64px)' // Ensure content area fills height below appbar
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default AdminLayout;