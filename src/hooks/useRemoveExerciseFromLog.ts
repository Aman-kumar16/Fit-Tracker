// src/hooks/useRemoveExerciseFromLog.ts

import { doc, deleteDoc } from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';

const removeExerciseFromLog = async ({ dateStr, exerciseId }: { dateStr: string, exerciseId: string }) => {
    // Path to the specific exercise document for the selected date
    const exerciseDocRef = doc(db, 
        'workouts', dateStr, 
        'exercises', exerciseId
    );
    
    // NOTE: Deleting this document effectively removes the exercise and its 'sets' subcollection
    // for this date only, due to Firestore's subcollection structure.
    await deleteDoc(exerciseDocRef);
};

export const useRemoveExerciseFromLog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeExerciseFromLog,
        onSuccess: () => {
            // Invalidate the 'logged exercises' query to force a UI refresh
            queryClient.invalidateQueries({ queryKey: ['loggedExercises'] });
            // Optionally, invalidate other relevant caches like 'workouts'
        },
    });
};