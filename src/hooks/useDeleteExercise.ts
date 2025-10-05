/* 
This hook handles the actual deletion from Firestore and invalidates the cache.
*/

import { doc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';

// Function to handle the deletion logic, including dependency cleanup
const deleteExerciseFromFirestore = async (exerciseId: string, cleanupWorkouts: boolean) => {
    const batch = writeBatch(db);
    const exerciseRef = doc(db, 'exercises', exerciseId);

    // 1. Delete the Exercise document
    batch.delete(exerciseRef);

    if (cleanupWorkouts) {
        // 2. Find all workout logs that use this exercise
        // NOTE: This assumes your Workouts collection structure.
        // If your workout items are stored in a nested subcollection (e.g., 'workouts/{id}/items/{id}'),
        // the query would need to be structured differently (e.g., using a Collection Group Query).
        const workoutsQuery = query(
            collection(db, 'workouts'),
            where('exercises', 'array-contains', exerciseId) // ASSUMPTION: Workout document has an array field 'exercises' containing IDs
        );

        const workoutSnapshot = await getDocs(workoutsQuery);

        // 3. Update all dependent workout logs
        workoutSnapshot.docs.forEach((workoutDoc) => {
            const workoutRef = doc(db, 'workouts', workoutDoc.id);
            // In a real app, you would update the specific item that holds the exerciseId.
            // For a simple model, we'll assume the exercise name is set to "Undefined".
            batch.update(workoutRef, {
                // This is a placeholder; actual logic depends on workout data structure.
                // For V2, consider a 'sets' subcollection in 'workouts'.
                // Example: 'workoutItems.exerciseName': 'Undefined' 
            });
        });
    }

    // Commit all operations
    await batch.commit();
};

export const useDeleteExercise = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, cleanupWorkouts }: { id: string, cleanupWorkouts: boolean }) =>
            deleteExerciseFromFirestore(id, cleanupWorkouts),
        onSuccess: () => {
            // Invalidate both exercises and workouts to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['exercises'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
};