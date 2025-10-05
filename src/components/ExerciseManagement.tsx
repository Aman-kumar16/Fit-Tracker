import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';

import { useExercises } from '@/hooks/useExercises';
import { useAddExercise } from '@/hooks/useAddExercise';

export const ExerciseManagement = () => {
  // State for the input field
  const [newExerciseName, setNewExerciseName] = useState('');

  // NEW State for suggestions:
const [suggestions, setSuggestions] = useState<Exercise[]>([]); 
const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. USE REACT QUERY HOOKS FOR DATA
  const { 
    data: exercises = [], // Default to an empty array while loading
    isLoading, 
    isError 
  } = useExercises(); 

  const { 
    mutate: addExerciseMutation, 
    isPending: isAdding 
  } = useAddExercise();

  const handleAddExercise = () => {
    const nameToSave = newExerciseName.trim();

    if (!nameToSave) {
      toast.error('Please enter an exercise name(e.g., Bench Press');
      return;
    }
    
    // 2. DUPLICATE CHECK LOGIC (V2 Feature)
    // Check if the trimmed, lowercased name already exists in the current list
    const isDuplicate = exercises.some(
      (ex) => ex.name.trim().toLowerCase() === nameToSave.toLowerCase()
    );

    if (isDuplicate) {
      toast.error(`Exercise "${nameToSave}" already exists.`, { duration: 3000 });
      return;
    }
    
    // 3. PROCEED TO MUTATION
    addExerciseMutation(nameToSave, {
      onSuccess: () => {
        setNewExerciseName('');
        toast.success(`Exercise "${nameToSave}" added!`);
        // The list automatically re-fetches thanks to React Query
      },
      onError: (error) => {
        console.error('Error adding exercise:', error);
        toast.error('Failed to add exercise.');
      },
    });
  };

  const handleInputChange = (value: string) => {
  setNewExerciseName(value);

  const trimmedValue = value.trim().toLowerCase();
  
  if (trimmedValue.length > 0) {
    // Filter the full list of exercises from the React Query data
    const filtered = exercises.filter((ex) =>
      ex.name.toLowerCase().includes(trimmedValue)
    ).slice(0, 5); // Limit to top 5 matches for cleaner UI
    
    setSuggestions(filtered);
    setIsDropdownOpen(filtered.length > 0);
  } else {
    setSuggestions([]);
    setIsDropdownOpen(false);
  }
};

// Function to handle clicking a suggestion
const handleSelectSuggestion = (exerciseName: string) => {
    // Set the input value to the exact selected name
    setNewExerciseName(exerciseName); 
    // Close the dropdown
    setIsDropdownOpen(false);
    // You could also auto-focus the "Add" button here for better flow
}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading exercises...</div>
      </div>
    );
  }

  if (isError) {
    // Better error message for the user if the fetch fails
    return <div className="text-center text-red-500 min-h-[400px]">Failed to load exercises. Please try again.</div>;
  }
  
  // NOTE: We can now implement the Autocomplete dropdown logic here 
  // by filtering the `exercises` array as the user types in `newExerciseName`.

  return (
 <div className="space-y-6">
    {/* Use relative positioning for the dropdown container */}
    <div className="relative flex gap-3"> 
      {/* Input Field */}
      <Input
        placeholder="Exercise name (e.g., Bench Press)"
        value={newExerciseName}
        // Use the new handler
        onChange={(e) => handleInputChange(e.target.value)} 
        // Hide dropdown if the user presses Tab or Escape to exit the field
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        onFocus={() => handleInputChange(newExerciseName)} // Re-filter if focused again
        onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
        className="flex-1 bg-secondary border-border"
        disabled={isAdding}
      />
      
      {/* Autocomplete Dropdown */}
      {isDropdownOpen && suggestions.length > 0 && (
        <Card className="absolute top-full mt-1 w-full z-10 p-1">
          {suggestions.map((exercise) => (
            <div
              key={exercise.id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 rounded-md"
              // Use onMouseDown instead of onClick to prevent onBlur from firing first
              onMouseDown={() => handleSelectSuggestion(exercise.name)} 
            >
              {exercise.name}
            </div>
          ))}
        </Card>
      )}

      {/* Button */}
      <Button 
        onClick={handleAddExercise} 
        className="gap-2"
        disabled={isAdding} 
      >
        {isAdding ? 'Adding...' : (
          <>
            <Plus className="w-4 h-4" />
            Add
          </>
        )}
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