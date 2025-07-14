// src/Login.jsx
import { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [code,  setCode]  = useState('');
  const [error, setError] = useState('');

  const requestOtp = async () => {
    const res = await fetch('http://localhost:4000/auth/request-otp', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone })
    });
    if (res.ok) setStep(2);
    else setError('Failed to send code');
  };

  const verifyOtp = async () => {
    const res = await fetch('http://localhost:4000/auth/verify-otp', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (data.token) {
      login(data.token);
    } else {
      setError(data.error || 'Verification failed');
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto">
      {step === 1 ? (
        <>
          <h2>Enter your phone</h2>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          <button onClick={requestOtp}>Send Code</button>
        </>
      ) : (
        <>
          <h2>Enter OTP</h2>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" />
          <button onClick={verifyOtp}>Verify</button>
        </>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
