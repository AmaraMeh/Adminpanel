// src/services/firestoreService.ts
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    where,
    getCountFromServer,
    limit,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- Interfaces (Match Firestore Structure) ---
export interface YearData {
    name: string;
    order: number;
}
export interface YearOption extends YearData {
    id: string;
}

export interface SpecialtyData {
    name: string;
    yearId: string;
    campus: string;
    icon: string;
}
export interface SpecialtyOption extends SpecialtyData {
    id: string;
}

export interface ModuleData {
    name: string;
    specialtyId: string;
    yearId: string;
    semesterKey: string;
    moduleCode?: string | null;
    coefficient: number;
    credits: number;
    evaluations: Array<"TD" | "TP" | "Examen">;
    noteEliminatoire?: number | null;
}
export interface ModuleRow extends ModuleData {
    id: string;
}

export interface ResourceData {
    moduleId: string;
    type: string;
    title: string;
    url: string;
    source?: string | null;
    isRecommended?: boolean | null;
    isExclusive?: boolean | null;
}
export interface ResourceRow extends ResourceData {
    id: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface UserProfileData {
    uid: string;
    email: string | null;
    fullName: string;
    matricule?: string | null;
    year?: string | null;
    speciality?: string | null;
    phoneNumber?: string | null;
    section?: string | null;
    group?: string | null;
    profilePicUrl?: string | null;
    createdAt?: any;
    isAdminRole?: boolean;
}

// --- Helper Functions ---
const generateIdFromName = (name: string, prefix: string = ''): string => {
    if (!name) return `${prefix}invalid-${Date.now()}`;
    const cleanedPrefix = prefix ? `${prefix}-` : '';
    return cleanedPrefix + name.toLowerCase()
        .replace(/ /g, '-')
        .replace(/[èéêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
        .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c')
        .replace(/[^\w-]+/g, '')
        .replace(/^-+|-+$/g, '');
};

const getSemesterIdPart = (semesterKey: string): string => {
    if (!semesterKey) return 'unk';
    const match = semesterKey.match(/\d+/);
    return match ? `s${match[0]}` : semesterKey.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const generateModuleId = (specialtyId: string, semesterKey: string, moduleName: string): string => {
    const semesterPart = getSemesterIdPart(semesterKey);
    const namePart = generateIdFromName(moduleName);
    if (!specialtyId || !semesterPart || !namePart || namePart.startsWith('invalid')) {
        throw new Error("Cannot generate module ID from invalid input.");
    }
    return `${specialtyId}_${semesterPart}_${namePart}`;
};

// --- Service Function Error Handling ---
const handleFirestoreError = (error: unknown, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    if ((error as any)?.code === 'permission-denied') {
        return new Error(`Permission refusée: ${context}. Vérifiez les règles Firestore.`);
    }
    const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    return new Error(`Impossible de ${context}: ${message}`);
};

// --- Year Service Functions ---
export const getYears = async (): Promise<YearOption[]> => {
    if (!db) throw new Error("Firestore non initialisé.");
    try {
        const yearsQuery = query(collection(db, "years"), orderBy("order", "asc"));
        const snapshot = await getDocs(yearsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YearOption));
    } catch (error) {
        throw handleFirestoreError(error, "charger les années");
    }
};

export const addYear = async (yearData: YearData): Promise<string> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!yearData.name || typeof yearData.order !== 'number') throw new Error("Nom et ordre requis.");
    try {
        const docRef = await addDoc(collection(db, "years"), { ...yearData, createdAt: serverTimestamp() });
        return docRef.id;
    } catch (error) {
        throw handleFirestoreError(error, "ajouter l'année");
    }
};

export const updateYear = async (id: string, yearData: Partial<YearData>): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        await updateDoc(doc(db, "years", id), { ...yearData, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, "màj l'année");
    }
};

export const deleteYear = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        const specQuery = query(collection(db, "specialties"), where("yearId", "==", id), limit(1));
        const countSnapshot = await getCountFromServer(specQuery);
        if (countSnapshot.data().count > 0) return { success: false, message: "Suppression impossible: Spécialités liées existent." };
        await deleteDoc(doc(db, "years", id));
        return { success: true };
    } catch (error) {
        throw handleFirestoreError(error, "supprimer l'année");
    }
};

