// src/services/firestoreService.ts
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// Type for global exercise
export type Exercise = {
  id: string;
  name: string;
  createdAt?: Timestamp;
};

// Type for exercise log
export type ExerciseLog = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string; // 'YYYY-MM-DD'
  sets: { weight: number; reps: number }[];
  createdAt?: Timestamp;
};

// Add a new exercise
export const addExercise = async (name: string): Promise<string> => {
  const docRef = await addDoc(collection(db, "exercises"), {
    name,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Fetch all exercises (ordered by creation time)
export const fetchExercises = async (): Promise<Exercise[]> => {
  const q = query(collection(db, "exercises"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Omit<Exercise, "id">;
    return { id: doc.id, ...data };
  });
};

// Add a new exercise log
export const addExerciseLog = async (
  exerciseId: string,
  exerciseName: string,
  sets: { weight: number; reps: number }[]
): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const docRef = await addDoc(collection(db, "exercise_logs"), {
    exerciseId,
    exerciseName,
    date,
    sets,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Fetch logs for a specific date
export const fetchLogsByDate = async (date: string): Promise<ExerciseLog[]> => {
  const q = query(collection(db, "exercise_logs"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data() as Omit<ExerciseLog, "id">;
    return { id: doc.id, ...data };
  });
};

// Fetch last log for a specific exercise
export const getLastLogForExercise = async (
  exerciseId: string
): Promise<ExerciseLog | null> => {
  const q = query(
    collection(db, "exercise_logs"),
    where("exerciseId", "==", exerciseId),
    orderBy("date", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Omit<ExerciseLog, "id">;
  return { id: snap.docs[0].id, ...data };
};
