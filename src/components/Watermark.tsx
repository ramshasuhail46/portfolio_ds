import React from 'react';

const Watermark = () => {
    return (
        <div className="fixed bottom-1/4 left-0 w-full flex justify-center pointer-events-none select-none" style={{ zIndex: -1 }}>
            <h2 className="text-[15vw] font-black text-gray-200/40 tracking-wider">
                RAMSHA
            </h2>
        </div>
    );
};

export default Watermark;
