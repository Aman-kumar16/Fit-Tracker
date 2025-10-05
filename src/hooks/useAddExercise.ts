import { addDoc, collection } from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';

// Function to add a single exercise
const addExerciseToFirestore = async (name: string) => {
  // NOTE: For later versions, you MUST include the current user ID in the document
  await addDoc(collection(db, 'exercises'), {
    name: name,
    createdAt: new Date(),
  });
};

// React Query hook for adding an exercise
export const useAddExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addExerciseToFirestore,
    // When the mutation is successful, invalidate the 'exercises' cache
    // This tells the `useExercises` hook to automatically re-fetch the new list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
};