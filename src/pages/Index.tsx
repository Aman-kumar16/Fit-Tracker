import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExerciseManagement } from '@/components/ExerciseManagement';
import { WorkoutLogger } from '@/components/WorkoutLogger';
import { Dumbbell, ClipboardList } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('workouts');

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Dumbbell className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FitTrack
            </h1>
          </div>
          <p className="text-muted-foreground">Track your workouts, crush your goals</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="workouts" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="exercises" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              Exercises
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="space-y-6">
            <WorkoutLogger />
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <ExerciseManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
