import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Exercise, WorkoutSet, LastRecord } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const WorkoutLogger = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      loadWorkoutForDate();
      loadLastRecord();
    }
  }, [selectedExercise, selectedDate]);

  const loadExercises = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'exercises'));
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

  const loadWorkoutForDate = async () => {
    if (!selectedExercise) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      const workoutRef = doc(db, 'workouts', dateStr, 'exercises', selectedExercise.id);
      const snapshot = await getDocs(collection(workoutRef, 'sets'));
      
      if (!snapshot.empty) {
        const loadedSets = snapshot.docs.map(doc => ({
          weight: doc.data().weight,
          reps: doc.data().reps,
          timestamp: doc.data().timestamp.toDate(),
        }));
        setSets(loadedSets);
      } else {
        setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('Error loading workout:', error);
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
    }
  };

  const loadLastRecord = async () => {
    if (!selectedExercise) return;

    const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      // Query all workouts before current date
      const workoutsRef = collection(db, 'workouts');
      const q = query(
        workoutsRef,
        where('__name__', '<', currentDateStr),
        orderBy('__name__', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      
      // Find the most recent workout with this exercise
      for (const workoutDoc of snapshot.docs) {
        const exerciseRef = doc(db, 'workouts', workoutDoc.id, 'exercises', selectedExercise.id);
        const setsSnapshot = await getDocs(collection(exerciseRef, 'sets'));
        
        if (!setsSnapshot.empty) {
          const previousSets = setsSnapshot.docs.map(doc => ({
            weight: doc.data().weight,
            reps: doc.data().reps,
            timestamp: doc.data().timestamp.toDate(),
          }));
          
          setLastRecord({
            date: workoutDoc.id,
            sets: previousSets,
          });
          return;
        }
      }
      
      setLastRecord(null);
    } catch (error) {
      console.error('Error loading last record:', error);
      setLastRecord(null);
    }
  };

  const addSet = () => {
    setSets([...sets, { weight: 0, reps: 0, timestamp: new Date() }]);
  };

  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  const updateSet = (index: number, field: 'weight' | 'reps', value: number) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
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
      setDialogOpen(false);
      toast.success('Exercise added');
      loadExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast.error('Failed to add exercise');
    }
  };

  const saveWorkout = async () => {
    if (!selectedExercise || sets.length === 0) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      // Save workout metadata
      await setDoc(doc(db, 'workouts', dateStr), {
        date: dateStr,
        updatedAt: new Date(),
      }, { merge: true });

      // Save exercise data
      const exerciseRef = doc(db, 'workouts', dateStr, 'exercises', selectedExercise.id);
      await setDoc(exerciseRef, {
        exerciseName: selectedExercise.name,
        updatedAt: new Date(),
      });

      // Save sets
      for (let i = 0; i < sets.length; i++) {
        await setDoc(doc(exerciseRef, 'sets', `set-${i}`), {
          ...sets[i],
          timestamp: new Date(),
        });
      }

      toast.success('Workout saved!');
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {!selectedExercise ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Select an exercise to log</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Exercise
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Exercise</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Exercise name (e.g., Bench Press)"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addExercise()}
                    className="bg-secondary border-border"
                  />
                  <Button onClick={addExercise} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add Exercise
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {exercises.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">No exercises yet. Click "New Exercise" to add one!</p>
            </Card>
          ) : (
            exercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="p-4 bg-card border-border hover:border-primary cursor-pointer transition-all"
                onClick={() => setSelectedExercise(exercise)}
              >
                <span className="font-semibold">{exercise.name}</span>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{selectedExercise.name}</h3>
            <Button variant="outline" onClick={() => setSelectedExercise(null)}>
              Change Exercise
            </Button>
          </div>

          {lastRecord && (
            <Card className="p-4 bg-accent/20 border-accent">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-semibold text-accent">
                  Last Record ({format(new Date(lastRecord.date), 'MMM d, yyyy')})
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {lastRecord.sets.map((set, i) => (
                  <div key={i} className="text-muted-foreground">
                    Set {i + 1}: {set.weight} kg × {set.reps} reps
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 bg-card border-border">
            <div className="space-y-3">
              <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-3 items-center font-semibold text-sm text-muted-foreground">
                <div className="w-8">Set</div>
                <div>Weight (kg)</div>
                <div>Reps</div>
                <div className="w-8"></div>
              </div>

              {sets.map((set, index) => (
                <div key={index} className="grid grid-cols-[auto,1fr,1fr,auto] gap-3 items-center">
                  <div className="w-8 text-center font-bold text-primary">{index + 1}</div>
                  <Input
                    type="number"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(index, 'weight', parseFloat(e.target.value) || 0)}
                    className="bg-secondary border-border text-center text-lg font-semibold"
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                    className="bg-secondary border-border text-center text-lg font-semibold"
                    placeholder="0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSet(index)}
                    className="w-8 h-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button onClick={addSet} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Add Set
              </Button>
            </div>
          </Card>

          <Button onClick={saveWorkout} className="w-full" size="lg">
            Save Workout
          </Button>
        </div>
      )}
    </div>
  );
};
