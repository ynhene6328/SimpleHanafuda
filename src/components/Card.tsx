import React from 'react';
import type { Card as CardType } from '../hanafuda-logic/types';
import { getCardImagePath } from '../hanafuda-logic/utils';

interface CardProps {
    card: CardType;
    onClick?: (card: CardType) => void;
    isFaceUp?: boolean;
    isSelectable?: boolean;
    className?: string;
}

export const Card: React.FC<CardProps> = ({
    card,
    onClick,
    isFaceUp = true,
    isSelectable = false,
    className = '',
}) => {
    const imagePath = getCardImagePath(card);

    return (
        <div
            className={`
                relative w-16 h-24 rounded-md shadow-md transition-transform duration-200
                ${isSelectable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-lg' : ''}
                ${className}
            `}
            onClick={() => isSelectable && onClick && onClick(card)}
        >
            {isFaceUp ? (
                <img
                    src={imagePath}
                    alt={card.name}
                    className="w-full h-full object-contain bg-white rounded-md border border-gray-300"
                    draggable={false}
                />
            ) : (
                <div className="w-full h-full bg-red-600 rounded-md border-2 border-white flex items-center justify-center">
                    <span className="text-white font-bold text-xs opacity-50">Back</span>
                </div>
            )}
        </div>
    );
};
