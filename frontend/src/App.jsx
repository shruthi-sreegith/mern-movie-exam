import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/movies';

export default function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState({ statusCounts: {}, totalHoursWatched: 0, avgRating: 0, topGenre: 'N/A' });
  const [filters, setFilters] = useState({ status: '', genre: '', search: '', page: 1 });
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({ title: '', genre: 'Action', releaseYear: 2024, runtime: 120, platform: 'Netflix', priority: 3 });
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recommendation, setRecommendation] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(API_BASE, { params: filters });
      setMovies(res.data.data.movies);
      setTotalPages(res.data.data.totalPages);

      const statsRes = await axios.get(`${API_BASE}/stats`);
      setStats(statsRes.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/${editingId}`, formData);
      } else {
        await axios.post(API_BASE, formData);
      }
      setFormData({ title: '', genre: 'Action', releaseYear: 2024, runtime: 120, platform: 'Netflix', priority: 3 });
      setEditingId(null);
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleStatusChange = async (movie, newStatus) => {
    let rating = null;
    if (newStatus === 'Watched') {
      const input = prompt('Enter a mandatory rating (1-10):');
      rating = Number(input);
      if (!rating || rating < 1 || rating > 10) {
        alert('Valid rating (1-10) is mandatory.');
        return;
      }
    }
    try {
      await axios.patch(`${API_BASE}/${movie._id}/status`, { newStatus, rating });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleDelete = async (movie) => {
    if (movie.status === 'Watching') return;
    if (!window.confirm(`Delete "${movie.title}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/${movie._id}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleWatchNext = async () => {
    try {
      const res = await axios.get(`${API_BASE}/watch-next`);
      setRecommendation(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'No movie available'); }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>🎬 Movie Watchlist Manager</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
        <div>
          <p>To Watch: <strong>{stats.statusCounts['To Watch'] || 0}</strong></p>
          <p>Watching: <strong>{stats.statusCounts['Watching'] || 0}</strong></p>
          <p>Watched: <strong>{stats.statusCounts['Watched'] || 0}</strong></p>
        </div>
        <div><h4>Total Hours</h4><h2>{stats.totalHoursWatched} hrs</h2></div>
        <div><h4>Avg Rating</h4><h2>⭐ {stats.avgRating}/10</h2></div>
        <div><h4>Top Genre</h4><h2>{stats.topGenre}</h2></div>
      </div>

      <button onClick={handleWatchNext} style={{ marginBottom: '1.5rem', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>💡 What should I watch next?</button>
      
      {recommendation && (
        <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          🎯 Recommended: <strong>{recommendation.title}</strong> ({recommendation.movieCode}) | Priority: {recommendation.priority}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
        <h3>{editingId ? 'Edit Movie' : 'Add Movie'}</h3>
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
          <select value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})}>
            {['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input type="number" placeholder="Year" value={formData.releaseYear} disabled={!!editingId} onChange={e => setFormData({...formData, releaseYear: Number(e.target.value)})} required />
          <input type="number" placeholder="Runtime" value={formData.runtime} onChange={e => setFormData({...formData, runtime: Number(e.target.value)})} required />
          <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
            {['Netflix', 'Prime Video', 'Hotstar', 'Theatre', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" min="1" max="5" placeholder="Priority (1-5)" value={formData.priority} onChange={e => setFormData({...formData, priority: Number(e.target.value)})} required />
        </div>
        <button type="submit">{editingId ? 'Save' : 'Add Movie'}</button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input placeholder="Search..." onChange={e => setFilters({...filters, search: e.target.value, page: 1})} />
        <select onChange={e => setFilters({...filters, status: e.target.value, page: 1})}>
          <option value="">All Statuses</option>
          <option value="To Watch">To Watch</option>
          <option value="Watching">Watching</option>
          <option value="Watched">Watched</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {movies.map(m => (
          <div key={m._id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '6px' }}>
            <small>{m.movieCode}</small>
            <h3>{m.title} ({m.releaseYear})</h3>
            <p>{m.genre} | {m.platform} | {m.runtime} mins</p>
            <p>Status: <strong>{m.status}</strong> | Priority: {m.priority}</p>
            {m.rating && <p>Rating: ⭐ {m.rating}/10</p>}

            {m.status !== 'Watched' && (
              <select onChange={e => handleStatusChange(m, e.target.value)} defaultValue="">
                <option value="" disabled>Change status...</option>
                {m.status === 'To Watch' && <><option value="Watching">Watching</option><option value="Watched">Watched</option></>}
                {m.status === 'Watching' && <><option value="Watched">Watched</option><option value="To Watch">To Watch</option></>}
              </select>
            )}

            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setEditingId(m._id); setFormData({ title: m.title, genre: m.genre, releaseYear: m.releaseYear, runtime: m.runtime, platform: m.platform, priority: m.priority }); }}>Edit</button>
              <button onClick={() => handleDelete(m)} disabled={m.status === 'Watching'}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}