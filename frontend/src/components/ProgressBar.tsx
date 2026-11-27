
interface ProgressBarProps {
  cardBg: string;
  darkMode: boolean;
  mutedColor: string;
  completionRate: number;
}

export default function ProgressBar({
  cardBg,
  darkMode,
  mutedColor,
  completionRate,
}: ProgressBarProps) {
  return (
    <div className={`rounded-2xl border p-4 mb-6 shadow-md flex items-center gap-4 ${cardBg}`}>
      <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${mutedColor}`}>
        {completionRate}% Completed
      </span>
    </div>
  );
}
