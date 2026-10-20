import { useEffect, useState } from 'react';

const COLORS = ['#22c55e', '#0ea5e9', '#f97316', '#facc15', '#ec4899', '#14b8a6', '#a855f7', '#ef4444'];

export function fireConfetti() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1.5 + Math.random()}s`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3000);
}

export function Confetti({ trigger }: { trigger: number }) {
  useEffect(() => {
    if (trigger > 0) fireConfetti();
  }, [trigger]);

  return null;
}
