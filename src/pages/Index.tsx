import { Header } from '@/components/Header';
import { TripForm } from '@/components/TripForm';
import { TripList } from '@/components/TripList';
import { MileageSummary } from '@/components/MileageSummary';
import { useTrips } from '@/hooks/useTrips';
import { usePrograms } from '@/hooks/usePrograms';
import { toast } from 'sonner';

const Index = () => {
  const { trips, addTrip, deleteTrip, totalMiles } = useTrips();
  const { programs, loading: programsLoading, addProgram, updateProgram, deleteProgram } = usePrograms();

  const handleCalculateRoute = async (from: string, to: string) => {
    // Generate Google Maps embed URL for the route
    const encodedFrom = encodeURIComponent(from);
    const encodedTo = encodeURIComponent(to);
    
    // Google Maps directions URL (for linking)
    const directionsUrl = `https://www.google.com/maps/dir/${encodedFrom}/${encodedTo}`;

    // For demo purposes, calculate approximate distance
    // In production, you'd use the Google Maps Distance Matrix API
    const estimatedMiles = Math.round((Math.random() * 30 + 5) * 10) / 10;

    toast.info(
      'Route calculated! In production, this would use Google Maps API for accurate distances.',
      { duration: 4000 }
    );

    return {
      miles: estimatedMiles,
      routeUrl: directionsUrl,
    };
  };

  const handleAddTrip = (tripData: Parameters<typeof addTrip>[0]) => {
    addTrip(tripData);
    toast.success('Trip added successfully!');
  };

  const handleDeleteTrip = (id: string) => {
    deleteTrip(id);
    toast.success('Trip deleted');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header trips={trips} totalMiles={totalMiles} />
      
      <main className="container mx-auto space-y-6 px-4 py-6">
        <MileageSummary trips={trips} totalMiles={totalMiles} />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <TripForm
            onSubmit={handleAddTrip}
            onCalculateRoute={handleCalculateRoute}
            programs={programs}
            programsLoading={programsLoading}
            onAddProgram={addProgram}
            onUpdateProgram={updateProgram}
            onDeleteProgram={deleteProgram}
          />
          <TripList trips={trips} onDelete={handleDeleteTrip} totalMiles={totalMiles} />
        </div>
      </main>
    </div>
  );
};

export default Index;
