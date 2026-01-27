import { Header } from '@/components/Header';
import { TripForm } from '@/components/TripForm';
import { TripList } from '@/components/TripList';
import { MileageSummary } from '@/components/MileageSummary';
import { MonthSelector } from '@/components/MonthSelector';
import { ArchivePromptDialog } from '@/components/ArchivePromptDialog';
import { VoucherSubmitDialog } from '@/components/VoucherSubmitDialog';
import { useTrips } from '@/hooks/useTrips';
import { usePrograms } from '@/hooks/usePrograms';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const { trips, addTrip, deleteTrip, totalMiles, selectedMonth, changeMonth, isCurrentMonth, refetch } = useTrips();
  const { programs, loading: programsLoading, isAdmin, addProgram, updateProgram, deleteProgram } = usePrograms();

  const handleCalculateRoute = async (from: string, to: string) => {
    console.log('Starting route calculation...', { from: from.substring(0, 20), to: to.substring(0, 20) });
    
    try {
      // Check if user session exists before making the request
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Failed to read session:', sessionError);
      }

      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        console.error('No active session - user not authenticated');
        toast.error('Please log in to calculate routes');
        return null;
      }
      console.log('Session valid, making request...');

      const { data, error } = await supabase.functions.invoke('google-maps-route', {
        body: { fromAddress: from, toAddress: to },
        // Explicitly pass the JWT to avoid any edge-cases where the auth header isn't attached
        // (e.g., custom-domain session refresh issues or timing during app init)
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      console.log('Route response received:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('Route calculation error:', error);
        toast.error('Failed to calculate route. Please try again.');
        return null;
      }

      if (data?.error) {
        console.error('Route API error:', data.error);
        toast.error(data.error);
        return null;
      }

      toast.success(`Route calculated: ${data.miles} miles`);

      return {
        miles: data.miles,
        routeUrl: data.routeUrl,
        routeMapData: data.routeMapData,
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Failed to calculate route. Please check the addresses.');
      return null;
    }
  };

  const handleAddTrip = async (tripData: Parameters<typeof addTrip>[0]) => {
    const result = await addTrip(tripData);
    if (result) {
      toast.success('Trip added successfully!');
    }
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
