// src/pages/UsersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Chip // Added Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // Add Edit icon if needed for profile editing
import {
    getUsers, updateUserProfile, deleteUserFirestoreDoc, makeAdmin, removeAdmin, // Import user functions
    UserProfileData // Import type
} from '../services/firestoreService'; // Adjust path if needed

// Add checkAdminStatus if using Firestore 'admins' collection
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';


const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<UserProfileData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Optional: State for Edit User Dialog
    // const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
    // const [currentUserToEdit, setCurrentUserToEdit] = useState<Partial<UserProfileData>>({});
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<UserProfileData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    // State to track which users are currently admins (if using Firestore collection method)
    const [adminStatus, setAdminStatus] = useState<Record<string, boolean>>({});
    const [loadingAdminStatus, setLoadingAdminStatus] = useState<boolean>(false);


    const loadUsersAndAdminStatus = useCallback(async () => {
        setLoading(true); setLoadingAdminStatus(true); setError(null);
        try {
            const userData = await getUsers();
            setUsers(userData);

            // If using Firestore 'admins' collection, check status for each user
            const adminStatusPromises = userData.map(async (user) => {
                const adminDocRef = doc(db, "admins", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                return { uid: user.uid, isAdmin: adminDocSnap.exists() };
            });
            const results = await Promise.all(adminStatusPromises);
            const newAdminStatus: Record<string, boolean> = {};
            results.forEach(res => { newAdminStatus[res.uid] = res.isAdmin; });
            setAdminStatus(newAdminStatus);

        } catch (err: any) { setError(err.message || "Erreur chargement utilisateurs."); }
        finally { setLoading(false); setLoadingAdminStatus(false); }
    }, []);

    useEffect(() => { loadUsersAndAdminStatus(); }, [loadUsersAndAdminStatus]);

    // --- Dialog Handlers ---
    // const handleOpenEdit = (user: UserProfileData) => { /* Open Edit Dialog */ };
    // const handleCloseEdit = () => { /* Close Edit Dialog */ };
    const handleOpenDelete = (user: UserProfileData) => { setUserToDelete(user); setOpenDeleteDialog(true); };
    const handleCloseDelete = () => { setOpenDeleteDialog(false); setUserToDelete(null); };

    // --- Submit Handlers ---
    // const handleEditSubmit = async () => { /* Update user profile */ };
    const handleDeleteConfirm = async () => {
        if (!userToDelete?.uid) return;
        setIsSubmitting(true);
        try {
            // Only deletes Firestore doc, NOT Firebase Auth user
            await deleteUserFirestoreDoc(userToDelete.uid);
            handleCloseDelete();
            await loadUsersAndAdminStatus(); // Refresh
        } catch (err: any) { setError(err.message || "Erreur suppression doc utilisateur."); handleCloseDelete(); }
        finally { setIsSubmitting(false); }
    };

    const toggleAdminStatus = async (user: UserProfileData) => {
         const currentIsAdmin = adminStatus[user.uid] || false;
         const action = currentIsAdmin ? removeAdmin : makeAdmin;
         const actionName = currentIsAdmin ? 'Retirer admin' : 'Rendre admin';
         // Optimistically update UI? Or wait for success? Let's wait.
         setLoadingAdminStatus(true); // Indicate status change is happening
         try {
             await action(user.uid);
             // Update local state after successful Firestore operation
             setAdminStatus(prev => ({ ...prev, [user.uid]: !currentIsAdmin }));
             Alert.alert("Succès", `Statut admin ${currentIsAdmin ? 'retiré' : 'accordé'} pour ${user.fullName}.`);
         } catch(err: any) {
             Alert.alert("Erreur", `Impossible de ${actionName}: ${err.message}`);
         } finally {
             setLoadingAdminStatus(false);
         }
    }


    // --- DataGrid Columns ---
    const columns: GridColDef<UserProfileData>[] = [
        { field: 'fullName', headerName: 'Nom Complet', flex: 1, minWidth: 180 },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        { field: 'matricule', headerName: 'Matricule', width: 130 },
        { field: 'year', headerName: 'Année', width: 150 },
        { field: 'speciality', headerName: 'Spécialité', flex: 1, minWidth: 200 },
        { field: 'section', headerName: 'Section', width: 100 },
        { field: 'group', headerName: 'Groupe', width: 80 },
        {
            field: 'isAdmin', headerName: 'Admin', width: 120, align: 'center', headerAlign: 'center', sortable: false,
            renderCell: (params: GridRenderCellParams<UserProfileData>) => {
                const isAdmin = adminStatus[params.row.uid] || false;
                return (
                    <Tooltip title={isAdmin ? "Retirer privilèges Admin" : "Accorder privilèges Admin"}>
                        <Chip
                            icon={<AdminPanelSettingsIcon />}
                            label={isAdmin ? "Admin" : "Utilisateur"}
                            size="small"
                            color={isAdmin ? "success" : "default"}
                            onClick={() => toggleAdminStatus(params.row)}
                            disabled={loadingAdminStatus} // Disable while changing status
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                );
            }
         },
        // { field: 'uid', headerName: 'User ID', width: 220 }, // Usually hidden
        {
            field: 'actions', type: 'actions', width: 80,
            getActions: (params: GridRowParams<UserProfileData>) => [
                // Add Edit action later if needed
                // <GridActionsCellItem icon={<EditIcon />} label="Modifier Profil" onClick={() => handleOpenEdit(params.row)} key={`edit-${params.id}`}/>,
                <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer Doc Firestore" onClick={() => handleOpenDelete(params.row)} sx={{ color: 'error.main' }} key={`delete-${params.id}`}/>,
            ],
        },
    ];

    // --- Render ---
    return (
        <Box sx={{ height: 'calc(100vh - 64px - 48px)', width: '100%', p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h5" component="h1">Gestion des Utilisateurs</Typography>
                {/* Add Search/Filter inputs here later */}
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>

            <Box sx={{ flexGrow: 1, width: '100%', px: 2, pb: 2, overflow: 'hidden' }}>
                {(loading || loadingAdminStatus) ? ( // Show loader if fetching users OR admin status
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
                 ) : (
                    <DataGrid
                        rows={users}
                        columns={columns}
                        getRowId={(row) => row.uid} // Tell DataGrid to use uid as the id
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                            sorting: { sortModel: [{ field: 'fullName', sort: 'asc' }] },
                        }}
                        pageSizeOptions={[15, 25, 50, 100]}
                        disableRowSelectionOnClick
                        autoHeight={false}
                        sx={{ '--DataGrid-overlayHeight': '300px', border: 'none', height: '100%' }}
                    />
                )}
            </Box>

             {/* Edit User Dialog (Optional - Add later) */}
             {/* <Dialog open={openEditDialog} onClose={handleCloseEdit} ... > ... </Dialog> */}

             {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDelete} maxWidth="xs">
                <DialogTitle>Confirmer Suppression (Doc Firestore)</DialogTitle>
                <DialogContent>
                    <Typography>Supprimer le document Firestore pour "{userToDelete?.fullName}" ({userToDelete?.email}) ?</Typography>
                    <Typography color="error" variant="caption">Attention: Ceci ne supprime PAS le compte d'authentification Firebase.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDelete} disabled={isSubmitting}>Annuler</Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={isSubmitting}>
                         {isSubmitting ? <CircularProgress size={20} /> : 'Supprimer Document'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default UsersPage;