
// --- Data Interfaces ---
export interface SetData {
    reps: string;
    weight: string;
}

export interface ExerciseData {
    sets: SetData[];
}

export interface WorkoutLog {
    [exercise: string]: ExerciseData;
}

export interface WorkoutLogs {
    [date: string]: WorkoutLog;
}

export interface UserProfile {
    sub: string;
    picture: string;
    given_name: string;
    [key: string]: any; // Allows for other properties from Google profile
}
