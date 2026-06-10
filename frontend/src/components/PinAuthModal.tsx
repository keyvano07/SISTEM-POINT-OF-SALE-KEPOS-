'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Loader2, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void | Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  errorMessage?: string;
}

export default function PinAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Otorisasi PIN',
  description = 'Masukkan PIN 6 digit dari Supervisor atau Manajer.',
  isLoading = false,
  errorMessage = ''
}: PinAuthModalProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!isOpen) setPin('');
  }, [isOpen]);

  // Auto-submit when 6 digits reached
  useEffect(() => {
    if (pin.length === 6 && !isLoading) {
      onSuccess(pin);
    }
  }, [pin, isLoading, onSuccess]);

  const handleKeyPress = useCallback((digit: string) => {
    if (pin.length < 6 && !isLoading) {
      setPin(prev => prev + digit);
    }
  }, [pin, isLoading]);

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader className="text-center items-center">
          <div className="p-3 bg-primary/10 rounded-full mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="animate-fade-in">
            <AlertDescription className="text-sm font-medium">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* PIN Display */}
        <div className="flex justify-center gap-2 my-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                i < pin.length
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input bg-muted/50 text-muted-foreground'
              }`}
            >
              {i < pin.length ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Memverifikasi...</span>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <Button
              key={digit}
              variant="outline"
              className="h-12 text-lg font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleKeyPress(digit)}
              disabled={isLoading || pin.length >= 6}
            >
              {digit}
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-12 text-xs font-semibold text-muted-foreground"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            className="h-12 text-lg font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => handleKeyPress('0')}
            disabled={isLoading || pin.length >= 6}
          >
            0
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={handleDelete}
            disabled={isLoading || pin.length === 0}
          >
            <Delete className="w-5 h-5" />
          </Button>
        </div>

        <Button variant="outline" className="w-full mt-2" onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
