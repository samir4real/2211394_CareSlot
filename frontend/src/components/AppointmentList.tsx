
import type { Appointment, User } from '../types';

interface AppointmentListProps {
  displayedAppointments: Appointment[];
  user: User;
  cardBg: string;
  mutedColor: string;
  darkMode: boolean;
  inputStyle: string;
  editingNoteId: number | null;
  noteInput: string;
  onUpdateStatus: (id: number, status: Appointment['status']) => void;
  onDeleteAppt: (id: number) => void;
  onEditNote: (id: number, notes: string) => void;
  onNoteInputChange: (value: string) => void;
  onSaveNotes: (id: number) => void;
}

export default function AppointmentList({
  displayedAppointments,
  user,
  cardBg,
  mutedColor,
  darkMode,
  inputStyle,
  editingNoteId,
  noteInput,
  onUpdateStatus,
  onDeleteAppt,
  onEditNote,
  onNoteInputChange,
  onSaveNotes,
}: AppointmentListProps) {
  return (
    <div className="space-y-4">
      {displayedAppointments.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center text-sm ${cardBg} ${mutedColor}`}>
          No appointments found.
        </div>
      ) : (
        displayedAppointments.map((appt) => (
          <div key={appt.id} className={`rounded-2xl border border-l-4 border-l-indigo-500 p-5 shadow-lg ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-base">{appt.patient_name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold">
                    {appt.doctor_name}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg ${darkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    {appt.date} · {appt.time_slot}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    {appt.status}
                  </span>
                </div>
                {appt.reason && <p className={`text-xs mt-2 ${mutedColor}`}>Reason: {appt.reason}</p>}
                {appt.notes && <p className="text-xs mt-1 text-emerald-400">Doctor&apos;s Note: {appt.notes}</p>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(user.role === 'receptionist' || user.role === 'admin' || user.role === 'super_admin') && (
                  <>
                    {appt.status === 'Booked' && (
                      <button
                        onClick={() => onUpdateStatus(appt.id, 'Checked-In')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-semibold cursor-pointer"
                      >
                        Check In
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAppt(appt.id)}
                      className="px-3 py-1.5 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </>
                )}

                {user.role === 'doctor' && (
                  <>
                    <button
                      onClick={() => onEditNote(appt.id, appt.notes || '')}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      + Add Note
                    </button>
                    {appt.status !== 'Completed' && (
                      <button
                        onClick={() => onUpdateStatus(appt.id, 'Completed')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                  </>
                )}

                {user.role === 'patient' && appt.status === 'Booked' && (
                  <button
                    onClick={() => onUpdateStatus(appt.id, 'Cancelled')}
                    className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {editingNoteId === appt.id && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Write clinical note..."
                  value={noteInput}
                  onChange={(e) => onNoteInputChange(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${inputStyle}`}
                />
                <button
                  onClick={() => onSaveNotes(appt.id)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
