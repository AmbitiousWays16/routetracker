import { Header } from '@/components/Header';
import { TripForm } from '@/components/TripForm';
import { TripList } from '@/components/TripList';
import { MileageSummary } from '@/components/MileageSummary';
import { MonthSelector } from '@/components/MonthSelector';
import { ArchivePromptDialog } from '@/components/ArchivePromptDialog';
import { VoucherSubmitDialog } from '@/components/VoucherSubmitDialog';
import { useTrips } from '@/hooks/useTrips';
import { usePrograms } from '@/hooks/usePrograms';
import { useTripSuggestions } from '@/hooks/useTripSuggestions';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

const Index = () => {
  const { trips, addTrip, deleteTrip, totalMiles, selectedMonth, changeMonth, isCurrentMonth, refetch } = useTrips();
  const { programs, loading: programsLoading, isAdmin, addProgram, updateProgram, deleteProgram } = usePrograms();
  const { suggestions, loading: suggestionsLoading } = useTripSuggestions();

  const handleCalculateRoute = async (from: string, to: string) => {
    console.log('Starting route calculation...', { from: from.substring(0, 20), to: to.substring(0, 20) });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn('No active user. Cannot calculate route.');
        toast.error('You must be signed in to calculate routes.');
        return null;
      }

      const token = await currentUser.getIdToken();
      console.log('Token acquired, making request...');

      const response = await fetch(
        import.meta.env.VITE_GOOGLE_MAPS_ROUTE_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ fromAddress: from, toAddress: to }),
        }
      );

      console.log('Route response received:', { status: response.status });

      if (!response.ok) {
        let errorMessage = 'Route calculation failed.';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Could not parse error body; use default message
        }
        console.error('Route API error:', { status: response.status, errorMessage });
        toast.error(errorMessage);
        return null;
      }

      const data = await response.json();
      toast.success(`Route calculated: ${data.miles} miles`);

      return {
        miles: data.miles,
        routeUrl: data.routeUrl,
        routeMapData: data.routeMapData,
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Failed to calculate route. Please try again.');
      return null;
    }
  };

  const handleAddTrip = async (tripData: Parameters<typeof addTrip>[0]) => {
    const result = await addTrip(tripData);
    if (result) toast.success('Trip added successfully!');
  };

  const handleDeleteTrip = async (id: string) => {
    await deleteTrip(id);
    toast.success('Trip deleted');
  };

  return (
    <div className="min-h-screen bg-background">
      <ArchivePromptDialog onExportComplete={refetch} />
      <Header trips={trips} totalMiles={totalMiles} />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={changeMonth} />
          {isCurrentMonth && (
            <VoucherSubmitDialog
              selectedMonth={selectedMonth}
              trips={trips}
              totalMiles={totalMiles}
            />
          )}
        </div>
        <MileageSummary trips={trips} totalMiles={totalMiles} />

        <div className="grid gap-6 lg:grid-cols-2">
          {isCurrentMonth && (
            <TripForm
              onSubmit={handleAddTrip}
              onCalculateRoute={handleCalculateRoute}
              programs={programs}
              programsLoading={programsLoading}
              isAdmin={isAdmin}
              onAddProgram={addProgram}
              onUpdateProgram={updateProgram}
              onDeleteProgram={deleteProgram}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
            />
          )}
          <TripList
            trips={trips}
            onDelete={handleDeleteTrip}
            totalMiles={totalMiles}
            isArchiveView={!isCurrentMonth}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
