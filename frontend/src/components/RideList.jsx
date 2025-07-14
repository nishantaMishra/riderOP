// src/components/RideList.jsx
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function RideList() {
  const { token } = useContext(AuthContext);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    try {
      const res = await fetch('http://localhost:4000/rides', {
        headers: token
          ? { 'Authorization': `Bearer ${token}` }
          : {}
      });
      const data = await res.json();
      setRides(data);
    } catch (err) {
      console.error('Error fetching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
    const interval = setInterval(fetchRides, 30000);
    return () => clearInterval(interval);
  }, [token]); // Refetch immediately when token changes

  if (loading) {
    return <p>Loading rides…</p>;
  }

  if (rides.length === 0) {
    return <p className="text-center py-4">No rides available.</p>;
  }

  return (
    <ul className="space-y-2">
      {rides.map(r => (
        <li key={r.id} className="border p-2 rounded">
          <strong>{r.origin} → {r.destination}</strong><br/>
          by {r.name} at {new Date(r.timestamp).toLocaleString()}<br/>
          {r.seats && `Seats: ${r.seats}`} {r.contact && `• Contact: ${r.contact}`}
        </li>
      ))}
    </ul>
  );
}
