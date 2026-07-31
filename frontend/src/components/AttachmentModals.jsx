import React, { useState } from 'react';

export default function AttachmentModals({ type, onClose, onSubmit }) {
  if (!type) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        maxWidth: '90%',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        color: 'var(--text-primary)'
      }}>
        {type === 'poll' && <PollModal onClose={onClose} onSubmit={(data) => onSubmit('poll', data)} />}
        {type === 'event' && <EventModal onClose={onClose} onSubmit={(data) => onSubmit('event', data)} />}
        {type === 'contact' && <ContactModal onClose={onClose} onSubmit={(data) => onSubmit('contact', data)} />}
      </div>
    </>
  );
}

function PollModal({ onClose, onSubmit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const validOptions = options.filter(o => o.trim() !== '').map((text, i) => ({ id: i+1, text }));
    if (validOptions.length < 2) return alert('Need at least 2 options');
    onSubmit({ question, options: validOptions, allow_multiple: allowMultiple });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Create Poll</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Question</label>
        <input 
          autoFocus
          type="text" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          placeholder="Ask a question"
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Options</label>
        {options.map((opt, idx) => (
          <input 
            key={idx}
            type="text" 
            value={opt} 
            onChange={(e) => {
              const newOpts = [...options];
              newOpts[idx] = e.target.value;
              if (idx === options.length - 1 && e.target.value) newOpts.push('');
              setOptions(newOpts);
            }}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '10px' }}
            placeholder={`Option ${idx + 1}`}
          />
        ))}
      </div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: 'var(--text-primary)', fontSize: '15px' }}>Allow multiple answers</label>
        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
          <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: allowMultiple ? 'var(--primary-color)' : 'var(--bg-secondary)', 
            transition: '.4s', borderRadius: '24px'
          }}>
            <span style={{
              position: 'absolute', content: '""', height: '18px', width: '18px', left: allowMultiple ? '18px' : '3px', bottom: '3px', 
              backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
            }}></span>
          </span>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" onClick={onClose} style={{ padding: '10px 20px', color: 'var(--primary)', fontWeight: 'bold' }}>Cancel</button>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '24px', fontWeight: 'bold' }}>Create</button>
      </div>
    </form>
  );
}

function EventModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [showEndTime, setShowEndTime] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime) return;
    onSubmit({ 
      title, 
      description, 
      start_date: startDate, 
      start_time: startTime,
      end_date: showEndTime ? endDate : null,
      end_time: showEndTime ? endTime : null,
      location 
    });
  };

  const inputStyle = {
    width: '100%', 
    padding: '10px 0', 
    border: 'none', 
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'transparent', 
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
    marginBottom: '20px'
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Create event</h3>
      </div>
      
      <div style={{ padding: '0 10px' }}>
        <input 
          autoFocus
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...inputStyle, borderBottom: '2px solid #00a884' }}
          placeholder="Event name"
        />
        
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', resize: 'none', height: '80px', marginBottom: '20px' }}
          placeholder="Description (optional)"
        />
        
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Start date and time</label>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ flex: 2, ...inputStyle, marginBottom: 0 }}
          />
          <input 
            type="time" 
            value={startTime} 
            onChange={(e) => setStartTime(e.target.value)}
            style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
          />
        </div>
        
        {!showEndTime ? (
          <button type="button" onClick={() => setShowEndTime(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '15px', padding: '10px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '18px' }}>+</span> Add end time
          </button>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>End date and time</label>
              <button type="button" onClick={() => { setShowEndTime(false); setEndDate(''); setEndTime(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ flex: 2, ...inputStyle, marginBottom: 0 }}
              />
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                style={{ flex: 1, ...inputStyle, marginBottom: 0 }}
              />
            </div>
          </div>
        )}
        
        <input 
          type="text" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)}
          style={{ ...inputStyle, marginBottom: '30px' }}
          placeholder="Location (optional)"
        />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#00a884', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
          </button>
        </div>
      </div>
    </form>
  );
}

function ContactModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit({ name, phone });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Share Contact</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Name</label>
        <input 
          autoFocus
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Phone Number</label>
        <input 
          type="tel" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" onClick={onClose} style={{ padding: '10px 20px', color: 'var(--primary)', fontWeight: 'bold' }}>Cancel</button>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '24px', fontWeight: 'bold' }}>Share</button>
      </div>
    </form>
  );
}
