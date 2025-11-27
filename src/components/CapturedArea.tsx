import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card as CardType } from '../hanafuda-logic/types';
import { Card } from './Card';

interface CapturedAreaProps {
    cards: CardType[];
    owner: 'player' | 'cpu';
    className?: string;
}

export const CapturedArea: React.FC<CapturedAreaProps> = ({ cards, owner, className = '' }) => {
    // Group cards by type
    const hikari = cards.filter(c => c.type === 'hikari');
    const tane = cards.filter(c => c.type === 'tane');
    const tan = cards.filter(c => c.type === 'tan');
    const kasu = cards.filter(c => c.type === 'kasu');

    const groups = [
        { label: '光', cards: hikari, color: 'bg-yellow-500' },
        { label: 'タネ', cards: tane, color: 'bg-orange-400' },
        { label: 'タン', cards: tan, color: 'bg-red-400' },
        { label: 'カス', cards: kasu, color: 'bg-gray-400' },
    ];

    return (
        <div className={`flex flex-col gap-2 p-2 rounded-lg bg-black/20 backdrop-blur-sm ${className}`}>
            <div className="text-xs text-white/70 font-bold mb-1 uppercase tracking-wider">
                {owner === 'player' ? 'Your Captured Cards' : 'CPU Captured Cards'}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {groups.map((group) => (
                    <div key={group.label} className="flex flex-col items-center min-w-[3rem]">
                        <div className={`text-[10px] text-white px-2 py-0.5 rounded-full mb-1 ${group.color} shadow-sm`}>
                            {group.label} ({group.cards.length})
                        </div>
                        <div className="flex -space-x-6 pl-2">
                            <AnimatePresence>
                                {group.cards.map((card, index) => (
                                    <div key={card.id} className="relative" style={{ zIndex: index }}>
                                        <Card
                                            card={card}
                                            isFaceUp={true}
                                            className="w-10 h-16 !static shadow-sm"
                                        />
                                    </div>
                                ))}
                            </AnimatePresence>
                            {group.cards.length === 0 && (
                                <div className="w-10 h-16 border-2 border-white/10 rounded-md border-dashed" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