// --- Specialty Service Functions ---
export const getSpecialties = async (): Promise<SpecialtyOption[]> => {
    if (!db) throw new Error("Firestore non initialisé.");
    try {
        const q = query(collection(db, "specialties"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            yearId: doc.data().yearId || '',
            campus: doc.data().campus || '',
            icon: doc.data().icon || 'book',
        } as SpecialtyOption));
    } catch (error) {
        throw handleFirestoreError(error, "charger les spécialités");
    }
};

export const addSpecialty = async (data: SpecialtyData): Promise<string> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!data.name || !data.yearId || !data.campus || !data.icon) throw new Error("Champs requis manquants.");
    try {
        const generatedId = generateIdFromName(data.name, 'spec');
        const docRef = doc(db, "specialties", generatedId);
        await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
        return generatedId;
    } catch (error) {
        throw handleFirestoreError(error, "ajouter la spécialité");
    }
};

export const updateSpecialty = async (id: string, data: Partial<SpecialtyData>): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        await updateDoc(doc(db, "specialties", id), { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, "màj la spécialité");
    }
};

export const deleteSpecialty = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        const modQuery = query(collection(db, "modules"), where("specialtyId", "==", id), limit(1));
        const countSnapshot = await getCountFromServer(modQuery);
        if (countSnapshot.data().count > 0) return { success: false, message: "Suppression impossible: Modules liés existent." };
        await deleteDoc(doc(db, "specialties", id));
        return { success: true };
    } catch (error) {
        throw handleFirestoreError(error, "supprimer la spécialité");
    }
};

// --- Module Service Functions ---
export const getModules = async (specialtyId: string): Promise<ModuleRow[]> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!specialtyId) return [];
    try {
        const q = query(
            collection(db, "modules"),
            where("specialtyId", "==", specialtyId),
            orderBy("name", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ModuleRow));
    } catch (error) {
        throw handleFirestoreError(error, "charger les modules");
    }
};

export const addModule = async (data: ModuleData): Promise<string> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!data.name || !data.specialtyId || !data.yearId || !data.semesterKey || data.coefficient == null || data.credits == null || !data.evaluations) {
        throw new Error("Champs requis manquants.");
    }
    data.coefficient = Number(data.coefficient) || 0;
    data.credits = Number(data.credits) || 0;
    data.noteEliminatoire = data.noteEliminatoire ? (Number(data.noteEliminatoire) || null) : null;
    try {
        const generatedId = generateModuleId(data.specialtyId, data.semesterKey, data.name);
        const docRef = doc(db, "modules", generatedId);
        await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
        return generatedId;
    } catch (error) {
        throw handleFirestoreError(error, "ajouter le module");
    }
};

export const updateModule = async (id: string, data: Partial<ModuleData>): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    if (data.coefficient !== undefined) data.coefficient = Number(data.coefficient) || 0;
    if (data.credits !== undefined) data.credits = Number(data.credits) || 0;
    if (data.noteEliminatoire !== undefined) data.noteEliminatoire = data.noteEliminatoire ? (Number(data.noteEliminatoire) || null) : null;
    try {
        await updateDoc(doc(db, "modules", id), { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, "màj le module");
    }
};

export const deleteModule = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        const resQuery = query(collection(db, "resources"), where("moduleId", "==", id), limit(1));
        const countSnapshot = await getCountFromServer(resQuery);
        if (countSnapshot.data().count > 0) return { success: false, message: "Suppression impossible: Ressources liées existent." };
        await deleteDoc(doc(db, "modules", id));
        return { success: true };
    } catch (error) {
        throw handleFirestoreError(error, "supprimer le module");
    }
};

// --- Resource Service Functions ---
export const getResources = async (moduleId: string): Promise<ResourceRow[]> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!moduleId) return [];
    try {
        console.log(`getResources: Fetching for moduleId: ${moduleId}`);
        const q = query(
            collection(db, "resources"),
            where("moduleId", "==", moduleId),
            orderBy("title", "asc")
        );
        const snapshot = await getDocs(q);
        console.log(`getResources: Found ${snapshot.docs.length} resources for ${moduleId}`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResourceRow));
    } catch (error) {
        throw handleFirestoreError(error, `charger les ressources (Module ID: ${moduleId})`);
    }
};

