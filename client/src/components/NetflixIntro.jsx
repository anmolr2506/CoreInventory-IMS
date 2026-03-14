import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

const NetflixIntro = ({ onComplete }) => {
    const [phase, setPhase] = useState('zoom'); // 'zoom' → 'fadeout'

    useEffect(() => {
        // Phase 1: Logo zoom in (2.5s)
        const zoomTimer = setTimeout(() => {
            setPhase('fadeout');
        }, 2500);

        // Phase 2: Fade out (0.8s)
        const completeTimer = setTimeout(() => {
            onComplete();
        }, 3300);

        return () => {
            clearTimeout(zoomTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0f1c] transition-opacity duration-700 ${
                phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
            }`}
        >
            {/* Background glow effect */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-[glow-pulse_2s_ease-in-out_infinite]" />
            </div>

            {/* Logo Container */}
            <div className={`flex flex-col items-center space-y-6 ${
                phase === 'zoom' ? 'animate-[netflix-zoom_2.5s_cubic-bezier(0.16,1,0.3,1)_forwards]' : ''
            }`}>
                {/* Icon */}
                <div className="relative">
                    <div className="p-6 bg-cyan-500 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.6)] animate-[glow-pulse_1.5s_ease-in-out_infinite]">
                        <Package className="w-16 h-16 text-white" />
                    </div>
                    {/* Ring effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/30 animate-ping" />
                </div>

                {/* Title */}
                <div className="text-center">
                    <h1 className="text-5xl font-extrabold text-white tracking-tight">
                        Core Inventory
                    </h1>
                    <p className="text-cyan-400 text-lg font-medium mt-2 tracking-widest uppercase">
                        Admin Panel
                    </p>
                </div>
            </div>

            {/* Bottom loading bar */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-[loading-bar_2.5s_ease-in-out_forwards]" />
            </div>
        </div>
    );
};

export default NetflixIntro;
