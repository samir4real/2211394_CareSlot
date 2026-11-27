import React, { useState, useEffect } from 'react';
import type { User, StaffMember, AdminAccount, Appointment } from './types';
import { API_URL } from './services/api';
import StatsCards from './components/StatsCards';
import ProgressBar from './components/ProgressBar';
import AppointmentFilters from './components/AppointmentFilters';
import AppointmentList from './components/AppointmentList';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const apiFetch = (path: string, init: RequestInit = {}) => fetch(`${API_URL}${path}`, { ...init, headers: { ...(init.headers || {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) } });
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('home');
  
  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeDoctors, setActiveDoctors] = useState<StaffMember[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Auth States (Login vs Patient Sign-Up)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regName, setRegName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Admin Staff Creation Form
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'doctor' | 'receptionist'>('doctor');
  const [staffSpecialty, setStaffSpecialty] = useState('');

  // Booking Form State
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
        apiFetch('/appointments'),
        apiFetch('/doctors'),
      ]);
      const apptData = await apptRes.json();
      const docData = await docRes.json();
      setAppointments(apptData);
      setActiveDoctors(docData);
      if (docData.length > 0 && !doctorName) {
        setDoctorName(docData[0].name);
      }

      if (user?.role === 'admin' || user?.role === 'super_admin') {
        const staffRes = await apiFetch('/admin/staff');
        if (staffRes.ok) setAllStaff(await staffRes.json());
      }
      if (user?.role === 'super_admin') {
        const adminsRes = await apiFetch('/admin/admins');
        if (adminsRes.ok) setAdmins(await adminsRes.json());
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
        setAccessToken(data.access_token);
        setUser(data);
        setActiveTab(data.role === 'admin' || data.role === 'super_admin' ? 'staff' : 'home');
      } else {
        const res = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        setAccessToken(data.access_token);
        setUser(data);
        setActiveTab('home');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/admin/staff', {
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: adminName, email: adminEmail, password: adminPassword }) });
    const data = await res.json();
    if (!res.ok) { alert(data.detail || 'Failed to create admin'); return; }
    setAdminName(''); setAdminEmail(''); setAdminPassword('');
    fetchAllData();
  };

  const handleDeactivateAdmin = async (id: number) => {
    if (!window.confirm('Deactivate this secondary admin account?')) return;
    const res = await apiFetch(`/admin/admins/${id}`, { method: 'DELETE' });
    if (!res.ok) { const data = await res.json(); alert(data.detail || 'Failed to deactivate admin'); return; }
    fetchAllData();
  };

  const handleRemoveStaff = async (id: number) => {
    await apiFetch(`/admin/staff/${id}`, { method: 'DELETE' });
    fetchAllData();
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !date || !doctorName) return;
    await apiFetch('/appointments', {
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
    await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAllData();
  };

  const handleSaveNotes = async (id: number) => {
    await apiFetch(`/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: noteInput }),
    });
    setEditingNoteId(null);
    fetchAllData();
  };

  const handleDeleteAppt = async (id: number) => {
    await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
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
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-5 border-b-2 transition cursor-pointer ${
                    activeTab === 'staff' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${mutedColor}`
                  }`}
                >
                  Staff Management (HR)
                </button>
              )}
              {user.role === 'super_admin' && (
                <button onClick={() => setActiveTab('admins')} className={`py-5 border-b-2 transition cursor-pointer ${activeTab === 'admins' ? 'border-indigo-500 text-indigo-500' : `border-transparent ${mutedColor}`}`}>Admin Management</button>
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
              onClick={() => { setAccessToken(null); setUser(null); }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'admins' && user.role === 'super_admin' ? (
          <div className="space-y-8">
            <div className={`rounded-2xl border p-6 shadow-xl ${cardBg}`}>
              <h2 className="text-lg font-bold mb-1">Create Secondary Admin</h2>
              <p className={`text-xs mb-5 ${mutedColor}`}>Secondary admins can manage clinic staff and appointments, but cannot create or deactivate admins.</p>
              <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Full name" className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`} minLength={2} maxLength={120} required />
                <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="Admin email" className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`} required />
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Initial password (12+ characters)" className={`px-3.5 py-2.5 rounded-xl border text-sm outline-none ${inputStyle}`} minLength={12} maxLength={128} required />
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">Create Admin</button>
              </form>
            </div>
            <div className={`rounded-2xl border p-6 shadow-xl ${cardBg}`}>
              <h2 className="text-lg font-bold mb-4">Active Administrators ({admins.length})</h2>
              <div className="space-y-3">{admins.map(admin => <div key={admin.id} className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}><div><div className="font-bold text-sm">{admin.name} <span className="ml-2 text-[10px] uppercase text-indigo-400">{admin.role.replace('_', ' ')}</span></div><div className={`text-xs mt-1 ${mutedColor}`}>{admin.email}</div></div>{admin.role === 'admin' && <button onClick={() => handleDeactivateAdmin(admin.id)} className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-semibold">Deactivate</button>}</div>)}</div>
            </div>
          </div>
        ) : (
        <>
        {/* --- ADMIN STAFF ONBOARDING / OFFBOARDING TAB --- */}
        {activeTab === 'staff' && (user.role === 'admin' || user.role === 'super_admin') ? (
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
                  Role: <span className="capitalize font-semibold text-indigo-400">{user.role}</span> · Secure Clinic Sync
                </p>
              </div>
            </div>

            {/* Booking Form (Patients, Receptionists, and Admin) */}
            {(user.role === 'patient' || user.role === 'receptionist' || (user.role === 'admin' || user.role === 'super_admin')) && (
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
            <StatsCards
              cardBg={cardBg}
              mutedColor={mutedColor}
              bookedCount={bookedCount}
              checkedInCount={checkedInCount}
              completedCount={completedCount}
            />

            {/* Progress Bar */}
            <ProgressBar
              cardBg={cardBg}
              darkMode={darkMode}
              mutedColor={mutedColor}
              completionRate={completionRate}
            />

            {/* Search & Filter */}
            <AppointmentFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              inputStyle={inputStyle}
              mutedColor={mutedColor}
            />

            {/* Appointments List */}
            <AppointmentList
              displayedAppointments={displayedAppointments}
              user={user}
              cardBg={cardBg}
              mutedColor={mutedColor}
              darkMode={darkMode}
              inputStyle={inputStyle}
              editingNoteId={editingNoteId}
              noteInput={noteInput}
              onUpdateStatus={handleUpdateStatus}
              onDeleteAppt={handleDeleteAppt}
              onEditNote={(id, notes) => {
                setEditingNoteId(id);
                setNoteInput(notes);
              }}
              onNoteInputChange={setNoteInput}
              onSaveNotes={handleSaveNotes}
            />
          </>
        )}
        </>
        )}
      </main>
    </div>
  );
}
