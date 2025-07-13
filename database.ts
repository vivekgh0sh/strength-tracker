
import { db as firestoreDb } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { WorkoutLogs } from './types';

const GUEST_USER_ID = 'guest';

const localStorageDb = {
    fetchLogs: async (): Promise<WorkoutLogs> => {
        console.log('Fetching logs for guest user from localStorage');
        const data = localStorage.getItem(`workoutLogs_${GUEST_USER_ID}`);
        return data ? JSON.parse(data) : {};
    },
    saveLogs: async (logs: WorkoutLogs): Promise<boolean> => {
        console.log('Saving logs for guest user to localStorage');
        localStorage.setItem(`workoutLogs_${GUEST_USER_ID}`, JSON.stringify(logs));
        return true;
    },
};

const firebaseDb = {
    async fetchLogs(userId: string): Promise<WorkoutLogs> {
        console.log(`Fetching logs for user: ${userId} from Firestore`);
        const docRef = doc(firestoreDb, 'workoutLogs', userId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as WorkoutLogs) : {};
    },
    async saveLogs(userId: string, logs: WorkoutLogs): Promise<boolean> {
        console.log(`Saving logs for user: ${userId} to Firestore`);
        try {
            await setDoc(doc(firestoreDb, 'workoutLogs', userId), logs);
            return true;
        } catch (error) {
            console.error('Error saving logs to Firestore: ', error);
            return false;
        }
    },
};

export const db = {
    fetchLogs: (userId?: string): Promise<WorkoutLogs> => {
        return userId ? firebaseDb.fetchLogs(userId) : localStorageDb.fetchLogs();
    },
    saveLogs: (logs: WorkoutLogs, userId?: string): Promise<boolean> => {
        return userId ? firebaseDb.saveLogs(userId, logs) : localStorageDb.saveLogs(logs);
    },
};
