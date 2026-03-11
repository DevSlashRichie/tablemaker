import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = toast.type === 'success' ? 'bg-green-400' : 'bg-red-400';

  return (
    <div className={cn(
      'border-4 border-black px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[250px] animate-in slide-in-from-right',
      bgColor
    )}>
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-black">{toast.message}</span>
        <button onClick={onClose} className="text-xl font-bold hover:opacity-70">×</button>
      </div>
    </div>
  );
}

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'px-4 py-2 border-4 border-black font-bold text-lg bg-main hover:bg-main-accent active:translate-x-[2px] active:translate-y-[2px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none',
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]', className)}>
      {children}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white border-4 border-black p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase italic">{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:text-red-500"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 border-4 border-black font-medium focus:outline-none focus:ring-2 focus:ring-main-accent bg-white',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 border-4 border-black font-medium focus:outline-none focus:ring-2 focus:ring-main-accent bg-white resize-none',
        className
      )}
      {...props}
    />
  );
}

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('markdown-content prose', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function FileInput({
  className,
  value,
  onChange,
  label = "Subir imagen",
  accept = "image/*"
}: {
  className?: string;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
}) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { api } = await import('../lib/api');
    try {
      const url = await api.uploadImage(file);
      onChange(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al subir imagen');
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="w-32 h-32 object-cover border-4 border-black" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 border-2 border-black font-bold text-sm hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer bg-gray-100 border-4 border-black px-4 py-2 font-bold hover:bg-gray-200 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {label}
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
