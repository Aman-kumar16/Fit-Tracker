import { collection, getDocs, query, orderBy, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { Exercise } from '@/types/workout';

// Function to fetch exercises from Firestore
const fetchExercises = async (): Promise<Exercise[]> => {
  // NOTE: For later verisons, we MUST filter by user ID here using `where('userId', '==', auth.currentUser.uid)`
  const q = query(collection(db, 'exercises'), orderBy('createdAt', 'desc'));
  const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);

  const exerciseList: Exercise[] = snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(), 
  }));

  return exerciseList;
};

// React Query hook for fetching exercises
export const useExercises = () => {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercises,
    staleTime: 1000 * 60 * 2, // Data is considered fresh for 2 minutes
  });
};