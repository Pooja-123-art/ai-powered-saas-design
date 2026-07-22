import React, { useState, useEffect } from 'react';
import { fetchProjects } from './api'; // update relative path if needed

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const res = await fetchProjects();
        // Check if data is array or object and extract properly
        if (res && res.data && Array.isArray(res.data)) {
          setProjects(res.data);
        } else if (Array.isArray(res)) {
          setProjects(res);
        } else {
          setProjects([]);
        }
      } catch (err) {
        // String conversion prevents React Error #31
        setError(err?.message || 'Failed to connect to backend');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#0f172a', color: '#fff', minHeight: '100vh' }}>
      <h1>AI Design Dashboard</h1>
      {loading && <p>Loading workspace...</p>}
      
      {/* String conversion for error message prevents object crash */}
      {error && <div style={{ color: '#ef4444', padding: '10px', background: '#450a0a', borderRadius: '6px' }}>{String(error)}</div>}

      <div style={{ marginTop: '20px' }}>
        <h2>Projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No projects loaded yet or server running in mock mode.</p>
        ) : (
          <ul>
            {projects.map((proj, idx) => (
              <li key={proj.id || idx}>
                {/* NEVER render object directly - render explicit primitive properties */}
                {typeof proj === 'object' ? (proj.name || proj.title || 'Untitled Project') : String(proj)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
