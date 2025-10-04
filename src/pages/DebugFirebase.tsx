// src/pages/DebugFirebase.tsx
import React, { useEffect, useState } from "react";
import { Exercise, fetchExercises } from "../services/firestoreService";

export default function DebugFirebase() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const list = await fetchExercises();
        setExercises(list);
      } catch (err) {
        console.error("Error fetching exercises:", err);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  if (loading) return <p className="p-4">Loading exercises...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Exercises in Firestore</h2>
      {exercises.length === 0 ? (
        <p>No exercises found. Add some via Firebase Console or your form.</p>
      ) : (
        <ul className="list-disc pl-6">
          {exercises.map((e) => (
            <li key={e.id}>
              {e.name} (ID: {e.id})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
