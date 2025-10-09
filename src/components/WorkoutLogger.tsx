import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exercise, WorkoutSet, LastRecord } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const WorkoutLogger = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // V2.0 RENAMED STATE: Master list of all available exercises
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]); 
  
  // V2.0 NEW STATE: Exercises already logged for the selected date
  const [loggedExercises, setLoggedExercises] = useState<Exercise[]>([]); 
  
  // V2.0 NEW STATE: The specific exercise the user is currently editing
  const [exerciseToLog, setExerciseToLog] = useState<Exercise | null>(null); 
  
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------
  // V2.0 DATA LOADING FOR LOGGED EXERCISES
  // ---------------------------------------------------------------------

  const loadLoggedExercises = useCallback(async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    try {
        const exercisesSubcollectionRef = collection(db, "workouts", dateStr, "exercises");
        const snapshot = await getDocs(exercisesSubcollectionRef);

        const loggedList = snapshot.docs.map(doc => {
            return {
                id: doc.id,
                name: doc.data().exerciseName || 'Unknown Exercise', 
                createdAt: new Date(), 
            } as Exercise;
        });

        setLoggedExercises(loggedList);

    } catch (error) {
        console.error("Error loading logged exercises:", error);
        setLoggedExercises([]);
    }
}, [selectedDate]);

  // ---------------------------------------------------------------------
  // DATA LOADING: Load Sets for the currently active exercise (V2.0 UPDATED)
  // ---------------------------------------------------------------------

  const loadWorkoutForDate = useCallback(async () => {
    // Uses V2.0 state
    if (!exerciseToLog) { 
      // Initialize with a default empty set if nothing is found
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const workoutRef = doc(
        db,
        "workouts",
        dateStr,
        "exercises",
        exerciseToLog.id
      );
      const snapshot = await getDocs(collection(workoutRef, "sets"));

      if (!snapshot.empty) {
        const loadedSets = snapshot.docs.map((doc) => ({
          weight: doc.data().weight,
          reps: doc.data().reps,
          timestamp: doc.data().timestamp.toDate(),
        }));
        setSets(loadedSets);
      } else {
        // If nothing is saved, start with one empty set
        setSets([{ weight: 0, reps: 0, timestamp: new Date() }]); 
      }
    } catch (error) {
      console.error("Error loading workout:", error);
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
    }
  }, [exerciseToLog, selectedDate, setSets]);

  // ---------------------------------------------------------------------
  // DATA LOADING: Load Last Record for the active exercise (V2.0 UPDATED)
  // ---------------------------------------------------------------------

  const loadLastRecord = useCallback(async () => {
    // Uses V2.0 state
    if (!exerciseToLog) { 
      setLastRecord(null);
      return;
    }

    const currentDateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Query all workouts before current date
      const workoutsRef = collection(db, "workouts");
      const q = query(
        workoutsRef,
        where("__name__", "<", currentDateStr),
        orderBy("__name__", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);

      // Find the most recent workout with this exercise
      for (const workoutDoc of snapshot.docs) {
        const exerciseRef = doc(
          db,
          "workouts",
          workoutDoc.id,
          "exercises",
          exerciseToLog.id
        );
        const setsSnapshot = await getDocs(collection(exerciseRef, "sets"));

        if (!setsSnapshot.empty) {
          const previousSets = setsSnapshot.docs.map((doc) => ({
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
      console.error("Error loading last record:", error);
      setLastRecord(null);
    }
  }, [exerciseToLog, selectedDate, setLastRecord]);

  // ---------------------------------------------------------------------
  // MASTER EXERCISE LIST LOADER (V2.0 RENAMED)
  // ---------------------------------------------------------------------

  const loadAvailableExercises = async () => {
    try {
      const snapshot = await getDocs(collection(db, "exercises"));
      const exerciseList = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        createdAt: doc.data().createdAt.toDate(),
      }));
      setAvailableExercises(exerciseList);
    } catch (error) {
      console.error("Error loading available exercises:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // USE EFFECT HOOKS
  // ---------------------------------------------------------------------

  // Load the master list of available exercises once on mount
  useEffect(() => {
    loadAvailableExercises();
  }, []);

  // Primary data loader: runs when date or active exercise changes
  useEffect(() => {
    // Always load the list of exercises that are already logged for the date
    loadLoggedExercises(); 
    
    // If the user is currently editing an exercise, load its sets and last record
    if (exerciseToLog) { 
      loadWorkoutForDate();
      loadLastRecord();
    } else {
       // Reset sets and last record when returning to the summary view
       setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
       setLastRecord(null);
    }
    
  }, [selectedDate, exerciseToLog, loadLoggedExercises, loadWorkoutForDate, loadLastRecord]);

  // ---------------------------------------------------------------------
  // MUTATIONS / HANDLERS
  // ---------------------------------------------------------------------

  const addSet = () => {
    // V2 UX: Auto-populate with last set's data
    const lastSet = sets[sets.length - 1];
    const newSetData = lastSet 
        ? { 
            weight: lastSet.weight, 
            reps: lastSet.reps, 
            timestamp: new Date() 
          }
        : { 
            weight: 0, 
            reps: 0, 
            timestamp: new Date() 
          };

    setSets([...sets, newSetData]);
  };

  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  const updateSet = (
    index: number,
    field: "weight" | "reps",
    value: number
  ) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };
  
  const handleRepInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      // V2 UX: Quick Add with Enter Key
      if (index === sets.length - 1 && e.key === 'Enter') {
          e.preventDefault(); 
          addSet();          
      }
  };


  const saveWorkout = async () => {
    if (!exerciseToLog || sets.length === 0) return; 

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      await setDoc(
        doc(db, "workouts", dateStr),
        {
          date: dateStr,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Save exercise data
      const exerciseRef = doc(
        db,
        "workouts",
        dateStr,
        "exercises",
        exerciseToLog.id
      );
      await setDoc(exerciseRef, {
        exerciseName: exerciseToLog.name,
        updatedAt: new Date(),
      });

      for (let i = 0; i < sets.length; i++) {
        await setDoc(doc(exerciseRef, "sets", `set-${i}`), { 
          ...sets[i],
          timestamp: new Date(),
        });
      }
      
      // V2.0 UI FIX: Go back to the summary view after saving
      setExerciseToLog(null); 
      // V2.0 UI FIX: Force refresh of the logged list
      loadLoggedExercises(); 

      toast.success("Workout saved!");
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // RENDER LOGIC (V2.0 Daily Summary / Exercise Detail)
  // ---------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Date Picker (Remains the same) */}
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, "PPP")}
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

      {exerciseToLog ? ( // Condition 1: User is logging/editing a specific exercise
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{exerciseToLog.name}</h3>
            <Button variant="outline" onClick={() => setExerciseToLog(null)}>
              Back to Log
            </Button>
          </div>

          {/* Last Record Card (Uses V2.0 state) */}
          {lastRecord && (
            <Card className="p-4 bg-accent/20 border-accent">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-semibold text-accent">
                  Last Record ({format(new Date(lastRecord.date), "MMM d, yyyy")})
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

          {/* Sets Logging Card (Remains the same) */}
          <Card className="p-4 bg-card border-border">
            <div className="space-y-3">
              <div className="grid grid-cols-[auto,1fr,1fr,auto] gap-3 items-center font-semibold text-sm text-muted-foreground">
                <div className="w-8">Set</div>
                <div>Weight (kg)</div>
                <div>Reps</div>
                <div className="w-8"></div>
              </div>

              {sets.map((set, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[auto,1fr,1fr,auto] gap-3 items-center"
                >
                  <div className="w-8 text-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <Input
                    type="number"
                    value={set.weight || ""}
                    onChange={(e) =>
                      updateSet(
                        index,
                        "weight",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="bg-secondary border-border text-center text-lg font-semibold"
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    value={set.reps || ""}
                    onChange={(e) =>
                      updateSet(index, "reps", parseInt(e.target.value) || 0)
                    }
                    // V2 UX: Quick Add
                    onKeyDown={(e) => handleRepInputKeyDown(e, index)}
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

              <Button
                onClick={addSet}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Set
              </Button>
            </div>
          </Card>

          <Button onClick={saveWorkout} className="w-full" size="lg">
            Save Workout
          </Button>
        </div>
      ) : ( // Condition 2: User is viewing the daily summary
        <div className="space-y-6">

          {/* Dropdown Selector to ADD NEW Exercise */}
          <h4 className="text-lg font-semibold mt-6">
            {loggedExercises.length > 0 ? 'Add Another Exercise' : 'Start Logging'}
          </h4>
          <Select
            onValueChange={(exerciseId) => {
              const exercise = availableExercises.find(ex => ex.id === exerciseId);
              if (exercise) {
                setExerciseToLog(exercise); // ⬅️ Sets the exercise to start logging
              }
            }}
            disabled={availableExercises.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={availableExercises.length === 0 ? "No exercises available" : "Choose Exercise..."} />
            </SelectTrigger>
            <SelectContent>
              {availableExercises
                .filter(ex => !loggedExercises.some(loggedEx => loggedEx.id === ex.id)) // Filter out already logged exercises
                .map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <h3 className="text-xl font-bold"> Exercises done on {format(selectedDate, "PPP")}</h3>

          {/* Display Logged Exercises (Logged Exercises List) */}
          {loggedExercises.length > 0 && (
            <Card className="p-4 space-y-3">
              {/* <h4 className="text-lg font-semibold">Logged Exercises</h4> */}
              {loggedExercises.map(exercise => (
                <Card
                  key={exercise.id}
                  className="p-4 bg-secondary border-border hover:border-primary cursor-pointer transition-all"
                  onClick={() => setExerciseToLog(exercise)} // ⬅️ Sets the exercise to edit
                >
                  <span className="font-semibold">{exercise.name}</span>
                </Card>
              ))}
            </Card>
          )}
          
          {/* No Exercises Available Message */}
          {availableExercises.length === 0 && (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">Go to the Exercises tab to add your first one.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};