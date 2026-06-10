import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  return (
    <div className={`toast toast-${type}`}>
      <span>{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}
