// src/pages/ResourcesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
    FormControl, InputLabel, SelectChangeEvent, Grid, Switch, FormGroup,
    FormControlLabel, IconButton, Paper, Stack, InputAdornment, Skeleton
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import RecommendIcon from '@mui/icons-material/Star';
import ExclusiveIcon from '@mui/icons-material/VpnKey';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firestore and Storage imports
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';

// Service function imports
import {
    getYears, getSpecialties, getModules, getResources, addResource, updateResource, deleteResource,
    YearOption, SpecialtyOption, ModuleRow, ResourceData, ResourceRow
} from '../services/firestoreService';

// FontAwesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, IconName } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(fas);

// Constants
const resourceTypes = ["cours", "td", "tp", "examen", "compterendu", "interrogation", "autre"];
const resourceSources = ["bejaia", "autres", "blida", "setif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// AI/ML API configuration
const AIML_API_ENDPOINT = 'https://api.aimlapi.com/v1/chat/completions'; // Updated endpoint
const AIML_API_KEY = '9f3fd9f986da4b309309bc34a6c173cf';

// Custom Themes
const lightTheme = createTheme({
    palette: { mode: 'light', primary: { main: '#1976d2' }, secondary: { main: '#f50057' }, background: { default: '#f5f5f5', paper: '#ffffff' } },
    typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', h4: { fontWeight: 700 } },
    components: {
        MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', padding: '8px 16px' } } },
        MuiPaper: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' } } },
        MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } } },
    },
});
const darkTheme = createTheme({
    palette: { mode: 'dark', primary: { main: '#90caf9' }, secondary: { main: '#f48fb1' }, background: { default: '#121212', paper: '#1e1e1e' } },
    typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', h4: { fontWeight: 700 } },
    components: {
        MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', padding: '8px 16px' } } },
        MuiPaper: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } } },
        MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } } },
    },
});
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    border: 'none',
    '& .MuiDataGrid-columnHeaders': { backgroundColor: theme.palette.mode === 'dark' ? '#2c2c2c' : '#f0f0f0', fontWeight: 600 },
    '& .MuiDataGrid-row': { '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f9f9f9' } },
    '& .MuiDataGrid-cell': { borderBottom: `1px solid ${theme.palette.divider}` },
}));

