import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'patient' | 'doctor' | 'receptionist';
  specialty?: string;
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'doctor' | 'receptionist';
  specialty?: string;
}

interface Appointment {
  id: number;
  patient_name: string;
  patient_email: string;
  doctor_name: string;
  date: string;
  time_slot: string;
  reason: string;
  notes: string;
  status: 'Booked' | 'Checked-In' | 'Completed' | 'Cancelled';
}

const API_URL = 'http://localhost:8000';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  
  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeDoctors, setActiveDoctors] = useState<StaffMember[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  // Auth States (Login vs Patient Sign-Up)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regName, setRegName] = useState('');
  const [email, setEmail] = useState('admin@careslot.com');
  const [password, setPassword] = useState('12345678');
  const [authError, setAuthError] = useState('');

  // Admin Staff Creation Form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('12345678');
  const [staffRole, setStaffRole] = useState<'doctor' | 'receptionist'>('doctor');
  const [staffSpecialty, setStaffSpecialty] = useState('');

  // Booking Form State
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [date, setDate] = useState('2026-11-19');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [reason, setReason] = useState('');

  // Filter & Notes State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const fetchAllData = async () => {
    try {
      const [apptRes, docRes] = await Promise.all([
        fetch(`${API_URL}/appointments`),
        fetch(`${API_URL}/doctors`),
      ]);
      const apptData = await apptRes.json();
      const docData = await docRes.json();
      setAppointments(apptData);
      setActiveDoctors(docData);
      if (docData.length > 0 && !doctorName) {
        setDoctorName(docData[0].name);
      }

      if (user?.role === 'admin') {
        const staffRes = await fetch(`${API_URL}/admin/staff`);
        setAllStaff(await staffRes.json());
      }
    } catch (err) {
      console.error('Error syncing data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
      if (user.role === 'patient') {
        setPatientName(user.name);
        setPatientEmail(user.email);
      } else {
        setPatientName('');
        setPatientEmail('');
      }
    }
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');
        setUser(data);
        setActiveTab(data.role === 'admin' ? 'staff' : 'home');
      } else {
        const res = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        setUser(data);
        setActiveTab('home');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        specialty: staffSpecialty,
      }),
    });
    if (res.ok) {
      setStaffName('');
      setStaffEmail('');
      setStaffSpecialty('');
      fetchAllData();
    } else {
      const err = await res.json();
      alert(err.detail || 'Failed to add staff');
    }
  };

  const handleRemoveStaff = async (id: number) => {
    await fetch(`${API_URL}/admin/staff/${id}`, { method: 'DELETE' });
    fetchAllData();
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !date || !doctorName) return;
    await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_name: patientName,
        patient_email: patientEmail || 'walkin@careslot.com',
        doctor_name: doctorName,
        date,
        time_slot: timeSlot,
        reason,
      }),
    });
    if (user?.role !== 'patient') {
      setPatientName('');
      setPatientEmail('');
    }
    setReason('');
    fetchAllData();
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    await fetch(`${API_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAllData();
  };

  const handleSaveNotes = async (id: number) => {
    await fetch(`${API_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: noteInput }),
    });
    setEditingNoteId(null);
    fetchAllData();
  };

  const handleDeleteAppt = async (id: number) => {
    await fetch(`${API_URL}/appointments/${id}`, { method: 'DELETE' });
    fetchAllData();
  };

  // Role-Based Data Scopes
  const roleScopedAppointments = appointments.filter((appt) => {
    if (!user) return false;
    if (user.role === 'doctor') return appt.doctor_name === user.name;
    if (user.role === 'patient') return appt.patient_email === user.email;
    return true; // Admin & Receptionist see all clinic appointments
  });

  const displayedAppointments = roleScopedAppointments.filter((appt) => {
    const matchesSearch =
      appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const bookedCount = roleScopedAppointments.filter((a) => a.status === 'Booked').length;
  const checkedInCount = roleScopedAppointments.filter((a) => a.status === 'Checked-In').length;
  const completedCount = roleScopedAppointments.filter((a) => a.status === 'Completed').length;
  const totalCount = roleScopedAppointments.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Theme Classes
  const themeBg = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg = darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xl';
  const inputStyle = darkMode
    ? 'bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-600';
  const mutedColor = darkMode ? 'text-slate-400' : 'text-slate-500';

  // --- LOGIN / PUBLIC PATIENT SIGN-UP SCREEN ---
  if (!user) {
    return (
      <div className={`min-h-screen relative flex items-center justify-center p-4 overflow-hidden transition-colors duration-300 ${themeBg}`}>
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 opacity-20 filter blur-[2px]"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000')` }}
        />
        <div className={`absolute inset-0 z-0 ${darkMode ? 'bg-gradient-to-br from-indigo-950/80 via-slate-950/90 to-slate-950' : 'bg-gradient-to-br from-indigo-100/80 via-slate-50/90 to-white'}`} />

        <div className={`relative z-10 w-full max-w-md rounded-2xl border backdrop-blur-xl p-8 shadow-2xl ${cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-600/30">
                +
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">CareSlot</h1>
                <p className={`text-xs ${mutedColor}`}>Open-Access Healthcare Portal</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${darkMode ? 'border-slate-800 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 hover:bg-slate-200'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Auth Mode Switcher Tabs */}
          <div className={`grid grid-cols-2 p-1 rounded-xl mb-6 border ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                authMode === 'login' ? 'bg-indigo-600 text-white shadow' : mutedColor
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setEmail(''); setPassword(''); setAuthError(''); }}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                authMode === 'register' ? 'bg-indigo-600 text-white shadow' : mutedColor
              }`}
            >
              New Patient Sign Up
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-70">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition ${inputStyle}`}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-70">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition ${inputStyle}`}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-70">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition ${inputStyle}`}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              {authMode === 'login' ? 'Sign In to Portal' : 'Create Patient Account'}
            </button>
          </form>

          {authMode === 'login' && (
            <div className={`mt-6 pt-5 border-t ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${mutedColor}`}>Quick Access Accounts (PW: 12345678):</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Clinic Admin', mail: 'admin@careslot.com' },
                  { label: 'Receptionist', mail: 'reception01@careslot.com' },
                  { label: 'Dr. Sarah', mail: 'doctor01@careslot.com' },
                  { label: 'Patient Demo', mail: 'patient01@careslot.com' },
                ].map((acc) => (
                  <button
                    key={acc.mail}
                    type="button"
                    onClick={() => {
                      setEmail(acc.mail);
                      setPassword('12345678');
                    }}
                    className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer ${
                      darkMode ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold">{acc.label}</div>
                    <div className={`text-[10px] truncate ${mutedColor}`}>{acc.mail}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeBg}`}>
      <header className={`border-b sticky top-0 z-20 backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
                +
              </div>
              <span className="font-bold text-lg tracking-tight">CareSlot</span>
            </div>

            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab('home')}
                className={`py-5 border-b-2 transition cursor-pointer ${
                  activeTab === 'home' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${mutedColor}`
                }`}
              >
                Appointments & Queue
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-5 border-b-2 transition cursor-pointer ${
                    activeTab === 'staff' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${mutedColor}`
                  }`}
                >
                  Staff Management (HR)
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                darkMode ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <div className={`hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold leading-tight">{user.name}</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase">{user.role}</div>
              </div>
            </div>

            <button
              onClick={() => setUser(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* --- ADMIN STAFF ONBOARDING / OFFBOARDING TAB --- */}
        {activeTab === 'staff' && user.role === 'admin' ? (
          <div className="space-y-8">
            <div className={`rounded-2xl border p-6 shadow-xl ${cardBg}`}>
              <h2 className="text-lg font-bold mb-1">Onboard New Doctor or Receptionist</h2>
              <p className={`text-xs mb-5 ${mutedColor}`}>Newly added doctors immediately appear in the patient booking menu.</p>
              
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Full Name (e.g. Dr. Rashed)"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
                  required
                />
                <input
                  type="email"
                  placeholder="Staff Email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
                  required
                />
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as 'doctor' | 'receptionist')}
                  className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
                >
                  <option value="doctor">Role: Doctor</option>
                  <option value="receptionist">Role: Receptionist</option>
                </select>
                <input
                  type="text"
                  placeholder={staffRole === 'doctor' ? 'Specialty (e.g. Pediatrics)' : 'Desk / Shift (optional)'}
                  value={staffSpecialty}
                  onChange={(e) => setStaffSpecialty(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition cursor-pointer"
                >
                  + Hire / Add Staff
                </button>
              </form>
            </div>

            <div className={`rounded-2xl border p-6 shadow-xl ${cardBg}`}>
              <h2 className="text-lg font-bold mb-4">Active Clinic Staff Roster ({allStaff.length})</h2>
              <div className="space-y-3">
                {allStaff.map((member) => (
                  <div
                    key={member.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${
                      darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm">{member.name}</span>
                        <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md ${
                          member.role === 'doctor' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {member.role}
                        </span>
                        {member.specialty && (
                          <span className={`text-xs ${mutedColor}`}>• {member.specialty}</span>
                        )}
                      </div>
                      <div className={`text-xs mt-1 ${mutedColor}`}>{member.email}</div>
                    </div>

                    <button
                      onClick={() => handleRemoveStaff(member.id)}
                      className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition cursor-pointer"
                    >
                      Offboard / Remove Access
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* --- APPOINTMENTS & QUEUE DASHBOARD --- */
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h1>
                <p className={`text-sm mt-1 ${mutedColor}`}>
                  Role: <span className="capitalize font-semibold text-indigo-400">{user.role}</span> · Real-time SQLite Clinic Sync
                </p>
              </div>
            </div>

            {/* Booking Form (Patients, Receptionists, and Admin) */}
            {(user.role === 'patient' || user.role === 'receptionist' || user.role === 'admin') && (
              <div className={`rounded-2xl border p-6 mb-8 shadow-xl ${cardBg}`}>
                <h2 className="text-base font-bold mb-4">📅 Book an Appointment</h2>
                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Patient Full Name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      disabled={user.role === 'patient'}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${inputStyle} ${
                        user.role === 'patient' ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Reason / Symptoms (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${inputStyle}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <select
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${inputStyle}`}
                      required
                    >
                      {activeDoctors.map((doc) => (
                        <option key={doc.id} value={doc.name}>
                          {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${inputStyle}`}
                      required
                    />

                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${inputStyle}`}
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="06:30 PM">06:30 PM</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
                <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>Booked</div>
                <div className="text-3xl font-extrabold text-indigo-500">🕒 {bookedCount}</div>
              </div>
              <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
                <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>Checked-In</div>
                <div className="text-3xl font-extrabold text-amber-500">🩺 {checkedInCount}</div>
              </div>
              <div className={`rounded-2xl border p-6 shadow-lg ${cardBg}`}>
                <div className={`text-xs font-semibold uppercase mb-1 ${mutedColor}`}>Completed</div>
                <div className="text-3xl font-extrabold text-emerald-500">✅ {completedCount}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={`rounded-2xl border p-4 mb-6 shadow-md flex items-center gap-4 ${cardBg}`}>
              <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-slate-200'}`}>
                <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
              <span className={`text-xs font-bold ${mutedColor}`}>{completionRate}% Completed</span>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <input
                type="text"
                placeholder="Search patient, doctor, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full sm:w-80 px-4 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`}
              />
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {['All', 'Booked', 'Checked-In', 'Completed', 'Cancelled'].map((status) => (
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

            {/* Appointments List */}
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
                        {(user.role === 'receptionist' || user.role === 'admin') && (
                          <>
                            {appt.status === 'Booked' && (
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'Checked-In')}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-semibold cursor-pointer"
                              >
                                Check In
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAppt(appt.id)}
                              className="px-3 py-1.5 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {user.role === 'doctor' && (
                          <>
                            <button
                              onClick={() => { setEditingNoteId(appt.id); setNoteInput(appt.notes || ''); }}
                              className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              + Add Note
                            </button>
                            {appt.status !== 'Completed' && (
                              <button
                                onClick={() => handleUpdateStatus(appt.id, 'Completed')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                              >
                                Complete
                              </button>
                            )}
                          </>
                        )}

                        {user.role === 'patient' && appt.status === 'Booked' && (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'Cancelled')}
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
                          onChange={(e) => setNoteInput(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${inputStyle}`}
                        />
                        <button
                          onClick={() => handleSaveNotes(appt.id)}
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
          </>
        )}
      </main>
    </div>
  );
}