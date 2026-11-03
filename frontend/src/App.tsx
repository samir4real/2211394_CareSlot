import { useState, useEffect } from 'react';

interface Appointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  status: string;
}

const API_URL = "http://127.0.0.1:8000/api/appointments";

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formData, setFormData] = useState({ patient_name: '', doctor_name: '', date: '', status: 'Booked' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`${API_URL}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingId(null);
    } else {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    setFormData({ patient_name: '', doctor_name: '', date: '', status: 'Booked' });
    fetchAppointments();
  };

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setFormData({ patient_name: apt.patient_name, doctor_name: apt.doctor_name, date: apt.date, status: apt.status });
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    fetchAppointments();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>CareSlot - MVP Appointment Manager</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>{editingId ? "Edit Appointment" : "Book New Appointment"}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Patient Name" value={formData.patient_name} onChange={(e) => setFormData({...formData, patient_name: e.target.value})} required />
          <input type="text" placeholder="Doctor Name" value={formData.doctor_name} onChange={(e) => setFormData({...formData, doctor_name: e.target.value})} required />
          <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
          <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
            <option value="Booked">Booked</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button type="submit" style={{ padding: '10px', background: '#007BFF', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editingId ? "Update Appointment" : "Save Appointment"}
          </button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ patient_name: '', doctor_name: '', date: '', status: 'Booked' }); }} style={{ padding: '10px', marginTop: '5px' }}>Cancel Edit</button>}
        </form>
      </div>

      <h2>Daily Queue</h2>
      {appointments.length === 0 ? <p>No appointments found.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {appointments.map((apt) => (
            <li key={apt.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong>{apt.patient_name}</strong> - Dr. {apt.doctor_name} <br/><small>{apt.date} | Status: {apt.status}</small></div>
              <div>
                <button onClick={() => handleEdit(apt)} style={{ marginRight: '10px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(apt.id)} style={{ color: 'red', cursor: 'pointer' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
