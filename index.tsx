import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Chart, registerables } from 'chart.js';
import './index.css';
import { db } from './database';
import { UserProfile, WorkoutLogs, WorkoutLog, ExerciseData, SetData } from './types';


Chart.register(...registerables);

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

const WORKOUT_SCHEDULE = {
  0: { name: 'Leg Day', exercises: ['Squats', 'Leg Extension', 'Leg Press', 'Reverse Curls', 'Calf Raises'] }, // Sunday
  1: { name: 'Chest & Triceps', exercises: ['Incline Bench Press', 'Chest fly', 'Pushups', 'Triceps Cable Pushdown', 'Flat Bench Triceps Barbell press', 'Dips'] },
  2: { name: 'Cardio', exercises: ['Treadmill', 'Water Rowing'] },
  3: { name: 'Back & Biceps', exercises: ['Lat pull down', 'Bent Over Dumbell Rowing', 'Pullups', 'Dumbell Curls', 'Hammer Biceps', 'Preach Curl'] },
  4: { name: 'Cardio', exercises: ['Treadmill', 'Water Rowing'] },
  5: { name: 'Shoulders', exercises: ['Dumbell Side Raises', 'Shoulder Presses', 'Rear Delts', 'Traps (Smith)'] },
  6: { name: 'Cardio', exercises: ['Treadmill', 'Water Rowing'] }, // Saturday
};

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface WorkoutCardProps {
    exercise: string;
    data: ExerciseData | undefined;
    onDataChange: (exercise: string, data: ExerciseData) => void;
    isCardio: boolean;
}

const WorkoutCard = ({ exercise, data, onDataChange, isCardio }: WorkoutCardProps) => {
    const sets: SetData[] = data?.sets || [{ reps: '', weight: '' }];

    const handleSetChange = (setIndex: number, field: keyof SetData, value: string) => {
        const newSets = [...sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        onDataChange(exercise, { ...data, sets: newSets });
    };

    const addSet = () => {
        const newSets = [...sets, { reps: '', weight: '' }];
        onDataChange(exercise, { ...data, sets: newSets });
    };

    const removeSet = (setIndex: number) => {
        if (sets.length <= 1) return;
        const newSets = sets.filter((_, index) => index !== setIndex);
        onDataChange(exercise, { ...data, sets: newSets });
    };

    const totalVolume = useMemo(() => {
        return sets.reduce((acc, set) => {
            const reps = parseFloat(set.reps) || 0;
            const weight = parseFloat(set.weight) || 0;
            return acc + (reps * weight);
        }, 0);
    }, [sets]);
    
    if (isCardio) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{exercise}</h3>
                </div>
                 <p className="card-description">
                    {exercise === 'Treadmill' ? '20 mins (7 inclined, 7 brisk, 4:30 jog, 1:30 walk)' : '7 mins water rowing'}
                </p>
            </div>
        )
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{exercise}</h3>
            </div>
            <div className="set-grid">
                <div className="header">Set</div>
                <div className="header">Reps</div>
                <div className="header">Weight (kg)</div>
                <div></div>
                {sets.map((set, index) => (
                    <React.Fragment key={index}>
                        <div>{index + 1}</div>
                        <input
                            type="number"
                            className="input"
                            aria-label={`${exercise} set ${index + 1} reps`}
                            placeholder="0"
                            value={set.reps}
                            onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                        />
                        <input
                            type="number"
                            className="input"
                            aria-label={`${exercise} set ${index + 1} weight`}
                            placeholder="0"
                            value={set.weight}
                            onChange={(e) => handleSetChange(index, 'weight', e.target.value)}
                        />
                         <button
                            className="btn btn-destructive"
                            aria-label={`Remove set ${index + 1} for ${exercise}`}
                            onClick={() => removeSet(index)}
                            disabled={sets.length <= 1}
                        >
                            &times;
                        </button>
                    </React.Fragment>
                ))}
            </div>
            <div className="card-footer">
                 <p className="total-volume">Volume: <span>{totalVolume.toFixed(2)} kg</span></p>
                 <button className="btn btn-secondary" onClick={addSet}>Add Set</button>
            </div>
        </div>
    );
};

interface WorkoutLoggerProps {
    selectedDate: string;
    logs: WorkoutLogs;
    onSave: (date: string, data: WorkoutLog) => void;
    onDateChange: (date: string) => void;
}

