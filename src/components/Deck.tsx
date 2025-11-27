import React from 'react';
import { motion } from 'framer-motion';

interface DeckProps {
    remaining: number;
    className?: string;
}

export const Deck: React.FC<DeckProps> = ({ remaining, className = '' }) => {
    return (
        <div className={`relative w-16 h-24 ${className}`}>
            {remaining > 0 ? (
                <>
                    {/* Stack effect */}
                    {remaining > 1 && (
                        <div className="absolute top-1 left-1 w-full h-full bg-red-800 rounded-md border border-white/50" />
                    )}
                    {remaining > 2 && (
                        <div className="absolute top-2 left-2 w-full h-full bg-red-800 rounded-md border border-white/50" />
                    )}

                    {/* Top Card */}
                    <motion.div
                        layoutId="deck-top"
                        className="absolute top-0 left-0 w-full h-full bg-red-600 rounded-md border-2 border-white flex items-center justify-center shadow-xl z-10"
                    >
                        <div className="text-white/50 text-xs font-bold">
                            {remaining}
                        </div>
                    </motion.div>
                </>
            ) : (
                <div className="w-full h-full border-2 border-white/20 rounded-md border-dashed flex items-center justify-center">
                    <span className="text-white/20 text-xs">Empty</span>
                </div>
            )}
        </div>
    );
};
