import React from 'react';

export default function DisciplLogo({ className = "w-10 h-10", size = 26 }) {
  return (
    <div className={`${className} rounded-2xl bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-950/20 shrink-0 transition-transform hover:scale-105`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="discipl-grad" x1="6" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="0.5" stopColor="#818CF8" />
            <stop offset="1" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* Modern geometric 'D' icon */}
        <path
          d="M7 6C7 4.89543 7.89543 4 9 4H18C23.5228 4 28 8.47715 28 14C28 19.5228 23.5228 24 18 24H12V27C12 27.5523 11.5523 28 11 28H8C7.44772 28 7 27.5523 7 27V6Z"
          fill="url(#discipl-grad)"
        />
        <path
          d="M12 9H17.5C20.5376 9 23 11.4624 23 14.5C23 17.5376 20.5376 20 17.5 20H12V9Z"
          fill="#0F172A"
        />
        <circle cx="16.5" cy="14.5" r="2.5" fill="url(#discipl-grad)" />
      </svg>
    </div>
  );
}