const WorkoutLogger = ({ selectedDate, logs, onSave, onDateChange }: WorkoutLoggerProps) => {
    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
    const schedule = WORKOUT_SCHEDULE[dayOfWeek];
    const isCardioDay = schedule.name === 'Cardio';

    const [workoutData, setWorkoutData] = useState<WorkoutLog>({});

    useEffect(() => {
        setWorkoutData(logs[selectedDate] || {});
    }, [selectedDate, logs]);
    
    const handleDataChange = (exercise: string, data: ExerciseData) => {
        setWorkoutData(prev => ({ ...prev, [exercise]: data }));
    };

    const handleSave = () => {
        onSave(selectedDate, workoutData);
        alert('Progress saved and synced!');
    };

    return (
        <div className="content-area">
             <div className="date-selector">
                <label htmlFor="workout-date">Select Workout Date</label>
                <input
                  id="workout-date"
                  type="date"
                  className="date-input"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                />
            </div>
            <div className="card">
                 <h2 className="card-title">{schedule.name}</h2>
                 <p className="card-description">Exercises for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="workout-grid">
                {schedule.exercises.map(exercise => (
                    <WorkoutCard
                        key={exercise}
                        exercise={exercise}
                        data={workoutData[exercise]}
                        onDataChange={handleDataChange}
                        isCardio={isCardioDay}
                    />
                ))}
            </div>
            {!isCardioDay && (
                <button onClick={handleSave} className="btn btn-primary" style={{padding: '1rem'}}>
                    Save Progress
                </button>
            )}
        </div>
    );
};

interface ProgressTrackerProps {
    logs: WorkoutLogs;
}

