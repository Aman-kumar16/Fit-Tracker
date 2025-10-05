import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseManagement } from "@/components/ExerciseManagement";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { Dumbbell, ClipboardList } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

const Index = () => {
  const [activeTab, setActiveTab] = useState("exercises");

  return (
    <div className="min-h-screen p-4 md:p-8 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        {/* Navbar */}
        <header className="mb-8 relative">
          {" "}
          {/* Making header relative for absolute positioning */}
          <div className="flex items-center justify-center">
            {" "}
            {/* Centering container */}
            <div className="flex justify-center items-center gap-3">
              <Dumbbell className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                FitTrack
              </h1>
            </div>
            {/* LOGOUT BUTTON - DESKTOP POSITIONING */}
            {/* Hide on mobile (`hidden`), show from medium screen up (`md:block`). */}
            <div className="hidden md:block absolute right-4 top-0">
              <LogoutButton />
            </div>
          </div>
          <p className="text-center text-muted-foreground mt-2">
            Track your workouts, crush your goals
          </p>
        </header>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="exercises" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              Exercises
            </TabsTrigger>
            <TabsTrigger value="workouts" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Workouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="space-y-6">
            <ExerciseManagement />
          </TabsContent>

          <TabsContent value="workouts" className="space-y-6">
            <WorkoutLogger />
          </TabsContent>
        </Tabs>

        {/* 
        // 2. LOGOUT FOOTER (MOBILE-ONLY POSITIONING)
        */}
        <div className="mt-12 pb-4 md:hidden">
          {" "}
          {/* Only display this section on mobile (`md:hidden`) */}
          <div className="border-t border-muted-foreground/30 pt-4">
            <div className="flex justify-center">
              <LogoutButton />
            </div>
            {/* Future Footer content goes here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
