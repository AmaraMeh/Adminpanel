// src/pages/ModulesPage.tsx
import React, { useState, useEffect, useCallback, useMemo, Component, ReactNode } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
    FormControl, InputLabel, Grid, Checkbox, FormGroup, FormControlLabel,
    FormHelperText, Paper, IconButton, Stack, Switch, InputAdornment,
    Skeleton
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem, GridValueFormatterParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Service function imports
import {
    getYears, getSpecialties, getModules, addModule, updateModule, deleteModule,
    YearOption, SpecialtyOption, ModuleData, ModuleRow
} from '../services/firestoreService';

const evaluationTypes: Array<"TD" | "TP" | "Examen"> = ["TD", "TP", "Examen"];
const availableSemesters: string[] = ["Semestre 1", "Semestre 2"]; // Predefined semesters

// Custom Theme
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#f50057' },
        background: { default: '#f5f5f5', paper: '#ffffff' },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    padding: '8px 16px',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
    },
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        secondary: { main: '#f48fb1' },
        background: { default: '#121212', paper: '#1e1e1e' },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    padding: '8px 16px',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
    },
});

// Styled DataGrid
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    border: 'none',
    '& .MuiDataGrid-columnHeaders': {
        backgroundColor: theme.palette.mode === 'dark' ? '#2c2c2c' : '#f0f0f0',
        fontWeight: 600,
    },
    '& .MuiDataGrid-row': {
        '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9',
        },
    },
    '& .MuiDataGrid-cell': {
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
}));

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="error" variant="h6">
                        Une erreur est survenue lors du rendu de la page.
                    </Typography>
                    <Typography color="text.secondary">
                        Veuillez réessayer ou contacter le support.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                        sx={{ mt: 2 }}
                    >
                        Rafraîchir la page
                    </Button>
                </Box>
            );
        }
        return this.props.children;
    }
}

