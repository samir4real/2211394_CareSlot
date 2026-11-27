
interface StatsCardsProps {
  cardBg: string;
  mutedColor: string;
  bookedCount: number;
  checkedInCount: number;
  completedCount: number;
}

export default function StatsCards({
  cardBg,
  mutedColor,
  bookedCount,
  checkedInCount,
  completedCount,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
      <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
        <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>
          Booked
        </div>
        <div className="text-3xl font-extrabold text-indigo-500">
          {bookedCount}
        </div>
      </div>

      <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
        <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>
          Checked-In
        </div>
        <div className="text-3xl font-extrabold text-amber-500">
          {checkedInCount}
        </div>
      </div>

      <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
        <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>
          Completed
        </div>
        <div className="text-3xl font-extrabold text-emerald-500">
          {completedCount}
        </div>
      </div>
    </div>
  );
}
