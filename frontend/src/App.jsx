import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import Login from './Login';
import RideList from './components/RideList';
import AddRideForm from './components/AddRideForm';

export default function App() {
  const { user, logout, token } = useContext(AuthContext);

  if (!user) return <Login />;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Rideshare Board</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <AddRideForm token={token} onAdded={() => window.location.reload()} />
      <RideList token={token} />
    </div>
  );
}
