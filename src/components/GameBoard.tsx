import React from 'react';
import { Card } from './Card';
import { KoiKoiModal } from './KoiKoiModal';
import { LogWindow } from './LogWindow';
import type { GameState, Card as CardType, GamePhase } from '../hanafuda-logic/types';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

interface GameBoardProps {
    gameState: GameState;
    phase: GamePhase;
    logs: string[];
    matchOptions: CardType[];
    onPlayCard: (card: CardType) => void;
    onSelectMatch: (card: CardType) => void;
    onKoiKoi: () => void;
    onShobu: () => void;
    onRestart: () => void;
    lastYakuInfo?: { name: string; score: number } | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
    gameState,
    phase,
    logs,
    matchOptions,
    onPlayCard,
    onSelectMatch,
    onKoiKoi,
    onShobu,
    onRestart,
    lastYakuInfo,
}) => {
    const { field, players, currentTurn, isRoundOver, winner } = gameState;
    const player = players[0];
    const cpu = players[1];

    // Helper to check if a field card is selectable (during SELECT_MATCH)
    const isFieldCardSelectable = (card: CardType) => {
        return phase === 'select-match' && matchOptions.some(c => c.id === card.id);
    };

    // Helper to determine if a field card should be dimmed
    const isFieldCardDimmed = (card: CardType) => {
        if (phase === 'select-match') {
            return !matchOptions.some(c => c.id === card.id);
        }
        return false;
    };

    return (
        <div className="min-h-screen bg-green-800 p-4 flex flex-col relative overflow-hidden">
            {/* Status Bar */}
            <div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg z-10 w-48">
                <div className="text-sm font-bold text-gray-600 mb-2">Turn: {currentTurn === 0 ? 'YOU' : 'CPU'}</div>
                <div className="flex justify-between items-center mb-1">
                    <span>You:</span>
                    <span className="font-bold text-xl">{player.score}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>CPU:</span>
                    <span className="font-bold text-xl">{cpu.score}</span>
                </div>
            </div>

            {/* Log Window */}
            <div className="absolute top-40 right-4 w-64 z-10 opacity-90 hover:opacity-100 transition-opacity">
                <LogWindow logs={logs} />
            </div>

            <LayoutGroup>
                {/* CPU Area */}
                <div className="flex-1 flex flex-col items-center justify-start py-4 border-b border-white/10">
                    <div className="w-full max-w-4xl flex justify-between items-start px-4">
                        <div className="flex -space-x-8">
                            <AnimatePresence>
                                {cpu.hand.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        isFaceUp={false}
                                        className="transform hover:-translate-y-0"
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        <div className="flex flex-wrap gap-1 w-64 justify-end">
                            <AnimatePresence>
                                {cpu.captured.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        className="w-8 h-12 !static"
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Field Area */}
                <div className="flex-[2] flex items-center justify-center py-8">
                    <div className="grid grid-cols-6 gap-4">
                        <AnimatePresence>
                            {field.map((card) => (
                                <Card
                                    key={card.id}
                                    card={card}
                                    isFaceUp={true}
                                    isSelectable={isFieldCardSelectable(card)}
                                    onClick={phase === 'select-match' ? onSelectMatch : undefined}
                                    className={`
                                        ${isFieldCardDimmed(card) ? 'opacity-50' : 'opacity-100'}
                                        ${isFieldCardSelectable(card) ? 'ring-4 ring-yellow-400 scale-110 z-10' : ''}
                                    `}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                    {phase === 'select-match' && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                            <div className="bg-black/70 text-white px-6 py-3 rounded-full font-bold text-xl animate-pulse">
                                Select a card to match!
                            </div>
                        </div>
                    )}
                </div>

                {/* Player Area */}
                <div className="flex-1 flex flex-col items-center justify-end py-4 border-t border-white/10">
                    <div className="w-full max-w-4xl flex justify-between items-end px-4">
                        <div className="flex -space-x-4">
                            <AnimatePresence>
                                {player.hand.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        isFaceUp={true}
                                        isSelectable={phase === 'waiting-input'}
                                        onClick={onPlayCard}
                                        className={`transition-all ${phase === 'waiting-input' ? 'hover:z-10' : 'opacity-80 cursor-not-allowed'}`}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        <div className="flex flex-wrap gap-1 w-64 justify-end">
                            <AnimatePresence>
                                {player.captured.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        className="w-8 h-12 !static"
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </LayoutGroup>

            {/* Modals */}
            {phase === 'koi-koi-decision' && lastYakuInfo && (
                <KoiKoiModal
                    onKoiKoi={onKoiKoi}
                    onShobu={onShobu}
                    yakuName={lastYakuInfo.name}
                    score={lastYakuInfo.score}
                />
            )}

            {isRoundOver && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg text-center">
                        <h2 className="text-4xl font-bold mb-4">
                            {winner === 0 ? 'YOU WIN!' : winner === 1 ? 'CPU WINS!' : 'DRAW'}
                        </h2>
                        <p className="text-xl mb-6">
                            Final Score - You: {player.score}, CPU: {cpu.score}
                        </p>
                        <button
                            onClick={onRestart}
                            className="px-8 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-500"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
