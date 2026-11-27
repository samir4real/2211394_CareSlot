
interface AppointmentFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  inputStyle: string;
  mutedColor: string;
}

const statuses = ['All', 'Booked', 'Checked-In', 'Completed', 'Cancelled'];

export default function AppointmentFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  inputStyle,
  mutedColor,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <input
        type="text"
        placeholder="Search patient, doctor, or reason..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`w-full sm:w-80 px-4 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
      />
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
              statusFilter === status ? 'bg-indigo-600 text-white' : mutedColor
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  );
}