const ProgressTracker = ({ logs }: ProgressTrackerProps) => {
    const allExercises = useMemo(() => {
        const exerciseSet = new Set<string>();
        Object.values(WORKOUT_SCHEDULE).forEach(day => {
            if(day.name !== 'Cardio') {
                day.exercises.forEach(ex => exerciseSet.add(ex));
            }
        });
        return Array.from(exerciseSet).sort();
    }, []);
    
    const [selectedExercise, setSelectedExercise] = useState<string>(allExercises[0] || '');
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current || !logs || !selectedExercise) return;

        const sortedDates = Object.keys(logs).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

        const chartData = {
            labels: [] as string[],
            datasets: [{
                label: `Total Volume (kg) for ${selectedExercise}`,
                data: [] as number[],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.1,
            }]
        };

        sortedDates.forEach(date => {
            const log = logs[date];
            if (log && log[selectedExercise] && log[selectedExercise].sets) {
                const volume = log[selectedExercise].sets.reduce((acc, set) => {
                    return acc + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0);
                }, 0);
                
                if (volume > 0) {
                    chartData.labels.push(new Date(date + 'T00:00:00').toLocaleDateString('en-CA'));
                    chartData.datasets[0].data.push(volume);
                }
            }
        });

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)'}, ticks: { color: '#a1a1aa' } },
                        x: { grid: { color: 'rgba(255, 255, 255, 0.1)'}, ticks: { color: '#a1a1aa' } }
                    },
                    plugins: { legend: { labels: { color: '#fafafa' } } }
                }
            });
        }

        // Cleanup function to destroy chart instance on component unmount
        return () => {
            chartInstance.current?.destroy();
        }
    }, [logs, selectedExercise]);


    return (
        <div className="progress-container">
            <div className="progress-selector">
                <label htmlFor="exercise-select">Select Exercise to Track</label>
                <select 
                    id="exercise-select"
                    className="select"
                    value={selectedExercise} 
                    onChange={e => setSelectedExercise(e.target.value)}
                >
                    {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
            </div>
            <div className="chart-container">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

interface FitnessTrackerProps {
    user: UserProfile | null;
    onLogout: (() => void) | null;
}

const FitnessTracker = ({ user, onLogout }: FitnessTrackerProps) => {
  const [activeView, setActiveView] = useState('log');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogs>({});
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.sub;

  useEffect(() => {
    setIsLoading(true);
    db.fetchLogs(userId).then(logs => {
        setWorkoutLogs(logs);
        setIsLoading(false);
    });
  }, [userId]);

  const handleSave = (date: string, data: WorkoutLog) => {
    const newLogs = { ...workoutLogs, [date]: data };
    setWorkoutLogs(newLogs);
    db.saveLogs(newLogs, userId);
  };

  const displayName = user ? user.given_name : 'Guest';
  const displayPicture = user ? user.picture : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👤</text></svg>';

  return (
    <>
      <header>
        <div>
          <h1>Fitness Tracker</h1>
        </div>
        <div className="user-profile">
            <img src={displayPicture} alt="User avatar" className="user-avatar" />
            <span className="user-name">Welcome, {displayName}</span>
            {onLogout && (
                 <button onClick={onLogout} className="btn btn-secondary">Sign Out</button>
            )}
        </div>
      </header>

      <div className="tabs">
        <button className={`tab-button ${activeView === 'log' ? 'active' : ''}`} onClick={() => setActiveView('log')} aria-pressed={activeView === 'log'}>Log Workout</button>
        <button className={`tab-button ${activeView === 'progress' ? 'active' : ''}`} onClick={() => setActiveView('progress')} aria-pressed={activeView === 'progress'}>Progress</button>
      </div>
      
      {isLoading ? (
        <div className="loading-container">Loading your data...</div>
      ) : activeView === 'log' ? (
        <WorkoutLogger 
            selectedDate={selectedDate} 
            logs={workoutLogs} 
            onSave={handleSave}
            onDateChange={setSelectedDate}
        />
      ) : (
        <ProgressTracker logs={workoutLogs} />
      )}
    </>
  );
};

interface LoginScreenProps {
    onLogin: () => void;
    onContinueAsGuest: () => void;
}

const LoginScreen = ({ onLogin, onContinueAsGuest }: LoginScreenProps) => {
    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Fitness Progress Tracker</h1>
                <p>Sign in with your Google account to save and sync your workout data across all your devices.</p>
                <button onClick={() => onLogin()} className="google-btn">
                     <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.453,44,30.836,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                    Sign in with Google
                </button>
                <button onClick={onContinueAsGuest} className="btn btn-secondary" style={{marginTop: '1rem'}}>
                    Continue as Guest
                </button>
            </div>
        </div>
    );
};

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loginError, setLoginError] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('googleUserProfile');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsGuest(false);
    } else {
        const wasGuest = localStorage.getItem('isGuestUser') === 'true';
        if (wasGuest) {
            setIsGuest(true);
        }
    }
  }, []);

  const handleLoginSuccess = async (profile: UserProfile) => {
      const guestLogs = await db.fetchLogs(); 
      const userLogs = await db.fetchLogs(profile.sub);
      const mergedLogs = { ...guestLogs, ...userLogs };
      await db.saveLogs(mergedLogs, profile.sub);

      localStorage.removeItem('isGuestUser');
      localStorage.removeItem('workoutLogs_guest');
      setIsGuest(false);

      setUser(profile);
      localStorage.setItem('googleUserProfile', JSON.stringify(profile));
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoginError(null);
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenResponse.access_token}`,
            },
        });
        const profile: UserProfile = await res.json();
        await handleLoginSuccess(profile);
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        setLoginError({error: 'profile_fetch_failed'});
      }
    },
    onError: (error) => {
      console.error('Login Failed', error);
      setLoginError(error);
    },
  });

  const logout = () => {
    googleLogout();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('googleUserProfile');
    localStorage.removeItem('isGuestUser');
  };
  
  const continueAsGuest = () => {
      setIsGuest(true);
      localStorage.setItem('isGuestUser', 'true');
  };

  const handleTryAgain = () => {
    setLoginError(null);
    login();
  };

  const showLoginScreen = !user && !isGuest;
  const showFitnessTracker = user || isGuest;

  return (
    <div className="app-container">
      {loginError ? (
        <LoginScreen onLogin={login} onContinueAsGuest={continueAsGuest} />
      ) : showLoginScreen ? (
        <LoginScreen onLogin={login} onContinueAsGuest={continueAsGuest} />
      ) : showFitnessTracker ? (
        <FitnessTracker user={user} onLogout={logout} />
      ) : null }
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={CLIENT_ID}>
            <App />
        </GoogleOAuthProvider>
    </React.StrictMode>
);

