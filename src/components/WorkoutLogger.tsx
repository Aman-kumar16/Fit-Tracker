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
  getDoc, // VITAL: Imported for fetching root workout document
  writeBatch, // Not fully implemented, but imported for future batch save fix
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
// NOTE: Assuming this hook and its dependency logic are defined in a separate file
import { useRemoveExerciseFromLog } from "@/hooks/useRemoveExerciseFromLog";

export const WorkoutLogger = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // V2.1 STATE: Master list of all available exercises
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);

  // V2.1 STATE: Exercises already logged for the selected date
  const [loggedExercises, setLoggedExercises] = useState<Exercise[]>([]);

  // V2.1 STATE: The specific exercise the user is currently editing
  const [exerciseToLog, setExerciseToLog] = useState<Exercise | null>(null);

  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [lastRecord, setLastRecord] = useState<LastRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayTitle, setDayTitle] = useState<string>(""); // V2.1 FEATURE: Daily Workout Title/Tag
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false); // NEW STATE for tag editing

  // V2 HOOK: Use the mutation hook for removing an exercise
  const { mutate: removeExerciseMutation, isPending: isRemoving } =
    useRemoveExerciseFromLog();

  // ---------------------------------------------------------------------
  // V2.1 DATA SAVING (Day Title/Tag)
  // ---------------------------------------------------------------------

  const saveDayTitle = async (title: string) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      await setDoc(
        doc(db, "workouts", dateStr),
        {
          title: title.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving day title:", error);
      toast.error("Failed to save day title.");
    }
  };

  // ---------------------------------------------------------------------
  // V2.1 DATA LOADING FOR LOGGED EXERCISES (CORE FIX)
  // ---------------------------------------------------------------------

  const loadLoggedExercises = useCallback(async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // 1. Fetch the root workout document first
      const workoutDocRef = doc(db, "workouts", dateStr);
      const workoutDocSnap = await getDoc(workoutDocRef);

      if (workoutDocSnap.exists()) {
        // Set the day title state
        setDayTitle(workoutDocSnap.data().title || "");
      } else {
        setDayTitle("");
      }

      // 2. Fetch logged exercises
      const exercisesSubcollectionRef = collection(
        db,
        "workouts",
        dateStr,
        "exercises"
      );

      //  Simple fetch without strict ordering
      const snapshot = await getDocs(exercisesSubcollectionRef);

      const loggedList = snapshot.docs.map((doc) => {
        return {
          id: doc.id,
          name: doc.data().exerciseName || "Unknown Exercise",
          createdAt: new Date(),
          // VITAL: Provide a fallback value (e.g., 999) for old data that has NO index!
          orderIndex: doc.data().orderIndex || 999,
        } as Exercise;
      });

      // Client-side sort with fallback for old data
      loggedList.sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));

      setLoggedExercises(loggedList);
    } catch (error) {
      console.error("Error loading logged exercises:", error);
      setLoggedExercises([]);
    }
  }, [selectedDate, setDayTitle]);

  // ---------------------------------------------------------------------
  // DATA LOADING: Load Sets for the currently active exercise (useCallback fixed)
  // ---------------------------------------------------------------------

  const loadWorkoutForDate = useCallback(async () => {
    if (!exerciseToLog) {
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
      return;
    }
    // ... (rest of loadWorkoutForDate logic remains the same) ...
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
        setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
      }
    } catch (error) {
      console.error("Error loading workout:", error);
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
    }
  }, [exerciseToLog, selectedDate, setSets]);

  // ---------------------------------------------------------------------
  // DATA LOADING: Load Last Record (useCallback fixed)
  // ---------------------------------------------------------------------

  const loadLastRecord = useCallback(async () => {
    if (!exerciseToLog) {
      setLastRecord(null);
      return;
    }
    // ... (rest of loadLastRecord logic remains the same) ...
    const currentDateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const workoutsRef = collection(db, "workouts");
      const q = query(
        workoutsRef,
        where("__name__", "<", currentDateStr),
        orderBy("__name__", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);

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

  useEffect(() => {
    loadAvailableExercises();
  }, []);

  useEffect(() => {
    // VITAL: This ensures data reloads when switching dates or exercises
    loadLoggedExercises();

    if (exerciseToLog) {
      loadWorkoutForDate();
      loadLastRecord();
    } else {
      setSets([{ weight: 0, reps: 0, timestamp: new Date() }]);
      setLastRecord(null);
    }
  }, [
    selectedDate,
    exerciseToLog,
    loadLoggedExercises,
    loadWorkoutForDate,
    loadLastRecord,
  ]);

  // ---------------------------------------------------------------------
  // MUTATIONS / HANDLERS
  // ---------------------------------------------------------------------

  const handleRemoveExercise = (exerciseId: string) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (
      !window.confirm(
        `Are you sure you want to remove this exercise from the log for ${format(
          selectedDate,
          "PPP"
        )}? This action is permanent.`
      )
    ) {
      return;
    }

    removeExerciseMutation(
      { dateStr, exerciseId },
      {
        onSuccess: () => {
          loadLoggedExercises();
          toast.success("Exercise removed from log!");
        },
        onError: (error) => {
          console.error("Error removing exercise:", error);
          toast.error("Failed to remove exercise from log.");
        },
      }
    );
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSetData = lastSet
      ? {
          weight: lastSet.weight,
          reps: lastSet.reps,
          timestamp: new Date(),
        }
      : {
          weight: 0,
          reps: 0,
          timestamp: new Date(),
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

  const handleRepInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (index === sets.length - 1 && e.key === "Enter") {
      e.preventDefault();
      addSet();
    }
  };

  const saveWorkout = async () => {
    if (!exerciseToLog || sets.length === 0) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // V2 FIX: Determine the order index
    // NOTE: This uses the CURRENT length, which is correct for adding to the end.
    const newOrderIndex = loggedExercises.length + 1;

    try {
      // 1. Save root workout metadata (title is already saved on blur)
      await setDoc(
        doc(db, "workouts", dateStr),
        { date: dateStr, updatedAt: new Date(), title: dayTitle },
        { merge: true }
      );

      // 2. Save exercise data (V2 FIX: ADD orderIndex)
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
        orderIndex: newOrderIndex, // VITAL FIX: Save the order
      });

      // 3. Save sets
      for (let i = 0; i < sets.length; i++) {
        await setDoc(doc(exerciseRef, "sets", `set-${i}`), {
          ...sets[i],
          timestamp: new Date(),
        });
      }

      setExerciseToLog(null);
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

  return (
    <div className="space-y-6">
      {/* Date Picker (V2.1 UI: Calendar auto-close) */}
      <div className="flex items-center justify-between">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                }
              }}
              initialFocus
              classNames={{
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                day_today: "bg-accent text-accent-foreground rounded-full",
              }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* RENDER LOGIC: EXERCISE LOGGING VIEW */}
      {/* -------------------------------------------------------------- */}
      {exerciseToLog ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">{exerciseToLog.name}</h3>
            <Button variant="outline" onClick={() => setExerciseToLog(null)}>
              Back to Log
            </Button>
          </div>
          {/* ... (Sets and Last Record Cards) ... */}
          {/* Last Record Card (You may need to re-add this component) */}
          {lastRecord && (
            <Card className="p-4 bg-accent/20 border-accent">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="font-semibold text-accent">
                  Last Record (
                  {format(new Date(lastRecord.date), "MMM d, yyyy")})
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
            {/* Sets Grid */}
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
      ) : (
        <div className="space-y-6">
          {/* Dropdown Selector to ADD NEW Exercise */}
          <h4 className="text-lg font-semibold mt-6">
            {loggedExercises.length > 0
              ? "Add Another Exercise"
              : "Start Logging"}
          </h4>
          <Select
            onValueChange={(exerciseId) => {
              const exercise = availableExercises.find(
                (ex) => ex.id === exerciseId
              );
              if (exercise) {
                setExerciseToLog(exercise);
              }
            }}
            disabled={availableExercises.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  availableExercises.length === 0
                    ? "No exercises available"
                    : "Choose Exercise..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableExercises
                .filter(
                  (ex) =>
                    !loggedExercises.some((loggedEx) => loggedEx.id === ex.id)
                )
                .map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <h3 className="text-xl font-bold">
            Exercises on {format(selectedDate, "PPP")}
          </h3>

          {/* V2 FIX: Responsive Title Display/Edit Toggle */}
          <div className="flex items-center justify-center p-3">
            {/* If Title is empty OR we are in editing mode, show the Input */}
            {dayTitle === "" || isTitleEditing ? (
              <Input
                placeholder="e.g., Push Day, Legs, Full Body Workout"
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                onBlur={(e) => {
                  saveDayTitle(e.target.value);
                  // ⬅️ VITAL: Switch back to display mode after saving/blurring
                  setIsTitleEditing(false);
                }}
                // VITAL: Auto-focus when in editing mode
                autoFocus
                className="text-xl font-bold w-full max-w-sm text-center bg-secondary border-primary/50"
              />
            ) : (
              // If Title exists AND we are NOT editing, show the clean text display
              <div
                className="flex items-center gap-3 cursor-pointer p-1 rounded-md hover:bg-secondary transition-colors"
                onClick={() => setIsTitleEditing(true)} // ⬅️ Click text to start editing
              >
                <h3 className="text-2xl font-bold text-center text-foreground">
                  {dayTitle}
                </h3>
                {/* Optional: Add a small edit icon next to the title */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground"
                >
                  {/* Pencil or Edit icon from Lucide React */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-pencil"
                  >
                    <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* Display Logged Exercises (Logged Exercises List or No Logs Message) */}
          {loggedExercises.length > 0 ? (
            <Card className="p-4 space-y-3">
              {loggedExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between p-0"
                >
                  <Card
                    className="flex-grow p-4 bg-secondary border-border hover:border-primary cursor-pointer transition-all"
                    onClick={() => setExerciseToLog(exercise)}
                  >
                    <span className="font-semibold">{exercise.name}</span>
                  </Card>

                  {/* V2.1 FEATURE: Date-Specific Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 text-muted-foreground hover:text-red-500 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveExercise(exercise.id);
                    }}
                    disabled={isRemoving}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">
                No workouts logged for this date. Use dropdown below to get
                started!
              </p>
            </Card>
          )}

          {availableExercises.length === 0 && (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">
                Go to the Exercises tab to add your first one.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
