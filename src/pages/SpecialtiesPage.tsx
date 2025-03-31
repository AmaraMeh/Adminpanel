// src/pages/SpecialtiesPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // <-- Import useMemo
import {
    Box, Typography, Button, CircularProgress, Alert, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
    FormControl, InputLabel, SelectChangeEvent
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getSpecialties, addSpecialty, updateSpecialty, deleteSpecialty, getYears } from '../services/firestoreService'; // Import service functions

// --- FontAwesome Setup (ensure this is done correctly, maybe in App.tsx is better) ---
// If you haven't installed these:
// npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
// or
// yarn add @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, IconName } from '@fortawesome/free-solid-svg-icons'; // Import desired icons and IconName type
import { library } from '@fortawesome/fontawesome-svg-core';

// Add ALL solid icons to the library. Alternatively, import only the ones you need.
library.add(fas);
// --- End FontAwesome Setup ---


interface SpecialtyRow extends SpecialtyData { id: string; }
interface SpecialtyData { name: string; yearId: string; campus: string; icon: string; }
interface YearOption { id: string; name: string; order: number; }

const SpecialtiesPage: React.FC = () => {
    const [specialties, setSpecialties] = useState<SpecialtyRow[]>([]);
    const [years, setYears] = useState<YearOption[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openAddEditDialog, setOpenAddEditDialog] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [currentSpecialty, setCurrentSpecialty] = useState<Partial<SpecialtyRow>>({});
    const [specialtyToDelete, setSpecialtyToDelete] = useState<SpecialtyRow | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Memoize year map for quick lookup in DataGrid
    const yearMap = useMemo(() => { // <-- useMemo was missing import
        const map = new Map<string, string>();
        years.forEach(year => map.set(year.id, year.name));
        return map;
    }, [years]);

    const loadData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [specData, yearData] = await Promise.all([getSpecialties(), getYears()]);
            setSpecialties(specData);
            setYears(yearData);
        } catch (err: any) { setError(err.message || "Erreur de chargement."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // --- Dialog Handlers ---
    const handleOpenAdd = () => { setCurrentSpecialty({ name: '', yearId: '', campus: '', icon: 'book' }); setIsEditMode(false); setFormError(null); setOpenAddEditDialog(true); };
    const handleOpenEdit = (spec: SpecialtyRow) => { setCurrentSpecialty({ ...spec }); setIsEditMode(true); setFormError(null); setOpenAddEditDialog(true); };
    const handleCloseAddEdit = () => { setOpenAddEditDialog(false); setCurrentSpecialty({}); };
    const handleOpenDelete = (spec: SpecialtyRow) => { setSpecialtyToDelete(spec); setOpenDeleteDialog(true); };
    const handleCloseDelete = () => { setOpenDeleteDialog(false); setSpecialtyToDelete(null); };

    // --- Form Input Handlers ---
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Added HTMLTextAreaElement for MUI compatibility
        const { name, value } = event.target;
        setCurrentSpecialty(prev => ({ ...prev, [name]: value }));
    };
    const handleSelectChange = (event: SelectChangeEvent<string>) => {
        const { name, value } = event.target;
        setCurrentSpecialty(prev => ({ ...prev, [name]: value }));
    };

    // --- Submit Handlers ---
    const handleAddEditSubmit = async () => {
        setFormError(null);
        // Added trim() to checks
        if (!currentSpecialty.name?.trim() || !currentSpecialty.yearId || !currentSpecialty.campus?.trim() || !currentSpecialty.icon?.trim()) {
            setFormError("Tous les champs sont requis."); return;
        }
        setIsSubmitting(true);
        try {
            // Ensure data conforms to SpecialtyData, removing potential id from add operation
            const dataToSave: SpecialtyData = {
                name: currentSpecialty.name.trim(),
                yearId: currentSpecialty.yearId,
                campus: currentSpecialty.campus.trim(),
                icon: currentSpecialty.icon.trim()
             };
            if (isEditMode && currentSpecialty.id) {
                await updateSpecialty(currentSpecialty.id, dataToSave);
            } else {
                await addSpecialty(dataToSave);
            }
            handleCloseAddEdit();
            await loadData(); // Refresh
        } catch (err: any) { setFormError(err.message || "Erreur sauvegarde."); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteConfirm = async () => {
        if (!specialtyToDelete?.id) return;
        setIsSubmitting(true);
        try {
            const result = await deleteSpecialty(specialtyToDelete.id);
            if (!result.success) {
                 Alert.alert("Erreur Suppression", result.message || "Impossible de supprimer la spécialité.");
                 handleCloseDelete();
            } else {
                 handleCloseDelete();
                 await loadData();
            }
        } catch (err: any) {
            setError(err.message || "Erreur suppression.");
            handleCloseDelete();
        } finally { setIsSubmitting(false); }
    };

    // --- DataGrid Columns ---
    const columns: GridColDef<SpecialtyRow>[] = [ // Add generic type
        { field: 'name', headerName: 'Nom Spécialité', flex: 2, minWidth: 250 },
        {
            field: 'yearId', headerName: 'Année', flex: 1, minWidth: 150,
            valueGetter: (value: string) => yearMap.get(value) || value, // Use valueGetter for display/sorting/filtering
        },
        { field: 'campus', headerName: 'Campus', flex: 1, minWidth: 150 },
        {
            field: 'icon', headerName: 'Icône', width: 80, align: 'center', headerAlign: 'center', sortable: false, filterable: false,
            renderCell: (params: GridRenderCellParams<SpecialtyRow, string>) => {
                // Basic check if icon name is valid in the solid set
                const isValidIcon = params.value && fas[params.value as keyof typeof fas];
                const iconToShow = isValidIcon ? params.value as IconName : 'book'; // Fallback icon
                return (
                    <Tooltip title={params.value ?? 'N/A'}>
                        {/* Add a wrapper with padding for better alignment if needed */}
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                             <FontAwesomeIcon icon={['fas', iconToShow]} size="sm" />
                        </Box>
                    </Tooltip>
                )
            }
        },
        { field: 'id', headerName: 'ID', flex: 1, minWidth: 200 },
        {
            field: 'actions', type: 'actions', width: 100,
            getActions: (params: GridRowParams<SpecialtyRow>) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenEdit(params.row)} key={`edit-${params.id}`}/>,
                <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleOpenDelete(params.row)} sx={{ color: 'error.main' }} key={`delete-${params.id}`}/>,
            ],
        },
    ];

    // --- Render ---
    return (
        // Adjust overall Box height calculation if needed based on your AdminLayout AppBar/Toolbar height
        <Box sx={{ height: 'calc(100vh - 64px - 48px)', width: '100%', p: 0, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2, pt: 1 }}> {/* Added padding */}
                <Typography variant="h5" component="h1">Gestion des Spécialités</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>Ajouter Spécialité</Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, mx: 2 }}>{error}</Alert>}

             {/* DataGrid Container */}
            <Box sx={{ height: 'calc(100% - 70px)', width: '100%' }}> {/* Adjust height based on header/padding */}
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                         <CircularProgress />
                    </Box>
                ) : (
                    <DataGrid
                        rows={specialties}
                        columns={columns}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 15 } },
                            sorting: { sortModel: [{ field: 'name', sort: 'asc' }] }, // Default sort
                        }}
                        pageSizeOptions={[15, 30, 50, 100]}
                        disableRowSelectionOnClick
                        autoHeight={false} // Important for container height control
                        sx={{
                            '--DataGrid-overlayHeight': '300px',
                             border: 'none', // Remove default border if container has one
                        }}
                    />
                )}
            </Box>

            {/* Add/Edit Dialog */}
            <Dialog open={openAddEditDialog} onClose={handleCloseAddEdit} fullWidth maxWidth="sm">
                <DialogTitle>{isEditMode ? 'Modifier Spécialité' : 'Ajouter Spécialité'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="name" label="Nom Spécialité" type="text" fullWidth variant="outlined" value={currentSpecialty.name || ''} onChange={handleInputChange} required error={formError?.includes('Nom')} />
                    <FormControl fullWidth margin="dense" required error={formError?.includes('Année')}>
                        <InputLabel id="year-select-label">Année</InputLabel>
                        <Select labelId="year-select-label" name="yearId" value={currentSpecialty.yearId || ''} label="Année" onChange={handleSelectChange} >
                            <MenuItem value="" disabled><em>Sélectionnez une année</em></MenuItem> {/* Add placeholder */}
                            {years.map(year => ( <MenuItem key={year.id} value={year.id}>{year.name}</MenuItem> ))}
                        </Select>
                    </FormControl>
                    <TextField margin="dense" name="campus" label="Campus" type="text" fullWidth variant="outlined" value={currentSpecialty.campus || ''} onChange={handleInputChange} required error={formError?.includes('Campus')} />
                    <TextField margin="dense" name="icon" label="Icône (FontAwesome Solid)" helperText="Ex: flask, laptop-code, dna" type="text" fullWidth variant="outlined" value={currentSpecialty.icon || ''} onChange={handleInputChange} required error={formError?.includes('Icône')} />
                    {formError && !formError.includes('champ') && <Alert severity="error" sx={{ mt: 1 }}>{formError}</Alert>} {/* Show general form error */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddEdit} disabled={isSubmitting}>Annuler</Button>
                    <Button onClick={handleAddEditSubmit} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={20} /> : (isEditMode ? 'Sauvegarder' : 'Ajouter')}
                    </Button>
                </DialogActions>
            </Dialog>

             {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDelete} maxWidth="xs">
                <DialogTitle>Confirmer Suppression</DialogTitle>
                <DialogContent>
                    <Typography>Êtes-vous sûr de vouloir supprimer la spécialité "{specialtyToDelete?.name}" ?</Typography>
                    <Typography color="error" variant="caption">Attention: Ceci pourrait échouer si des modules sont liés.</Typography>
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

export default SpecialtiesPage;