const ModulesPage: React.FC = () => {
    // --- State ---
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [years, setYears] = useState<YearOption[]>([]);
    const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [loading, setLoading] = useState({ years: true, specialties: true, modules: false });
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [currentModule, setCurrentModule] = useState<Partial<ModuleRow>>({});
    const [moduleToDelete, setModuleToDelete] = useState<ModuleRow | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // --- Derived State ---
    const filteredSpecialties = useMemo(() => specialties.filter(spec => spec.yearId === selectedYearId), [selectedYearId, specialties]);
    const filteredModules = useMemo(() => {
        if (!searchQuery) return modules;
        return modules.filter(mod =>
            mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (mod.moduleCode && mod.moduleCode.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [modules, searchQuery]);

    // --- Fetch Initial Data ---
    const loadInitialData = useCallback(async () => {
        setLoading(prev => ({ ...prev, years: true, specialties: true }));
        setError(null);
        try {
            const [yearData, specData] = await Promise.all([getYears(), getSpecialties()]);
            setYears(yearData);
            setSpecialties(specData);
        } catch (err: any) {
            setError(err.message || "Erreur lors du chargement des données initiales.");
            toast.error(err.message || "Erreur lors du chargement des données initiales.");
        } finally {
            setLoading(prev => ({ ...prev, years: false, specialties: false }));
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // --- Fetch Modules ---
    const loadModules = useCallback(async () => {
        if (!selectedSpecialtyId) {
            setModules([]);
            return;
        }
        setLoading(prev => ({ ...prev, modules: true }));
        setError(null);
        try {
            // Fetch all modules for the selected specialty, regardless of semester
            const moduleData = await getModules(selectedSpecialtyId);
            // Sanitize module data to ensure all required fields are present
            const sanitizedModules = moduleData.map(mod => {
                const sanitizedMod: ModuleRow = {
                    ...mod,
                    evaluations: Array.isArray(mod.evaluations) ? mod.evaluations : [],
                    noteEliminatoire: mod.noteEliminatoire !== undefined ? mod.noteEliminatoire : null,
                    moduleCode: mod.moduleCode || null,
                    semesterKey: mod.semesterKey || "Semestre 1", // Fallback to "Semestre 1" if not set
                };
                // Log any module with missing or invalid fields for debugging
                if (!Array.isArray(sanitizedMod.evaluations) || sanitizedMod.noteEliminatoire === undefined) {
                    console.warn(`Invalid module data for ID ${mod.id}:`, mod);
                }
                return sanitizedMod;
            });
            setModules(sanitizedModules);
        } catch (err: any) {
            setError(err.message || "Erreur lors du chargement des modules.");
            toast.error(err.message || "Erreur lors du chargement des modules.");
        } finally {
            setLoading(prev => ({ ...prev, modules: false }));
        }
    }, [selectedSpecialtyId]);

    useEffect(() => {
        loadModules();
    }, [loadModules]);

    // --- Handlers ---
    const resetSelection = () => {
        setSelectedYearId('');
        setSelectedSpecialtyId('');
        setSearchQuery('');
        setModules([]);
        setError(null);
        toast.info("Sélection réinitialisée.");
    };

    const handleOpenAdd = () => {
        if (!selectedYearId || !selectedSpecialtyId) {
            setError("Veuillez sélectionner une année et une spécialité.");
            toast.error("Veuillez sélectionner une année et une spécialité.");
            return;
        }
        setCurrentModule({
            name: '',
            specialtyId: selectedSpecialtyId,
            yearId: selectedYearId,
            semesterKey: "Semestre 1", // Default to "Semestre 1"
            moduleCode: '',
            coefficient: 0,
            credits: 0,
            evaluations: [],
            noteEliminatoire: null,
        });
        setIsEditMode(false);
        setFormError(null);
        setOpenDialog(true);
    };

    const handleOpenEdit = (mod: ModuleRow) => {
        setCurrentModule({ ...mod });
        setIsEditMode(true);
        setFormError(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setCurrentModule({});
    };

    const handleOpenDelete = (mod: ModuleRow) => {
        setModuleToDelete(mod);
        setOpenDeleteDialog(true);
    };

    const handleCloseDelete = () => {
        setOpenDeleteDialog(false);
        setModuleToDelete(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['coefficient', 'credits', 'noteEliminatoire'].includes(name);
        setCurrentModule(prev => ({
            ...prev,
            [name]: isNumeric ? (value === '' ? null : Number(value)) : value,
        }));
    };

    const handleSemesterChange = (e: React.ChangeEvent<{ value: unknown }>) => {
        setCurrentModule(prev => ({
            ...prev,
            semesterKey: e.target.value as string,
        }));
    };

    const handleEvaluationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setCurrentModule(prev => ({
            ...prev,
            evaluations: checked
                ? [...(prev.evaluations || []), name as "TD" | "TP" | "Examen"]
                : (prev.evaluations || []).filter(ev => ev !== name),
        }));
    };

    const handleSubmit = async () => {
        const data = currentModule;
        if (
            !data.name?.trim() ||
            !data.specialtyId ||
            !data.yearId ||
            !data.semesterKey ||
            data.coefficient == null ||
            data.credits == null ||
            !data.evaluations?.length
        ) {
            setFormError("Tous les champs obligatoires doivent être remplis.");
            toast.error("Tous les champs obligatoires doivent être remplis.");
            return;
        }
        const coeff = Number(data.coefficient);
        const creds = Number(data.credits);
        const elim = data.noteEliminatoire != null ? Number(data.noteEliminatoire) : null;
        if (coeff < 0) {
            setFormError("Le coefficient doit être positif.");
            toast.error("Le coefficient doit être positif.");
            return;
        }
        if (creds < 0) {
            setFormError("Les crédits doivent être positifs.");
            toast.error("Les crédits doivent être positifs.");
            return;
        }
        if (elim !== null && (elim < 0 || elim > 20)) {
            setFormError("La note éliminatoire doit être entre 0 et 20.");
            toast.error("La note éliminatoire doit être entre 0 et 20.");
            return;
        }

        setIsSubmitting(true);
        try {
            const dataToSave: ModuleData = {
                name: data.name.trim(),
                specialtyId: data.specialtyId,
                yearId: data.yearId,
                semesterKey: data.semesterKey,
                moduleCode: data.moduleCode || null,
                coefficient: coeff,
                credits: creds,
                evaluations: data.evaluations,
                noteEliminatoire: elim,
            };
            if (isEditMode && data.id) {
                await updateModule(data.id, dataToSave);
                toast.success("Module mis à jour avec succès !");
            } else {
                await addModule(dataToSave);
                toast.success("Module ajouté avec succès !");
            }
            handleCloseDialog();
            loadModules();
        } catch (err: any) {
            setFormError(err.message || "Erreur lors de la sauvegarde.");
            toast.error(err.message || "Erreur lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!moduleToDelete?.id) return;
        setIsSubmitting(true);
        try {
            const result = await deleteModule(moduleToDelete.id);
            if (!result.success) {
                setError(result.message || "Impossible de supprimer le module.");
                toast.error(result.message || "Impossible de supprimer le module.");
            } else {
                handleCloseDelete();
                loadModules();
                toast.success("Module supprimé avec succès !");
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de la suppression.");
            toast.error(err.message || "Erreur lors de la suppression.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- DataGrid Columns ---
    const columns: GridColDef<ModuleRow>[] = [
        { field: 'name', headerName: 'Nom du Module', flex: 2, minWidth: 200 },
        { field: 'semesterKey', headerName: 'Semestre', width: 120 }, // Added semester column
        { field: 'moduleCode', headerName: 'Code UE', width: 120, valueGetter: (value: string | null) => value || '—' },
        { field: 'coefficient', headerName: 'Coef.', width: 80, type: 'number', align: 'center', headerAlign: 'center' },
        { field: 'credits', headerName: 'Crédits', width: 80, type: 'number', align: 'center', headerAlign: 'center' },
        {
            field: 'evaluations',
            headerName: 'Évaluations',
            width: 150,
            valueFormatter: (params: GridValueFormatterParams<string[]>) => {
                if (!params) return '—';
                return params.value && Array.isArray(params.value) && params.value.length > 0
                    ? params.value.join(', ')
                    : '—';
            },
        },
        {
            field: 'noteEliminatoire',
            headerName: 'Note Élim.',
            width: 100,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
            valueFormatter: (params: GridValueFormatterParams<number | null>) => {
                if (!params) return '—';
                return params.value !== null && params.value !== undefined ? params.value : '—';
            },
        },
        {
            field: 'actions',
            type: 'actions',
            width: 100,
            headerName: 'Actions',
            getActions: (params: GridRowParams<ModuleRow>) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenEdit(params.row)} />,
                <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleOpenDelete(params.row)} sx={{ color: 'error.main' }} />,
            ],
        },
    ];

    // --- Render ---
    return (
        <ThemeProvider theme={themeMode === 'light' ? lightTheme : darkTheme}>
            <ErrorBoundary>
                <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
                    <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
                    <Stack spacing={3}>
                        {/* Header */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h4" color="primary">Gestion des Modules</Typography>
                            <FormControlLabel
                                control={<Switch checked={themeMode === 'dark'} onChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')} />}
                                label={themeMode === 'light' ? 'Mode Sombre' : 'Mode Clair'}
                            />
                        </Stack>
                        {error && <Alert severity="error">{error}</Alert>}

                        {/* Selection Area */}
                        <Paper sx={{ p: 3 }}>
                            <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth disabled={loading.years}>
                                        <InputLabel>Année</InputLabel>
                                        <Select value={selectedYearId} label="Année" onChange={(e) => setSelectedYearId(e.target.value)}>
                                            <MenuItem value=""><em>Sélectionnez une année</em></MenuItem>
                                            {loading.years ? (
                                                <MenuItem disabled><CircularProgress size={20} /></MenuItem>
                                            ) : (
                                                years.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth disabled={!selectedYearId || loading.specialties}>
                                        <InputLabel>Spécialité</InputLabel>
                                        <Select value={selectedSpecialtyId} label="Spécialité" onChange={(e) => setSelectedSpecialtyId(e.target.value)}>
                                            <MenuItem value=""><em>Sélectionnez une spécialité</em></MenuItem>
                                            {loading.specialties ? (
                                                <MenuItem disabled><CircularProgress size={20} /></MenuItem>
                                            ) : (
                                                filteredSpecialties.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                                        <TextField
                                            placeholder="Rechercher un module..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ width: { xs: '100%', sm: 300 } }}
                                        />
                                        <Stack direction="row" spacing={2}>
                                            <Tooltip title="Réinitialiser">
                                                <IconButton onClick={resetSelection} disabled={!selectedYearId && !selectedSpecialtyId}>
                                                    <RefreshIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon />}
                                                onClick={handleOpenAdd}
                                                disabled={!selectedSpecialtyId || loading.modules}
                                            >
                                                Ajouter un Module
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* DataGrid */}
                        <Paper sx={{ p: 3, flexGrow: 1 }}>
                            {loading.modules ? (
                                <Stack spacing={1}>
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} variant="rectangular" height={50} />
                                    ))}
                                </Stack>
                            ) : !selectedSpecialtyId ? (
                                <Typography color="text.secondary" textAlign="center" p={4}>
                                    Sélectionnez une année et une spécialité pour voir les modules.
                                </Typography>
                            ) : filteredModules.length === 0 ? (
                                <Typography color="text.secondary" textAlign="center" p={4}>
                                    Aucun module trouvé.
                                </Typography>
                            ) : (
                                <StyledDataGrid
                                    rows={filteredModules}
                                    columns={columns}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                                    autoHeight
                                />
                            )}
                        </Paper>
                    </Stack>

                    {/* Add/Edit Dialog */}
                    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                        <DialogTitle>{isEditMode ? 'Modifier le Module' : 'Ajouter un Module'}</DialogTitle>
                        <DialogContent>
                            <Stack spacing={3} sx={{ mt: 1 }}>
                                <TextField
                                    label="Nom du Module"
                                    name="name"
                                    value={currentModule.name || ''}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    error={!!formError && !currentModule.name?.trim()}
                                    helperText={!!formError && !currentModule.name?.trim() ? "Ce champ est requis." : ""}
                                />
                                <FormControl fullWidth required>
                                    <InputLabel>Semestre</InputLabel>
                                    <Select
                                        value={currentModule.semesterKey || "Semestre 1"}
                                        label="Semestre"
                                        onChange={handleSemesterChange}
                                    >
                                        {availableSemesters.map(semester => (
                                            <MenuItem key={semester} value={semester}>{semester}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Code UE (Optionnel)"
                                    name="moduleCode"
                                    value={currentModule.moduleCode || ''}
                                    onChange={handleInputChange}
                                    fullWidth
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Coefficient"
                                            name="coefficient"
                                            type="number"
                                            value={currentModule.coefficient ?? ''}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!formError && currentModule.coefficient == null}
                                            helperText={!!formError && currentModule.coefficient == null ? "Ce champ est requis." : ""}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="Crédits"
                                            name="credits"
                                            type="number"
                                            value={currentModule.credits ?? ''}
                                            onChange={handleInputChange}
                                            fullWidth
                                            required
                                            error={!!formError && currentModule.credits == null}
                                            helperText={!!formError && currentModule.credits == null ? "Ce champ est requis." : ""}
                                        />
                                    </Grid>
                                </Grid>
                                <TextField
                                    label="Note Éliminatoire (Optionnel, 0-20)"
                                    name="noteEliminatoire"
                                    type="number"
                                    value={currentModule.noteEliminatoire ?? ''}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={!!formError && currentModule.noteEliminatoire != null && (currentModule.noteEliminatoire < 0 || currentModule.noteEliminatoire > 20)}
                                    helperText={
                                        !!formError && currentModule.noteEliminatoire != null && (currentModule.noteEliminatoire < 0 || currentModule.noteEliminatoire > 20)
                                            ? "Doit être entre 0 et 20."
                                            : ""
                                    }
                                />
                                <FormControl error={!!formError && (!currentModule.evaluations || currentModule.evaluations.length === 0)}>
                                    <InputLabel shrink>Évaluations Requises</InputLabel>
                                    <FormGroup row sx={{ mt: 2 }}>
                                        {evaluationTypes.map(type => (
                                            <FormControlLabel
                                                key={type}
                                                control={<Checkbox checked={currentModule.evaluations?.includes(type) || false} onChange={handleEvaluationChange} name={type} />}
                                                label={type}
                                            />
                                        ))}
                                    </FormGroup>
                                    {formError && (!currentModule.evaluations || currentModule.evaluations.length === 0) && (
                                        <FormHelperText error>Au moins une évaluation est requise.</FormHelperText>
                                    )}
                                </FormControl>
                                {formError && <Alert severity="error">{formError}</Alert>}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDialog} disabled={isSubmitting}>Annuler</Button>
                            <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={20} /> : (isEditMode ? 'Sauvegarder' : 'Ajouter')}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Delete Dialog */}
                    <Dialog open={openDeleteDialog} onClose={handleCloseDelete} maxWidth="xs">
                        <DialogTitle>Confirmer la Suppression</DialogTitle>
                        <DialogContent>
                            <Typography>Voulez-vous supprimer "{moduleToDelete?.name}" ?</Typography>
                            <Typography variant="caption" color="error">Cette action peut échouer si des ressources sont liées.</Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDelete} disabled={isSubmitting}>Annuler</Button>
                            <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={20} /> : 'Supprimer'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </ErrorBoundary>
        </ThemeProvider>
    );
};

export default ModulesPage;