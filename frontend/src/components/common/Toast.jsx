import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ type, message, onClose }) => {
  const icons = {
    success: <CheckCircle size={16} className="text-primary" />,
    error: <AlertCircle size={16} className="text-danger" />,
    warning: <AlertTriangle size={16} className="text-accent" />,
    info: <Info size={16} className="text-blue-400" />,
  };

  const bgColors = {
    success: 'border-primary/30 bg-primary/10',
    error: 'border-danger/30 bg-danger/10',
    warning: 'border-accent/30 bg-accent/10',
    info: 'border-blue-400/30 bg-blue-400/10',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColors[type]} animate-in slide-in-from-right duration-300`}>
      {icons[type]}
      <span className="text-sm text-text-main flex-1">{message}</span>
      <button 
        onClick={onClose}
        className="text-text-muted hover:text-text-main transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast('success', message, duration),
    error: (message, duration) => addToast('error', message, duration),
    warning: (message, duration) => addToast('warning', message, duration),
    info: (message, duration) => addToast('info', message, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <Toast 
            key={t.id}
            type={t.type}
            message={t.message}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
