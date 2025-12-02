import { useEffect, useState } from 'react';

type HealthResponse = { status: string };

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8080/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setHealth(null);
      });
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '1.5rem' }}>
      <h1>Finance Desktop</h1>
      <p>This is the React+Electron frontend for the local finance backend.</p>

      <section style={{ marginTop: '1rem' }}>
        <h2>Backend status</h2>
        {health && (
          <p>
            <strong>Health:</strong> {health.status}
          </p>
        )}
        {error && (
          <p style={{ color: 'red' }}>
            Error contacting backend: {error}
          </p>
        )}
        {!health && !error && <p>Checking backend...</p>}
      </section>
    </main>
  );
}

export default App;
