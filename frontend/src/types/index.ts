export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'patient' | 'doctor' | 'receptionist';
  specialty?: string;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'doctor' | 'receptionist';
  specialty?: string;
}

export interface AdminAccount {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export interface Appointment {
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