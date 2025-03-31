import { signInWithEmailAndPassword, signOut, Auth, UserCredential } from "firebase/auth";
import { auth } from '../firebaseConfig'; // Import initialized auth

export const loginWithEmail = async (email: string, password: string): Promise<UserCredential> => {
    if (!auth) throw new Error("Auth service not initialized.");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login successful for:", userCredential.user.email);
        return userCredential;
    } catch (error: any) {
        console.error("Login Error:", error.code, error.message);
        // Provide more specific error messages based on error.code
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            throw new Error("Email ou mot de passe incorrect.");
        } else if (error.code === 'auth/invalid-email') {
             throw new Error("Format d'email invalide.");
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error("Trop de tentatives. Réessayez plus tard.");
        } else {
            throw new Error("Erreur de connexion inconnue.");
        }
    }
};

export const logoutFirebase = async (): Promise<void> => {
    if (!auth) throw new Error("Auth service not initialized.");
    try {
        await signOut(auth);
        console.log("User signed out.");
    } catch (error) {
        console.error("Logout Error:", error);
        throw new Error("Erreur lors de la déconnexion.");
    }
};