const ResourcesPage: React.FC = () => {
    // State
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
    const [selectedSemesterKey, setSelectedSemesterKey] = useState<string>('');
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [years, setYears] = useState<YearOption[]>([]);
    const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
    const [semesters, setSemesters] = useState<string[]>([]);
    const [modules, setModules] = useState<ModuleRow[]>([]);
    const [resources, setResources] = useState<ResourceRow[]>([]);
    const [loading, setLoading] = useState({ years: true, specialties: false, semesters: false, modules: false, resources: false });
    const [error, setError] = useState<string | null>(null);
    const [openAddEditDialog, setOpenAddEditDialog] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
    const [currentResource, setCurrentResource] = useState<Partial<ResourceRow>>({});
    const [resourceToDelete, setResourceToDelete] = useState<ResourceRow | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [openImportDialog, setOpenImportDialog] = useState<boolean>(false);
    const [importInput, setImportInput] = useState<string>('');

    // Derived State
    const filteredSpecialties = useMemo(() => specialties.filter(spec => spec.yearId === selectedYearId), [specialties, selectedYearId]);
    const semesterOptions = useMemo(() => semesters.map(s => ({ label: s, value: s })), [semesters]);
    const moduleOptions = useMemo(() => modules.map(m => ({ label: m.name, value: m.id })), [modules]);
    const filteredResources = useMemo(() => {
        if (!searchQuery) return resources;
        return resources.filter(res =>
            res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [resources, searchQuery]);

    // Fetch Data
    useEffect(() => {
        const loadYears = async () => {
            setLoading(prev => ({ ...prev, years: true }));
            try {
                const yearData = await getYears();
                setYears(yearData);
            } catch (err: any) {
                setError(err.message || "Erreur lors du chargement des années.");
                toast.error(err.message || "Erreur lors du chargement des années.");
            } finally {
                setLoading(prev => ({ ...prev, years: false }));
            }
        };
        loadYears();
    }, []);

    useEffect(() => {
        const loadSpecialties = async () => {
            if (!selectedYearId) {
                setSpecialties([]); setSelectedSpecialtyId(''); setSemesters([]); setSelectedSemesterKey(''); setModules([]); setSelectedModuleId(''); setResources([]);
                return;
            }
            setLoading(prev => ({ ...prev, specialties: true }));
            try {
                const specData = await getSpecialties();
                setSpecialties(specData);
            } catch (err: any) {
                setError(err.message || "Erreur lors du chargement des spécialités.");
                toast.error(err.message || "Erreur lors du chargement des spécialités.");
            } finally {
                setLoading(prev => ({ ...prev, specialties: false }));
            }
        };
        loadSpecialties();
    }, [selectedYearId]);

    useEffect(() => {
        const loadSemesters = async () => {
            if (!selectedSpecialtyId) {
                setSemesters([]); setSelectedSemesterKey(''); setModules([]); setSelectedModuleId(''); setResources([]);
                return;
            }
            setLoading(prev => ({ ...prev, semesters: true }));
            try {
                const specialty = specialties.find(spec => spec.id === selectedSpecialtyId);
                let semesterKeys: string[] = specialty?.availableSemesters?.length ? [...new Set(specialty.availableSemesters)].filter(Boolean).sort() : [];
                if (!semesterKeys.length && db) {
                    const modulesQuery = query(collection(db, "modules"), where("specialtyId", "==", selectedSpecialtyId));
                    const modulesSnapshot = await getDocs(modulesQuery);
                    semesterKeys = [...new Set(modulesSnapshot.docs.map(doc => doc.data().semesterKey || ''))].filter(Boolean).sort();
                }
                setSemesters(semesterKeys);
                if (!semesterKeys.includes(selectedSemesterKey)) setSelectedSemesterKey('');
            } catch (err: any) {
                setError(err.message || "Erreur lors du chargement des semestres.");
                toast.error(err.message || "Erreur lors du chargement des semestres.");
            } finally {
                setLoading(prev => ({ ...prev, semesters: false }));
            }
        };
        loadSemesters();
    }, [selectedSpecialtyId, specialties]);

    useEffect(() => {
        const loadModules = async () => {
            if (!selectedSpecialtyId || !selectedSemesterKey) {
                setModules([]); setSelectedModuleId(''); setResources([]);
                return;
            }
            setLoading(prev => ({ ...prev, modules: true }));
            try {
                const moduleData = await getModules(selectedSpecialtyId, selectedSemesterKey);
                setModules(moduleData);
                setSelectedModuleId('');
            } catch (err: any) {
                setError(err.message || "Erreur lors du chargement des modules.");
                toast.error(err.message || "Erreur lors du chargement des modules.");
            } finally {
                setLoading(prev => ({ ...prev, modules: false }));
            }
        };
        loadModules();
    }, [selectedSpecialtyId, selectedSemesterKey]);

    useEffect(() => {
        let isMounted = true;
        if (!selectedModuleId) {
            setResources([]);
            return;
        }
        const loadResources = async () => {
            setLoading(prev => ({ ...prev, resources: true }));
            try {
                const data = await getResources(selectedModuleId);
                if (isMounted) {
                    const sanitizedResources = data.map(res => ({
                        ...res,
                        title: res.title || '',
                        type: res.type || 'autre',
                        source: res.source || 'autres',
                        url: res.url || '',
                        isExclusive: res.isExclusive || false,
                        isRecommended: res.isRecommended || false,
                    }));
                    setResources(sanitizedResources);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Erreur lors du chargement des ressources.");
                    toast.error(err.message || "Erreur lors du chargement des ressources.");
                }
            } finally {
                if (isMounted) setLoading(prev => ({ ...prev, resources: false }));
            }
        };
        loadResources();
        return () => { isMounted = false; };
    }, [selectedModuleId]);

    // Handlers
    const resetSelection = () => {
        setSelectedYearId(''); setSelectedSpecialtyId(''); setSelectedSemesterKey(''); setSelectedModuleId('');
        setSearchQuery(''); setModules([]); setSemesters([]); setResources([]); setError(null);
        toast.info("Sélection réinitialisée.");
    };

    const handleOpenAdd = () => {
        if (!selectedModuleId) {
            setError("Veuillez sélectionner un module avant d'ajouter une ressource.");
            toast.error("Veuillez sélectionner un module avant d'ajouter une ressource.");
            return;
        }
        setCurrentResource({ title: '', type: 'cours', source: 'bejaia', url: '', isExclusive: false, isRecommended: false, moduleId: selectedModuleId });
        setSelectedFile(null); setFileError(null); setIsEditMode(false); setFormError(null); setOpenAddEditDialog(true);
    };

    const handleOpenEdit = (res: ResourceRow) => {
        setCurrentResource({ ...res }); setSelectedFile(null); setFileError(null); setIsEditMode(true); setFormError(null); setOpenAddEditDialog(true);
    };

    const handleCloseAddEdit = () => {
        setOpenAddEditDialog(false); setCurrentResource({}); setSelectedFile(null); setFileError(null); setIsUploading(false);
    };

    const handleOpenDelete = (res: ResourceRow) => {
        setResourceToDelete(res); setOpenDeleteDialog(true);
    };

    const handleCloseDelete = () => {
        setOpenDeleteDialog(false); setResourceToDelete(null);
    };

    const handleOpenImport = () => {
        if (!selectedModuleId) {
            toast.error("Veuillez sélectionner un module avant d'utiliser l'importation.");
            return;
        }
        setImportInput(''); setOpenImportDialog(true);
    };

    const handleCloseImport = () => {
        setOpenImportDialog(false); setImportInput('');
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setCurrentResource(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (event: SelectChangeEvent<string>) => {
        const { name, value } = event.target;
        setCurrentResource(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setCurrentResource(prev => ({ ...prev, [name]: checked }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) { setSelectedFile(null); setFileError(null); return; }
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setFileError("Seuls les fichiers PDF, DOC et DOCX sont autorisés."); setSelectedFile(null); return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setFileError("La taille du fichier ne doit pas dépasser 10 Mo."); setSelectedFile(null); return;
        }
        setSelectedFile(file); setFileError(null);
    };

    const uploadFile = async (file: File, resourceId: string): Promise<string> => {
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `resources/${resourceId}/${file.name}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        } catch (err: any) {
            throw new Error("Erreur lors du téléchargement du fichier : " + (err.message || "Erreur inconnue."));
        } finally {
            setIsUploading(false);
        }
    };

    // AI/ML API Integration with Error Handling
    const processImportInput = async () => {
        if (!importInput.trim()) {
            toast.error("Veuillez entrer des données à traiter.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(AIML_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIML_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `
                                Parse the following text into a structured list of resources in JSON format. Extract titles and URLs. If a title is "Untitled," generate a unique title based on its position (e.g., "Resource 1"). At the end of the input, there may be a source and recommendation status (e.g., "Source: bejaia, Recommended: yes"). Assign defaults if not specified (source: "autres", isRecommended: false). Return the result as JSON with fields: title, url, source, isRecommended, type (default to "autre"). Here’s the input:

                                ${importInput}
                            `
                        }
                    ],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur AI/ML API: ${response.status} - ${errorText || response.statusText}`);
            }

            const data = await response.json();
            const resourcesToAdd = JSON.parse(data.choices[0].message.content); // Updated for OpenAI-compatible response

            for (const resource of resourcesToAdd) {
                const dataToSave: ResourceData = {
                    title: resource.title || 'Resource sans titre',
                    type: resource.type || 'autre',
                    source: resource.source || 'autres',
                    url: resource.url || '',
                    isExclusive: false,
                    isRecommended: resource.isRecommended || false,
                    moduleId: selectedModuleId,
                };
                await addResource(dataToSave);
            }

            toast.success(`${resourcesToAdd.length} ressources ajoutées avec succès !`);
            handleCloseImport();

            if (selectedModuleId) {
                setLoading(prev => ({ ...prev, resources: true }));
                const updatedResources = await getResources(selectedModuleId);
                const sanitizedResources = updatedResources.map(res => ({
                    ...res,
                    title: res.title || '',
                    type: res.type || 'autre',
                    source: res.source || 'autres',
                    url: res.url || '',
                    isExclusive: res.isExclusive || false,
                    isRecommended: res.isRecommended || false,
                }));
                setResources(sanitizedResources);
                setLoading(prev => ({ ...prev, resources: false }));
            }
        } catch (err: any) {
            console.error('Erreur dans processImportInput:', err);
            toast.error(err.message || "Erreur lors du traitement avec AI/ML API.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddEditSubmit = async () => {
        const data = currentResource;
        if (!data.title?.trim() || !data.type || !data.source || !data.moduleId) {
            setFormError("Tous les champs obligatoires doivent être remplis."); toast.error("Tous les champs obligatoires doivent être remplis."); return;
        }
        if (!isEditMode && !selectedFile && !data.url?.trim()) {
            setFormError("Veuillez fournir un fichier ou une URL."); toast.error("Veuillez fournir un fichier ou une URL."); return;
        }
        if (isEditMode && !selectedFile && !data.url?.trim()) {
            setFormError("Veuillez fournir un fichier ou une URL."); toast.error("Veuillez fournir un fichier ou une URL."); return;
        }

        setIsSubmitting(true);
        try {
            let resourceUrl = data.url?.trim() || '';
            if (selectedFile) {
                const tempResourceId = isEditMode && data.id ? data.id : Date.now().toString();
                resourceUrl = await uploadFile(selectedFile, tempResourceId);
            }

            const dataToSave: ResourceData = {
                title: data.title.trim(),
                type: data.type,
                source: data.source,
                url: resourceUrl,
                isExclusive: data.isExclusive || false,
                isRecommended: data.isRecommended || false,
                moduleId: data.moduleId,
            };

            if (isEditMode && data.id) {
                await updateResource(data.id, dataToSave);
                toast.success("Ressource mise à jour avec succès !");
            } else {
                await addResource(dataToSave);
                toast.success("Ressource ajoutée avec succès !");
            }

            handleCloseAddEdit();
            if (selectedModuleId) {
                setLoading(prev => ({ ...prev, resources: true }));
                const updatedResources = await getResources(selectedModuleId);
                const sanitizedResources = updatedResources.map(res => ({
                    ...res,
                    title: res.title || '',
                    type: res.type || 'autre',
                    source: res.source || 'autres',
                    url: res.url || '',
                    isExclusive: res.isExclusive || false,
                    isRecommended: res.isRecommended || false,
                }));
                setResources(sanitizedResources);
                setLoading(prev => ({ ...prev, resources: false }));
            }
        } catch (err: any) {
            setFormError(err.message || "Erreur lors de la sauvegarde."); toast.error(err.message || "Erreur lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!resourceToDelete?.id) return;
        setIsSubmitting(true);
        try {
            await deleteResource(resourceToDelete.id);
            handleCloseDelete();
            if (selectedModuleId) {
                setLoading(prev => ({ ...prev, resources: true }));
                const updatedResources = await getResources(selectedModuleId);
                const sanitizedResources = updatedResources.map(res => ({
                    ...res,
                    title: res.title || '',
                    type: res.type || 'autre',
                    source: res.source || 'autres',
                    url: res.url || '',
                    isExclusive: res.isExclusive || false,
                    isRecommended: res.isRecommended || false,
                }));
                setResources(sanitizedResources);
                setLoading(prev => ({ ...prev, resources: false }));
            }
            toast.success("Ressource supprimée avec succès !");
        } catch (err: any) {
            setError(err.message || "Erreur lors de la suppression."); toast.error(err.message || "Erreur lors de la suppression."); handleCloseDelete();
        } finally {
            setIsSubmitting(false);
        }
    };

    // DataGrid Columns
    const columns: GridColDef<ResourceRow>[] = [
        { field: 'title', headerName: 'Titre', flex: 2, minWidth: 200 },
        {
            field: 'type', headerName: 'Type', width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FontAwesomeIcon icon={['fas', params.value as IconName]} />
                    <Typography variant="body2">{params.value}</Typography>
                </Box>
            ),
        },
        { field: 'source', headerName: 'Source', width: 120 },
        {
            field: 'url', headerName: 'Lien', width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <IconButton href={params.value} target="_blank" rel="noopener noreferrer"><LinkIcon /></IconButton>
            ),
        },
        { field: 'isRecommended', headerName: 'Recommandé', width: 120, type: 'boolean', renderCell: (params: GridRenderCellParams) => params.value ? <RecommendIcon color="warning" /> : null },
        { field: 'isExclusive', headerName: 'Exclusif', width: 100, type: 'boolean', renderCell: (params: GridRenderCellParams) => params.value ? <ExclusiveIcon color="primary" /> : null },
        {
            field: 'actions', type: 'actions', width: 100, headerName: 'Actions',
            getActions: (params: GridRowParams<ResourceRow>) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => handleOpenEdit(params.row)} />,
                <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleOpenDelete(params.row)} sx={{ color: 'error.main' }} />,
            ],
        },
    ];

    // Render
    return (
        <ThemeProvider theme={themeMode === 'light' ? lightTheme : darkTheme}>
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
                <Stack spacing={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h4" color="primary">Gestion des Ressources</Typography>
                        <FormControlLabel
                            control={<Switch checked={themeMode === 'dark'} onChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')} />}
                            label={themeMode === 'light' ? 'Mode Sombre' : 'Mode Clair'}
                        />
                    </Stack>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Paper sx={{ p: 3 }}>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth disabled={loading.years}>
                                    <InputLabel>Année</InputLabel>
                                    <Select value={selectedYearId} label="Année" onChange={(e) => setSelectedYearId(e.target.value)}>
                                        <MenuItem value=""><em>Sélectionnez une année</em></MenuItem>
                                        {loading.years ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : years.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth disabled={!selectedYearId || loading.specialties}>
                                    <InputLabel>Spécialité</InputLabel>
                                    <Select value={selectedSpecialtyId} label="Spécialité" onChange={(e) => setSelectedSpecialtyId(e.target.value)}>
                                        <MenuItem value=""><em>Sélectionnez une spécialité</em></MenuItem>
                                        {loading.specialties ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : filteredSpecialties.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth disabled={!selectedSpecialtyId || loading.semesters}>
                                    <InputLabel>Semestre</InputLabel>
                                    <Select value={selectedSemesterKey} label="Semestre" onChange={(e) => setSelectedSemesterKey(e.target.value)}>
                                        <MenuItem value=""><em>Sélectionnez un semestre</em></MenuItem>
                                        {loading.semesters ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : semesterOptions.length > 0 ? semesterOptions.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>) : <MenuItem disabled>Aucun semestre disponible</MenuItem>}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth disabled={!selectedSemesterKey || loading.modules}>
                                    <InputLabel>Module</InputLabel>
                                    <Select value={selectedModuleId} label="Module" onChange={(e) => setSelectedModuleId(e.target.value)}>
                                        <MenuItem value=""><em>Sélectionnez un module</em></MenuItem>
                                        {loading.modules ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : moduleOptions.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                                    <TextField
                                        placeholder="Rechercher une ressource..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                                        sx={{ width: { xs: '100%', sm: 300 } }}
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Tooltip title="Réinitialiser">
                                            <IconButton onClick={resetSelection} disabled={!selectedYearId && !selectedSpecialtyId && !selectedSemesterKey && !selectedModuleId}>
                                                <RefreshIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} disabled={!selectedModuleId || loading.resources}>
                                            Ajouter une Ressource
                                        </Button>
                                        <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handleOpenImport} disabled={!selectedModuleId || loading.resources}>
                                            Importer via AI
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                    <Paper sx={{ p: 3, flexGrow: 1 }}>
                        {loading.resources ? (
                            <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={50} />)}</Stack>
                        ) : !selectedModuleId ? (
                            <Typography color="text.secondary" textAlign="center" p={4}>Sélectionnez un module pour voir ses ressources.</Typography>
                        ) : filteredResources.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" p={4}>Aucune ressource trouvée pour ce module.</Typography>
                        ) : (
                            <StyledDataGrid rows={filteredResources} columns={columns} pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} autoHeight />
                        )}
                    </Paper>
                </Stack>

                <Dialog open={openAddEditDialog} onClose={handleCloseAddEdit} maxWidth="sm" fullWidth>
                    <DialogTitle>{isEditMode ? 'Modifier la Ressource' : 'Ajouter une Ressource'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField label="Titre" name="title" value={currentResource.title || ''} onChange={handleInputChange} fullWidth required error={!!formError && !currentResource.title?.trim()} helperText={!!formError && !currentResource.title?.trim() ? "Ce champ est requis." : ""} />
                            <FormControl fullWidth required>
                                <InputLabel>Type</InputLabel>
                                <Select name="type" value={currentResource.type || 'cours'} label="Type" onChange={handleSelectChange}>
                                    {resourceTypes.map(type => <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required>
                                <InputLabel>Source</InputLabel>
                                <Select name="source" value={currentResource.source || 'bejaia'} label="Source" onChange={handleSelectChange}>
                                    {resourceSources.map(source => <MenuItem key={source} value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField label="URL (Optionnel si fichier téléchargé)" name="url" value={currentResource.url || ''} onChange={handleInputChange} fullWidth error={!!formError && !selectedFile && !currentResource.url?.trim()} helperText={!!formError && !selectedFile && !currentResource.url?.trim() ? "Fournissez un fichier ou une URL." : ""} />
                            <Box>
                                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={isUploading}>
                                    {isUploading ? 'Téléchargement...' : 'Télécharger un fichier'}
                                    <input type="file" hidden onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                                </Button>
                                {selectedFile && <Typography variant="body2" sx={{ mt: 1 }}>Fichier sélectionné : {selectedFile.name}</Typography>}
                                {fileError && <Alert severity="error" sx={{ mt: 1 }}>{fileError}</Alert>}
                            </Box>
                            <FormGroup>
                                <FormControlLabel control={<Switch checked={currentResource.isRecommended || false} onChange={handleSwitchChange} name="isRecommended" />} label="Recommandé" />
                                <FormControlLabel control={<Switch checked={currentResource.isExclusive || false} onChange={handleSwitchChange} name="isExclusive" />} label="Exclusif" />
                            </FormGroup>
                            {formError && <Alert severity="error">{formError}</Alert>}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseAddEdit} disabled={isSubmitting || isUploading}>Annuler</Button>
                        <Button onClick={handleAddEditSubmit} variant="contained" disabled={isSubmitting || isUploading}>
                            {isSubmitting || isUploading ? <CircularProgress size={20} /> : (isEditMode ? 'Sauvegarder' : 'Ajouter')}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openDeleteDialog} onClose={handleCloseDelete} maxWidth="xs">
                    <DialogTitle>Confirmer la Suppression</DialogTitle>
                    <DialogContent>
                        <Typography>Voulez-vous supprimer "{resourceToDelete?.title}" ?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDelete} disabled={isSubmitting}>Annuler</Button>
                        <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={20} /> : 'Supprimer'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openImportDialog} onClose={handleCloseImport} maxWidth="md" fullWidth>
                    <DialogTitle>Importer des Ressources via AI</DialogTitle>
                    <DialogContent>
                        <TextField
                            label="Collez votre liste de ressources ici"
                            value={importInput}
                            onChange={(e) => setImportInput(e.target.value)}
                            fullWidth
                            multiline
                            rows={10}
                            placeholder={`Exemple:\nMathématiques: https://drive.google.com/drive/folders/...\n    - Untitled: https://drive.google.com/file/d/...\nSource: bejaia, Recommended: yes`}
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseImport} disabled={isSubmitting}>Annuler</Button>
                        <Button onClick={processImportInput} variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={20} /> : 'Importer'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </ThemeProvider>
    );
};

export default ResourcesPage;