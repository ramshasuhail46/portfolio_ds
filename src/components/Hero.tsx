import React from 'react';
import Image from 'next/image';

const Hero = () => {
    return (
        <div className="flex flex-col items-center gap-4 mt-8 mb-8">
            <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
                    {/* Geometric node/Y-shape logo icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
                        <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.2L18 7.5v9l-6 3-6-3v-9l6-3.3z" />
                    </svg>
                </div>
                <p className="text-2xl font-semibold text-[#111827]">Hey, I&apos;m Ramsha 👋</p>
                <h1 className="text-7xl font-black tracking-tighter text-black mb-2">AI Engineer</h1>
            </div>

            <div className="relative w-full max-w-[500px] h-80 flex items-center justify-center -mt-4">
                <div className="w-full h-full flex items-center justify-center relative">
                    <Image
                        src="/avatar.png"
                        alt="Ramsha Avatar"
                        fill
                        className="object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500"
                        priority
                    />
                </div>
            </div>
        </div>
    );
};

export default Hero;
