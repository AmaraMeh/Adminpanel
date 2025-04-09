// src/pages/UsersPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Chip,
    TextField, IconButton, Stack, FormControlLabel, Switch,
    InputAdornment, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem, GridRenderCellParams, GridSelectionModel } from '@mui/x-data-grid';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedIcon from '@mui/icons-material/Verified';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
    getUsers, deleteUserFirestoreDoc, makeAdmin, removeAdmin, updateUserProfile,
    UserProfileData
} from '../services/firestoreService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CSVLink } from 'react-csv';

// Initialize AOS
AOS.init({
    duration: 1000,
    easing: 'ease-in-out',
    once: false,
    mirror: true,
});

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<UserProfileData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfileData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<UserProfileData | null>(null);
    const [userToEdit, setUserToEdit] = useState<UserProfileData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [adminStatus, setAdminStatus] = useState<Record<string, boolean>>({});
    const [verifiedStatus, setVerifiedStatus] = useState<Record<string, boolean>>({});
    const [loadingAdminStatus, setLoadingAdminStatus] = useState<boolean>(false);
    const [selectionModel, setSelectionModel] = useState<GridSelectionModel>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Load users, admin status, and verified status
    const loadUsersAndStatus = useCallback(async () => {
        setLoading(true);
        setLoadingAdminStatus(true);
        setError(null);
        try {
            const userData = await getUsers();
            setUsers(userData);
            setFilteredUsers(userData);

            const adminStatusPromises = userData.map(async (user) => {
                const adminDocRef = doc(db, "admins", user.uid);
                const adminDocSnap = await getDoc(adminDocRef);
                return { uid: user.uid, isAdmin: adminDocSnap.exists() };
            });
            const verifiedStatusPromises = userData.map(async (user) => {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                return { uid: user.uid, isVerified: userDocSnap.data()?.isVerified || false };
            });

            const adminResults = await Promise.all(adminStatusPromises);
            const verifiedResults = await Promise.all(verifiedStatusPromises);

            const newAdminStatus: Record<string, boolean> = {};
            const newVerifiedStatus: Record<string, boolean> = {};
            adminResults.forEach(res => { newAdminStatus[res.uid] = res.isAdmin; });
            verifiedResults.forEach(res => { newVerifiedStatus[res.uid] = res.isVerified; });

            setAdminStatus(newAdminStatus);
            setVerifiedStatus(newVerifiedStatus);
        } catch (err: any) {
            setError(err.message || "Erreur lors du chargement des utilisateurs.");
        } finally {
            setLoading(false);
            setLoadingAdminStatus(false);
        }
    }, []);

    useEffect(() => {
        loadUsersAndStatus();
    }, [loadUsersAndStatus]);

    // Search and filter users
    useEffect(() => {
        const filtered = users.filter(user =>
            user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.matricule?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    // Handle edit dialog
    const handleOpenEdit = (user: UserProfileData) => {
        setUserToEdit({ ...user });
        setFormError(null);
        setOpenEditDialog(true);
    };

    const handleCloseEdit = () => {
        setOpenEditDialog(false);
        setUserToEdit(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserToEdit(prev => prev ? { ...prev, [name]: value || null } : null);
    };

    const handleEditSubmit = async () => {
        if (!userToEdit?.uid) return;
        setFormError(null);
        if (!userToEdit.fullName || !userToEdit.email) {
            setFormError("Le nom complet et l'email sont requis.");
            return;
        }
        setIsSubmitting(true);
        try {
            await updateUserProfile(userToEdit.uid, {
                fullName: userToEdit.fullName,
                email: userToEdit.email,
                matricule: userToEdit.matricule,
                year: userToEdit.year,
                speciality: userToEdit.speciality,
                phoneNumber: userToEdit.phoneNumber,
                section: userToEdit.section,
                group: userToEdit.group,
                profilePicUrl: userToEdit.profilePicUrl,
            });
            handleCloseEdit();
            await loadUsersAndStatus();
        } catch (err: any) {
            setFormError(err.message || "Erreur lors de la mise à jour de l'utilisateur.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete dialog
    const handleOpenDelete = (user: UserProfileData) => {
        setUserToDelete(user);
        setOpenDeleteDialog(true);
    };

    const handleCloseDelete = () => {
        setOpenDeleteDialog(false);
        setUserToDelete(null);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete?.uid) return;
        setIsSubmitting(true);
        try {
            await deleteUserFirestoreDoc(userToDelete.uid);
            handleCloseDelete();
            await loadUsersAndStatus();
        } catch (err: any) {
            setError(err.message || "Erreur lors de la suppression du document utilisateur.");
            handleCloseDelete();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle admin status
    const toggleAdminStatus = async (user: UserProfileData) => {
        const currentIsAdmin = adminStatus[user.uid] || false;
        const action = currentIsAdmin ? removeAdmin : makeAdmin;
        setLoadingAdminStatus(true);
        try {
            await action(user.uid);
            setAdminStatus(prev => ({ ...prev, [user.uid]: !currentIsAdmin }));
        } catch (err: any) {
            setError(`Échec de ${currentIsAdmin ? 'retirer' : 'accorder'} le statut admin: ${err.message}`);
        } finally {
            setLoadingAdminStatus(false);
        }
    };

    // Toggle verified status
    const toggleVerifiedStatus = async (user: UserProfileData) => {
        const currentIsVerified = verifiedStatus[user.uid] || false;
        try {
            await updateDoc(doc(db, "users", user.uid), { isVerified: !currentIsVerified });
            setVerifiedStatus(prev => ({ ...prev, [user.uid]: !currentIsVerified }));
        } catch (err: any) {
            setError(`Échec de ${currentIsVerified ? 'retirer' : 'accorder'} le statut vérifié: ${err.message}`);
        }
    };

    // Bulk verify/unverify
    const handleBulkVerify = async (verify: boolean) => {
        if (selectionModel.length === 0) return;
        setIsSubmitting(true);
        try {
            const updatePromises = selectionModel.map(uid =>
                updateDoc(doc(db, "users", uid as string), { isVerified: verify })
            );
            await Promise.all(updatePromises);
            setVerifiedStatus(prev => {
                const updated = { ...prev };
                selectionModel.forEach(uid => { updated[uid as string] = verify; });
                return updated;
            });
            setSelectionModel([]);
        } catch (err: any) {
            setError(`Échec de la mise à jour du statut vérifié pour les utilisateurs sélectionnés: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (selectionModel.length === 0) return;
        setIsSubmitting(true);
        try {
            const deletePromises = selectionModel.map(uid => deleteUserFirestoreDoc(uid as string));
            await Promise.all(deletePromises);
            await loadUsersAndStatus();
            setSelectionModel([]);
        } catch (err: any) {
            setError(`Échec de la suppression des utilisateurs sélectionnés: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // CSV export data
    const csvData = useMemo(() => {
        return filteredUsers.map(user => ({
            UID: user.uid,
            FullName: user.fullName,
            Email: user.email,
            Matricule: user.matricule,
            Year: user.year,
            Speciality: user.speciality,
            PhoneNumber: user.phoneNumber,
            Section: user.section,
            Group: user.group,
            ProfilePicUrl: user.profilePicUrl,
            CreatedAt: user.createdAt?.toDate().toISOString(),
            IsAdmin: adminStatus[user.uid] ? 'Yes' : 'No',
            IsVerified: verifiedStatus[user.uid] ? 'Yes' : 'No',
        }));
    }, [filteredUsers, adminStatus, verifiedStatus]);

    // DataGrid columns
    const columns: GridColDef<UserProfileData>[] = [
        { field: 'fullName', headerName: 'Nom Complet', flex: 1, minWidth: 180 },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        { field: 'matricule', headerName: 'Matricule', width: 130 },
        { field: 'year', headerName: 'Année', width: 100 },
        { field: 'speciality', headerName: 'Spécialité', flex: 1, minWidth: 150 },
        { field: 'phoneNumber', headerName: 'Téléphone', width: 130 },
        { field: 'section', headerName: 'Section', width: 100 },
        { field: 'group', headerName: 'Groupe', width: 100 },
        { field: 'profilePicUrl', headerName: 'Photo URL', width: 200, renderCell: (params) => (
            <a href={params.value} target="_blank" rel="noopener noreferrer">{params.value}</a>
        )},
        { field: 'createdAt', headerName: 'Créé le', width: 150, type: 'dateTime', valueGetter: (value) => value && value.toDate() },
        {
            field: 'isVerified',
            headerName: 'Vérifié',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params: GridRenderCellParams<UserProfileData>) => {
                const isVerified = verifiedStatus[params.row.uid] || false;
                return (
                    <Tooltip title={isVerified ? "Retirer la vérification" : "Vérifier l'utilisateur"}>
                        <Chip
                            icon={<VerifiedIcon />}
                            label={isVerified ? "Vérifié" : "Non Vérifié"}
                            size="small"
                            color={isVerified ? "primary" : "default"}
                            onClick={() => toggleVerifiedStatus(params.row)}
                            sx={{
                                cursor: 'pointer',
                                background: isVerified
                                    ? 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)'
                                    : 'linear-gradient(45deg, #bdc3c7 30%, #95a5a6 90%)',
                                color: '#fff',
                                '&:hover': { opacity: 0.9 },
                            }}
                        />
                    </Tooltip>
                );
            }
        },
        {
            field: 'isAdmin',
            headerName: 'Admin',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params: GridRenderCellParams<UserProfileData>) => {
                const isAdmin = adminStatus[params.row.uid] || false;
                return (
                    <Tooltip title={isAdmin ? "Retirer les privilèges Admin" : "Accorder les privilèges Admin"}>
                        <Chip
                            icon={<AdminPanelSettingsIcon />}
                            label={isAdmin ? "Admin" : "Utilisateur"}
                            size="small"
                            color={isAdmin ? "success" : "default"}
                            onClick={() => toggleAdminStatus(params.row)}
                            disabled={loadingAdminStatus}
                            sx={{
                                cursor: 'pointer',
                                background: isAdmin
                                    ? 'linear-gradient(45deg, #2ecc71 30%, #27ae60 90%)'
                                    : 'linear-gradient(45deg, #bdc3c7 30%, #95a5a6 90%)',
                                color: '#fff',
                                '&:hover': { opacity: 0.9 },
                            }}
                        />
                    </Tooltip>
                );
            }
        },
        {
            field: 'actions',
            type: 'actions',
            width: 100,
            getActions: (params: GridRowParams<UserProfileData>) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Modifier"
                    onClick={() => handleOpenEdit(params.row)}
                    sx={{ color: '#3498db' }}
                    key={`edit-${params.id}`}
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Supprimer Doc Firestore"
                    onClick={() => handleOpenDelete(params.row)}
                    sx={{ color: '#e74c3c' }}
                    key={`delete-${params.id}`}
                />,
            ],
        },
    ];

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                padding: { xs: 2, md: 4 },
                overflow: 'auto',
            }}
        >
            <Box
                sx={{
                    maxWidth: '1600px',
                    margin: '0 auto',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                    overflow: 'hidden',
                }}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <Box
                    sx={{
                        p: 3,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                        background: 'linear-gradient(45deg, #3498db 30%, #2980b9 90%)',
                    }}
                >
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                            color: '#fff',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                        }}
                        data-aos="fade-right"
                        data-aos-delay="200"
                    >
                        Gestion des Utilisateurs
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }} data-aos="fade-left" data-aos-delay="300">
                            {error}
                        </Alert>
                    )}
                </Box>

                <Box sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
                        <TextField
                            placeholder="Rechercher un utilisateur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#3498db' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: { xs: '100%', sm: 300 },
                                background: '#fff',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                            }}
                            data-aos="fade-up"
                            data-aos-delay="400"
                        />
                        <CSVLink
                            data={csvData}
                            filename={`users_export_${new Date().toISOString()}.csv`}
                            style={{ textDecoration: 'none' }}
                        >
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                sx={{
                                    background: 'linear-gradient(45deg, #27ae60 30%, #2ecc71 90%)',
                                    color: '#fff',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #2ecc71 30%, #27ae60 90%)',
                                    },
                                }}
                                data-aos="fade-up"
                                data-aos-delay="500"
                            >
                                Exporter CSV
                            </Button>
                        </CSVLink>
                        {selectionModel.length > 0 && (
                            <Stack direction="row" spacing={1} data-aos="fade-up" data-aos-delay="600">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleBulkVerify(true)}
                                    disabled={isSubmitting}
                                >
                                    Vérifier Sélection
                                </Button>
                                <Button
                                    variant="contained"
                                    color="warning"
                                    onClick={() => handleBulkVerify(false)}
                                    disabled={isSubmitting}
                                >
                                    Dévérifier Sélection
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={handleBulkDelete}
                                    disabled={isSubmitting}
                                >
                                    Supprimer Sélection
                                </Button>
                            </Stack>
                        )}
                    </Stack>

                    <Box sx={{ height: 'calc(100vh - 250px)' }}>
                        {(loading || loadingAdminStatus) ? (
                            <Box
                                display="flex"
                                justifyContent="center"
                                alignItems="center"
                                height="100%"
                                data-aos="zoom-in"
                                data-aos-delay="200"
                            >
                                <CircularProgress sx={{ color: '#3498db' }} />
                            </Box>
                        ) : (
                            <DataGrid
                                rows={filteredUsers}
                                columns={columns}
                                getRowId={(row) => row.uid}
                                checkboxSelection
                                onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
                                selectionModel={selectionModel}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 25 } },
                                    sorting: { sortModel: [{ field: 'fullName', sort: 'asc' }] },
                                }}
                                pageSizeOptions={[15, 25, 50, 100]}
                                sx={{
                                    border: 'none',
                                    height: '100%',
                                    '& .MuiDataGrid-columnHeaders': {
                                        background: 'linear-gradient(45deg, #ecf0f1 30%, #dfe6e9 90%)',
                                        color: '#2c3e50',
                                        fontWeight: 600,
                                    },
                                    '& .MuiDataGrid-row': {
                                        '&:nth-of-type(odd)': {
                                            backgroundColor: 'rgba(236, 240, 241, 0.5)',
                                        },
                                        '&:hover': {
                                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                        },
                                    },
                                    '& .MuiDataGrid-cell': {
                                        color: '#34495e',
                                    },
                                }}
                                data-aos="fade-up"
                                data-aos-delay="700"
                            />
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Edit Dialog */}
            <Dialog
                open={openEditDialog}
                onClose={handleCloseEdit}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fff 30%, #f5f6fa 90%)',
                    },
                }}
                data-aos="zoom-in"
                data-aos-delay="200"
            >
                <DialogTitle sx={{ color: '#2c3e50', fontWeight: 500 }}>
                    Modifier l'Utilisateur
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Nom Complet"
                            name="fullName"
                            value={userToEdit?.fullName || ''}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            error={!!formError && !userToEdit?.fullName}
                            helperText={!!formError && !userToEdit?.fullName ? "Ce champ est requis." : ""}
                            data-aos="fade-up"
                            data-aos-delay="300"
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            value={userToEdit?.email || ''}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            error={!!formError && !userToEdit?.email}
                            helperText={!!formError && !userToEdit?.email ? "Ce champ est requis." : ""}
                            data-aos="fade-up"
                            data-aos-delay="350"
                        />
                        <TextField
                            label="Matricule"
                            name="matricule"
                            value={userToEdit?.matricule || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="400"
                        />
                        <FormControl fullWidth data-aos="fade-up" data-aos-delay="450">
                            <InputLabel>Année</InputLabel>
                            <Select
                                name="year"
                                value={userToEdit?.year || ''}
                                onChange={(e) => setUserToEdit(prev => prev ? { ...prev, year: e.target.value || null } : null)}
                            >
                                <MenuItem value=""><em>Aucune</em></MenuItem>
                                <MenuItem value="1ère Année">1ère Année</MenuItem>
                                <MenuItem value="2ème Année">2ème Année</MenuItem>
                                <MenuItem value="3ème Année">3ème Année</MenuItem>
                                {/* Add more years as needed */}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Spécialité"
                            name="speciality"
                            value={userToEdit?.speciality || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="500"
                        />
                        <TextField
                            label="Numéro de Téléphone"
                            name="phoneNumber"
                            value={userToEdit?.phoneNumber || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="550"
                        />
                        <TextField
                            label="Section"
                            name="section"
                            value={userToEdit?.section || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="600"
                        />
                        <TextField
                            label="Groupe"
                            name="group"
                            value={userToEdit?.group || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="650"
                        />
                        <TextField
                            label="URL de la Photo de Profil"
                            name="profilePicUrl"
                            value={userToEdit?.profilePicUrl || ''}
                            onChange={handleInputChange}
                            fullWidth
                            data-aos="fade-up"
                            data-aos-delay="700"
                        />
                        {formError && (
                            <Alert severity="error" data-aos="fade-up" data-aos-delay="750">
                                {formError}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCloseEdit}
                        disabled={isSubmitting}
                        sx={{
                            color: '#7f8c8d',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                        }}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            background: 'linear-gradient(45deg, #3498db 30%, #2980b9 90%)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #2980b9 30%, #3498db 90%)',
                            },
                        }}
                    >
                        {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Sauvegarder'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDelete}
                maxWidth="xs"
                sx={{
                    '& .MuiDialog-paper': {
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #fff 30%, #f5f6fa 90%)',
                    },
                }}
                data-aos="zoom-in"
                data-aos-delay="200"
            >
                <DialogTitle sx={{ color: '#2c3e50', fontWeight: 500 }}>
                    Confirmer la Suppression (Doc Firestore)
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#34495e' }}>
                        Supprimer le document Firestore pour "{userToDelete?.fullName}" ({userToDelete?.email}) ?
                    </Typography>
                    <Typography color="error" variant="caption">
                        Attention: Ceci ne supprime PAS le compte d'authentification Firebase.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCloseDelete}
                        disabled={isSubmitting}
                        sx={{
                            color: '#7f8c8d',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
                        }}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            background: 'linear-gradient(45deg, #e74c3c 30%, #c0392b 90%)',
                            color: '#fff',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #c0392b 30%, #e74c3c 90%)',
                            },
                        }}
                    >
                        {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Supprimer Document'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersPage;