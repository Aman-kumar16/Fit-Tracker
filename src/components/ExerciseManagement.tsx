import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Exercise } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';

export const ExerciseManagement = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const q = query(collection(db, 'exercises'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const exerciseList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        createdAt: doc.data().createdAt.toDate(),
      }));
      setExercises(exerciseList);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = async () => {
    if (!newExerciseName.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }

    try {
      await addDoc(collection(db, 'exercises'), {
        name: newExerciseName.trim(),
        createdAt: new Date(),
      });
      
      setNewExerciseName('');
      toast.success('Exercise added');
      loadExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast.error('Failed to add exercise');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Exercise name (e.g., Bench Press)"
          value={newExerciseName}
          onChange={(e) => setNewExerciseName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addExercise()}
          className="flex-1 bg-secondary border-border"
        />
        <Button onClick={addExercise} className="gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <div className="grid gap-3">
        {exercises.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No exercises yet. Add your first exercise above!</p>
          </Card>
        ) : (
          exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="p-4 bg-card border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">{exercise.name}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
