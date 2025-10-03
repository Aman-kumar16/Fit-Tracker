export interface Exercise {
  id: string;
  name: string;
  createdAt: Date;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  timestamp: Date;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface Workout {
  date: string; // YYYY-MM-DD format
  exercises: Record<string, ExerciseLog>;
}

export interface LastRecord {
  date: string;
  sets: WorkoutSet[];
}
