'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Delete, ShieldAlert } from 'lucide-react';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
  errorMessage?: string;
  isLoading?: boolean;
}

export default function PinAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Verifikasi Otorisasi',
  description = 'Masukkan 6-digit PIN Supervisor atau Manager untuk melanjutkan tindakan ini.',
  errorMessage = '',
  isLoading = false,
}: PinAuthModalProps) {
  const [pin, setPin] = useState<string>('');
  const [localError, setLocalError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setLocalError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (errorMessage) {
      setLocalError(errorMessage);
      setPin('');
    }
  }, [errorMessage]);

  const handleKeyPress = useCallback((num: string) => {
    if (pin.length >= 6 || isLoading) return;
    setLocalError('');
    const newPin = pin + num;
    setPin(newPin);

    // Auto submit if length is 6
    if (newPin.length === 6) {
      onSuccess(newPin);
    }
  }, [pin, isLoading, onSuccess]);

  const handleDelete = useCallback(() => {
    if (pin.length === 0 || isLoading) return;
    setPin(pin.slice(0, -1));
    setLocalError('');
  }, [pin, isLoading]);

  // Handle keypress from keyboard
  useEffect(() => {
    if (!isOpen || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, handleKeyPress, handleDelete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-md scale-95 transform rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl transition-all duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-on-surface-variant hover:text-on-surface disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {/* Title & Description */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-xl font-bold text-on-surface">{title}</h3>
          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed max-w-xs">{description}</p>
        </div>

        {/* PIN Indicators */}
        <div className="my-6 flex justify-center gap-3">
          {[...Array(6)].map((_, index) => {
            const hasChar = index < pin.length;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                  hasChar
                    ? 'border-primary bg-primary shadow-[0_0_8px_rgba(0,74,198,0.4)]'
                    : 'border-outline-variant bg-surface-container'
                }`}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {localError && (
          <div className="mb-4 text-center text-xs font-semibold text-error">
            {localError}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-4 text-center text-xs text-primary animate-pulse">
            Memverifikasi PIN otorisasi...
          </div>
        )}

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num.toString())}
              disabled={isLoading}
              className="flex h-16 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-2xl font-semibold text-on-surface active:bg-primary active:text-on-primary active:scale-95 hover:bg-surface-container transition-all font-mono"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex h-16 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high text-sm font-semibold text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isLoading}
            className="flex h-16 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-2xl font-semibold text-on-surface active:bg-primary active:text-on-primary active:scale-95 hover:bg-surface-container transition-all font-mono"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex h-16 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high text-on-surface-variant hover:text-error active:scale-95 transition-all"
          >
            <Delete size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
