// src/components/AddRideForm.jsx
import { useState, useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function AddRideForm({ onAdded }) {
  const { token } = useContext(AuthContext);

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    seats: '',
    contact: ''
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        origin: form.origin,
        destination: form.destination,
        seats: form.seats || null,
        contact: form.contact
      };

      const res = await fetch('http://localhost:4000/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add ride');
      }

      await res.json();
      onAdded();

      // Reset form
      setForm({
        origin: '',
        destination: '',
        seats: '',
        contact: ''
      });
    } catch (err) {
      alert('Error adding ride: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mb-6">
      <input
        name="origin"
        value={form.origin}
        onChange={handleChange}
        placeholder="Origin"
        required
        className="block w-full p-2 border rounded"
      />
      <input
        name="destination"
        value={form.destination}
        onChange={handleChange}
        placeholder="Destination"
        required
        className="block w-full p-2 border rounded"
      />
      <input
        name="seats"
        value={form.seats}
        onChange={handleChange}
        placeholder="Seats (optional)"
        type="number"
        className="block w-full p-2 border rounded"
      />
      <input
        name="contact"
        value={form.contact}
        onChange={handleChange}
        placeholder="Contact info (optional)"
        className="block w-full p-2 border rounded"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Ride
      </button>
    </form>
  );
}
