// src/components/Layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom'; // Use NavLink for active state
import {
    Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School'; // For Years
import CategoryIcon from '@mui/icons-material/Category'; // For Specialties
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; // For Modules
import AttachFileIcon from '@mui/icons-material/AttachFile'; // For Resources
import PeopleIcon from '@mui/icons-material/People'; // For Users
import ReportProblemIcon from '@mui/icons-material/ReportProblem'; // For Reports
import CampaignIcon from '@mui/icons-material/Campaign'; // For Announcements
import FindInPageIcon from '@mui/icons-material/FindInPage'; // For Lost/Found

const drawerWidth = 240;

const menuItems = [
    { text: 'Tableau de Bord', icon: <DashboardIcon />, path: '/' },
    { text: 'Années', icon: <SchoolIcon />, path: '/years' },
    { text: 'Spécialités', icon: <CategoryIcon />, path: '/specialties' },
    { text: 'Modules', icon: <LibraryBooksIcon />, path: '/modules' },
    { text: 'Ressources', icon: <AttachFileIcon />, path: '/resources' },
    { text: 'Utilisateurs', icon: <PeopleIcon />, path: '/users' },
];

const Sidebar: React.FC = () => {
    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', bgcolor: 'background.paper' }, // Use theme background
            }}
        >
            <Toolbar /> {/* Spacer to push content below AppBar */}
            <Box sx={{ overflow: 'auto' }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                component={NavLink}
                                to={item.path}
                                // Style active link (NavLink provides isActive prop)
                                style={({ isActive }) => ({
                                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent', // Subtle active background
                                })}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}> {/* Adjust icon spacing */}
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                 <Divider />
                 {/* Add other sections if needed */}
            </Box>
        </Drawer>
    );
};

export default Sidebar;