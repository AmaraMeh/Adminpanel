// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import PasswordProtect from './PasswordProtect';

// Import Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import YearsPage from './pages/YearsPage';
import SpecialtiesPage from './pages/SpecialtiesPage';
import ModulesPage from './pages/ModulesPage';
import ResourcesPage from './pages/ResourcesPage';
import UsersPage from './pages/UsersPage'; // Add UsersPage import
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './components/Layout/AdminLayout';

const theme = createTheme({ /* ... your theme ... */ });

function AppContent() {
    return (
        <Routes>
            {/* Firebase Login stays outside password protection */}
            <Route path="/login" element={<LoginPage />} />

            {/* Wrap ALL admin routes in PasswordProtect */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <DashboardPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/years"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <YearsPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/specialties"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <SpecialtiesPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/modules"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <ModulesPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/resources"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <ResourcesPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users"
                element={
                    <ProtectedRoute>
                        <PasswordProtect>
                            <AdminLayout>
                                <UsersPage />
                            </AdminLayout>
                        </PasswordProtect>
                    </ProtectedRoute>
                }
            />
            {/* Fallback for Not Found */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;