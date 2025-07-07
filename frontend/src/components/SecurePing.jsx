import { useState } from 'react';
import { securePing } from '../api/securePing';

export default function SecurePing() {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const test = async () => {
    try {
      const { message: msg } = await securePing(token);
      setMessage(msg);
    } catch (e) {
      setMessage(`Erreur: ${e.message}`);
    }
  };

  return (
    <section>
      <h2>Route sécurisée</h2>
      <input
        type="text"
        placeholder="Collez votre JWT"
        value={token}
        onChange={e => setToken(e.target.value)}
        style={{ width: '300px' }}
      />
      <button onClick={test}>Tester</button>
      <p>Réponse: {message}</p>
    </section>
  );
}
