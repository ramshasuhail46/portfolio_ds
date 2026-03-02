import React from 'react';
import { ArrowRight } from 'lucide-react';

const SearchBar = () => {
    return (
        <div className="w-full max-w-lg px-4 mb-2">
            <div className="relative group">
                <input
                    type="text"
                    placeholder="Ask me anything..."
                    className="w-full px-8 py-4 glass-card rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-gray-800 placeholder-gray-500 text-lg shadow-lg"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-[#5D9CEC] rounded-full flex items-center justify-center text-white hover:bg-blue-500 hover:scale-105 transition-all">
                    <ArrowRight size={22} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};

export default SearchBar;
