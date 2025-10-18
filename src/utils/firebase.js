// Add "use client" as Firebase authentication and Firestore listeners 
// need to run in the browser environment.
"use client";

import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged, signInWithCustomToken } from 'firebase/auth';
import { addDoc, collection, getFirestore, onSnapshot, query } from 'firebase/firestore';

// Global variables will be provided by the Canvas environment at runtime
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// 1. Initialize Firebase App, Auth, and Firestore
let app = null;
let auth = null;
let db = null;

if (typeof window !== 'undefined' && Object.keys(firebaseConfig).length > 0) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase services initialized.");
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase config not found or running in unsupported environment.");
}

/**
 * Sets up the authentication listener and handles sign-in with a custom token.
 * @param {function} onUserStateChange - Callback to update the user ID in the main component.
 * @param {function} onAuthReady - Callback to set the authentication readiness state.
 * @returns {function | null} - An unsubscribe function for the auth listener.
 */
export const setupFirebaseAuth = (onUserStateChange, onAuthReady) => {
    if (!auth) {
        onAuthReady(true);
        return null;
    }

    const unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
        if (user) {
            onUserStateChange(user.uid);
            onAuthReady(true);
        } else if (initialAuthToken) {
            try {
                const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                onUserStateChange(userCredential.user.uid);
                onAuthReady(true);
            } catch (tokenError) {
                console.error("Error signing in with custom token:", tokenError);
                onAuthReady(true);
            }
        } else {
            onUserStateChange(null);
            onAuthReady(true);
        }
    });

    return unsubscribeAuth;
};

/**
 * Sets up a real-time listener for the user's analysis history in Firestore.
 * @param {string} userId - The unique ID of the current user.
 * @param {function} onHistoryUpdate - Callback function to update the history state.
 * @param {function} onError - Callback function to handle loading errors.
 * @returns {function | null} - An unsubscribe function for the Firestore listener.
 */
export const subscribeToAnalysisHistory = (userId, onHistoryUpdate, onError) => {
    if (!db || !userId) {
        // If not ready, just return without subscribing
        return null;
    }

    try {
        // Define the collection path for private user data
        const historyCollectionPath = `/artifacts/${appId}/users/${userId}/analysis_history`;
        const q = query(collection(db, historyCollectionPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const docs = [];
            querySnapshot.forEach((doc) => {
                docs.push({ id: doc.id, ...doc.data() });
            });

            // Client-side sorting by timestamp descending (newest first)
            const sortedHistory = docs.sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeB - timeA;
            });

            onHistoryUpdate(sortedHistory);
            console.log(`History updated: ${sortedHistory.length} items.`);

        }, (error) => {
            console.error("Error fetching history: ", error);
            onError(true);
        });

        return unsubscribe; // Returns the function to stop listening
    } catch (e) {
        console.error("Error setting up history listener: ", e);
        onError(true);
        return null;
    }
};

/**
 * Saves a new prediction and analysis entry to the user's history in Firestore.
 * @param {string} userId - The unique ID of the current user.
 * @param {object} yoloData - The results from the YOLO prediction API.
 * @param {string} aiText - The text result from the Gemini analysis.
 * @param {File | null} file - The uploaded file object.
 */
export const saveAnalysisHistory = async (userId, yoloData, aiText, file) => {
    if (!db || !userId) {
        console.warn("Database or User ID not ready. Cannot save history.");
        return;
    }

    try {
        const historyCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/analysis_history`);
        
        await addDoc(historyCollectionRef, {
            timestamp: new Date().toISOString(),
            userId: userId,
            fileName: file ? file.name : "unknown_file",
            yoloDetections: yoloData.detections || [],
            aiAnalysisText: aiText || "Analysis failed to generate/not requested.",
            appId: appId,
        });
        console.log("Analysis history saved to Firestore successfully.");
    } catch (e) {
        console.error("Error saving analysis document to Firestore: ", e);
    }
};