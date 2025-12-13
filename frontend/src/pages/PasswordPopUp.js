import { useState } from 'react';

export default function PasswordPopup({ userEmail, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();

   const res = await fetch('http:///api/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail,
    oldPassword,
    newPassword,
  }),
});
    const data = await res.json();
    setMessage(data.message);

    if (res.ok) {
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        onClose(); // chiude il popup
      }, 1500);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-bold mb-2">Cambia password</h3>
      <form onSubmit={handleChangePassword}>
        <input
          type="password"
          placeholder="Password attuale"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="border p-2 w-full mb-2"
          required
        />
        <input
          type="password"
          placeholder="Nuova password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border p-2 w-full mb-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white p-2 w-full">
          Aggiorna
        </button>
      </form>
      {message && <p className="mt-2 text-center text-sm">{message}</p>}
    </div>
  );
}
