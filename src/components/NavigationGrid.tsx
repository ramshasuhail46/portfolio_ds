import React from 'react';
import { Smile, Briefcase, Layers, PartyPopper, UserSearch } from 'lucide-react';

const navItems = [
    { label: 'Me', icon: Smile, color: 'text-[#45A19E]' },
    { label: 'Projects', icon: Briefcase, color: 'text-[#5E9E67]' },
    { label: 'Skills', icon: Layers, color: 'text-[#8E79CD]' },
    { label: 'Fun', icon: PartyPopper, color: 'text-[#C96090]' },
    { label: 'Contact', icon: UserSearch, color: 'text-[#B08E3D]' },
];

const NavigationGrid = () => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-[700px] px-4 mb-20">
            {navItems.map((item) => (
                <button
                    key={item.label}
                    className="flex flex-col items-center justify-center gap-2 py-5 px-2 glass-card rounded-2xl hover:shadow-xl hover:bg-white/50 hover:-translate-y-1 transition-all group border-gray-100/30"
                >
                    <div className="mb-1 transition-transform group-hover:scale-110">
                        <item.icon className={`w-6 h-6 ${item.color}`} strokeWidth={1.5} />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-600 tracking-tight">{item.label}</span>
                </button>
            ))}
        </div>
    );
};

export default NavigationGrid;
