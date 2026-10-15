import { useState } from 'react';

export default function PasswordInput({ id, value, onChange, autoComplete, required, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10c1.8-3.6 4.8-5.5 8-5.5s6.2 1.9 8 5.5c-1.8 3.6-4.8 5.5-8 5.5S3.8 13.6 2 10Z" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="2.3" />
            <line x1="3" y1="17" x2="17" y2="3" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10c1.8-3.6 4.8-5.5 8-5.5s6.2 1.9 8 5.5c-1.8 3.6-4.8 5.5-8 5.5S3.8 13.6 2 10Z" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="2.3" />
          </svg>
        )}
      </button>
    </div>
  );
}
