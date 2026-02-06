import { TripForm } from "./TripForm";
import { Program } from "@/hooks/usePrograms";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import { Trip, RouteMapData } from "@/types/mileage";

interface TripEntryProps {
  onSubmit: (trip: Omit<Trip, "id" | "createdAt">) => Promise<unknown> | void;
  onCalculateRoute: (
    from: string,
    to: string,
  ) => Promise<{ miles: number; routeUrl: string; routeMapData?: RouteMapData } | null>;
  programs: Program[];
  programsLoading: boolean;
  isAdmin: boolean;
  onAddProgram: (name: string, address: string) => Promise<Program | null>;
  onUpdateProgram: (id: string, updates: { name?: string; address?: string }) => Promise<boolean>;
  onDeleteProgram: (id: string) => Promise<boolean>;
}

export const TripEntry = ({
  onSubmit,
  onCalculateRoute,
  programs,
  programsLoading,
  isAdmin,
  onAddProgram,
  onUpdateProgram,
  onDeleteProgram,
}: TripEntryProps) => {
  const { addresses: userAddresses, addAddress: addUserAddress } = useUserAddresses();

  return (
    <div data-tour="trip-entry">
      <TripForm
        onSubmit={onSubmit}
        onCalculateRoute={onCalculateRoute}
        programs={programs}
        programsLoading={programsLoading}
        isAdmin={isAdmin}
        onAddProgram={onAddProgram}
        onUpdateProgram={onUpdateProgram}
        onDeleteProgram={onDeleteProgram}
        userAddresses={userAddresses}
        onSaveAddress={addUserAddress}
      />
    </div>
  );
};
