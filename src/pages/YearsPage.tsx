// src/pages/YearsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getYears, addYear, updateYear, deleteYear } from '../services/firestoreService'; // Import service functions

interface YearRow extends YearData { id: string; } // Type for DataGrid row
interface YearData { name: string; order: number; } // Type matching Firestore data

const YearsPage: React.FC = () => {
    const [years, setYears] = useState<YearRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openAddDialog, setOpenAddDialog] = useState<boolean>(false);
    const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [currentYear, setCurrentYear] = useState<Partial<YearRow>>({}); // For add/edit forms
    const [yearToDelete, setYearToDelete] = useState<YearRow | null>(null); // For delete confirmation
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const loadYears = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getYears();
            setYears(data);
        } catch (err: any) {
            setError(err.message || "Erreur de chargement.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadYears();
    }, [loadYears]);

    // --- Dialog Handlers ---
    const handleOpenAdd = () => { setCurrentYear({ name: '', order: (years.length + 1) * 10 }); setFormError(null); setOpenAddDialog(true); };
    const handleCloseAdd = () => { setOpenAddDialog(false); setCurrentYear({}); };
    const handleOpenEdit = (year: YearRow) => { setCurrentYear({ ...year }); setFormError(null); setOpenEditDialog(true); };
    const handleCloseEdit = () => { setOpenEditDialog(false); setCurrentYear({}); };
    const handleOpenDelete = (year: YearRow) => { setYearToDelete(year); setOpenDeleteDialog(true); };
    const handleCloseDelete = () => { setOpenDeleteDialog(false); setYearToDelete(null); };

    // --- Form Input Handler ---
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setCurrentYear(prev => ({ ...prev, [name]: name === 'order' ? parseInt(value, 10) || 0 : value }));
    };

    // --- Submit Handlers ---
    const handleAddSubmit = async () => {
        setFormError(null);
        if (!currentYear.name || typeof currentYear.order !== 'number') { setFormError("Nom et Ordre sont requis."); return; }
        setIsSubmitting(true);
        try {
            await addYear({ name: currentYear.name, order: currentYear.order });
            handleCloseAdd();
            await loadYears(); // Refresh data
        } catch (err: any) { setFormError(err.message || "Erreur ajout."); }
        finally { setIsSubmitting(false); }
    };

    const handleEditSubmit = async () => {
        setFormError(null);
        if (!currentYear.id || !currentYear.name || typeof currentYear.order !== 'number') { setFormError("Données invalides."); return; }
        setIsSubmitting(true);
        try {
            await updateYear(currentYear.id, { name: currentYear.name, order: currentYear.order });
            handleCloseEdit();
            await loadYears(); // Refresh data
        } catch (err: any) { setFormError(err.message || "Erreur mise à jour."); }
         finally { setIsSubmitting(false); }
    };

    const handleDeleteConfirm = async () => {
        if (!yearToDelete?.id) return;
        setIsSubmitting(true); // Use submitting state for delete too
        try {
            await deleteYear(yearToDelete.id);
            handleCloseDelete();
            await loadYears(); // Refresh data
        } catch (err: any) {
            setError(err.message || "Erreur suppression."); // Show main error for delete failure
            handleCloseDelete(); // Still close dialog on error
        }
         finally { setIsSubmitting(false); }
    };

    // --- DataGrid Columns ---
    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Nom de l\'Année', flex: 1, minWidth: 200 },
        { field: 'order', headerName: 'Ordre', type: 'number', width: 100, align: 'right', headerAlign: 'right' },
        { field: 'id', headerName: 'ID (Firestore)', flex: 1, minWidth: 250 },
        {
            field: 'actions', type: 'actions', width: 100,
            getActions: (params: GridRowParams<YearRow>) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenEdit(params.row)} />,
                <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleOpenDelete(params.row)} sx={{ color: 'error.main' }} />,
            ],
        },
    ];

    return (
        <Box sx={{ height: 'calc(100vh - 64px - 48px)', width: '100%', p: 0, overflow: 'hidden' }}> {/* Adjust height based on AppBar/Padding */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">
                    Gestion des Années Académiques
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
                    Ajouter Année
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ height: 'calc(100% - 50px)', width: '100%' }}> {/* DataGrid container */}
                {loading ? (
                    <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />
                ) : (
                    <DataGrid
                        rows={years}
                        columns={columns}
                        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                        pageSizeOptions={[10, 25, 50]}
                        //checkboxSelection // Optional
                        disableRowSelectionOnClick
                        autoHeight={false} // Let container control height
                        sx={{ '--DataGrid-overlayHeight': '300px' }} // Adjust overlay height if needed
                    />
                )}
            </Box>

            {/* Add/Edit Dialog */}
            <Dialog open={openAddDialog || openEditDialog} onClose={openAddDialog ? handleCloseAdd : handleCloseEdit} fullWidth maxWidth="xs">
                <DialogTitle>{openAddDialog ? 'Ajouter une Année' : 'Modifier l\'Année'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="name" label="Nom de l'Année" type="text" fullWidth variant="outlined" value={currentYear.name || ''} onChange={handleInputChange} error={!!formError && !currentYear.name} required />
                    <TextField margin="dense" name="order" label="Ordre d'affichage" type="number" fullWidth variant="outlined" value={currentYear.order || ''} onChange={handleInputChange} error={!!formError && typeof currentYear.order !== 'number'} required />
                    {formError && <Alert severity="error" sx={{ mt: 1 }}>{formError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={openAddDialog ? handleCloseAdd : handleCloseEdit} disabled={isSubmitting}>Annuler</Button>
                    <Button onClick={openAddDialog ? handleAddSubmit : handleEditSubmit} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={20} /> : (openAddDialog ? 'Ajouter' : 'Sauvegarder')}
                    </Button>
                </DialogActions>
            </Dialog>

             {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDelete} maxWidth="xs">
                <DialogTitle>Confirmer Suppression</DialogTitle>
                <DialogContent>
                    <Typography>Êtes-vous sûr de vouloir supprimer l'année "{yearToDelete?.name}" ?</Typography>
                    <Typography color="error" variant="caption">Attention: Ceci pourrait affecter les spécialités liées.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDelete} disabled={isSubmitting}>Annuler</Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={isSubmitting}>
                         {isSubmitting ? <CircularProgress size={20} /> : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default YearsPage;