export const addResource = async (data: ResourceData): Promise<string> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!data.moduleId || !data.type || !data.title?.trim() || !data.url?.trim()) {
        throw new Error("Champs requis: ModuleID, Type, Titre, URL.");
    }
    try {
        const docRef = await addDoc(collection(db, "resources"), {
            ...data,
            title: data.title.trim(),
            url: data.url.trim(),
            source: data.source || null,
            isRecommended: data.isRecommended || false,
            isExclusive: data.isExclusive || false,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        throw handleFirestoreError(error, "ajouter la ressource");
    }
};

export const updateResource = async (id: string, data: Partial<ResourceData>): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    if (data.title !== undefined) data.title = data.title.trim();
    if (data.url !== undefined) data.url = data.url.trim();
    if (data.isRecommended !== undefined) data.isRecommended = !!data.isRecommended;
    if (data.isExclusive !== undefined) data.isExclusive = !!data.isExclusive;
    try {
        await updateDoc(doc(db, "resources", id), { ...data, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, "màj la ressource");
    }
};

export const deleteResource = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!id) throw new Error("ID manquant.");
    try {
        await deleteDoc(doc(db, "resources", id));
    } catch (error) {
        throw handleFirestoreError(error, "supprimer la ressource");
    }
};

// --- User Management Service Functions ---
export const getUsers = async (): Promise<UserProfileData[]> => {
    if (!db) throw new Error("Firestore non initialisé.");
    try {
        const usersQuery = query(collection(db, "users"), orderBy("fullName", "asc"));
        const snapshot = await getDocs(usersQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.id,
            email: doc.data().email ?? null,
            fullName: doc.data().fullName || 'N/A',
            matricule: doc.data().matricule || null,
            year: doc.data().year || null,
            speciality: doc.data().speciality || null,
            phoneNumber: doc.data().phoneNumber || null,
            section: doc.data().section || null,
            group: doc.data().group || null,
            profilePicUrl: doc.data().profilePicUrl || null,
            createdAt: doc.data().createdAt || null,
        } as UserProfileData));
    } catch (error) {
        throw handleFirestoreError(error, "charger les utilisateurs");
    }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfileData>): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!uid) throw new Error("UID utilisateur manquant.");
    const { uid: _uid, email: _email, createdAt: _createdAt, isAdminRole: _isAdmin, ...updateData } = data;
    if (Object.keys(updateData).length === 0) throw new Error("Aucune donnée à mettre à jour.");
    try {
        await updateDoc(doc(db, "users", uid), { ...updateData, updatedAt: serverTimestamp() });
    } catch (error) {
        throw handleFirestoreError(error, `màj profil utilisateur ${uid}`);
    }
};

export const deleteUserFirestoreDoc = async (uid: string): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!uid) throw new Error("UID manquant.");
    try {
        console.warn(`Deleting only Firestore document for user ${uid}. Auth user remains.`);
        await deleteDoc(doc(db, "users", uid));
    } catch (error) {
        throw handleFirestoreError(error, `supprimer doc utilisateur Firestore ${uid}`);
    }
};

export const makeAdmin = async (uid: string): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!uid) throw new Error("UID manquant.");
    try {
        await setDoc(doc(db, "admins", uid), { role: "admin", addedAt: serverTimestamp() });
        console.log(`User ${uid} added to admins collection.`);
    } catch (error) {
        throw handleFirestoreError(error, `rendre admin utilisateur ${uid}`);
    }
};

export const removeAdmin = async (uid: string): Promise<void> => {
    if (!db) throw new Error("Firestore non initialisé.");
    if (!uid) throw new Error("UID manquant.");
    try {
        await deleteDoc(doc(db, "admins", uid));
        console.log(`User ${uid} removed from admins collection.`);
    } catch (error) {
        throw handleFirestoreError(error, `retirer admin utilisateur ${uid}`);
    }
};