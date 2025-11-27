import React from 'react';
import { Card } from './Card';
import { CapturedArea } from './CapturedArea';
import { Deck } from './Deck';
import { KoiKoiModal } from './KoiKoiModal';
import { LogWindow } from './LogWindow';
import type { GameState, Card as CardType, GamePhase } from '../hanafuda-logic/types';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

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
    pendingCard?: CardType | null; // New prop for active card visualization
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
    pendingCard,
}) => {
    const { field, players, currentTurn, isRoundOver, winner, deck } = gameState;
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
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative font-sans selection:bg-green-500/30">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #334155 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            </div>

            {/* Main Layout Grid */}
            <div className="relative z-10 h-screen flex flex-col p-4 gap-4 max-w-7xl mx-auto">

                {/* Top Bar: CPU Info & Logs */}
                <div className="flex justify-between items-start h-32">
                    <CapturedArea cards={cpu.captured} owner="cpu" className="w-2/3" />

                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-4 py-2 rounded-lg backdrop-blur-md shadow-lg border border-white/10 transition-colors ${currentTurn === 1 ? 'bg-red-900/50 border-red-500/50' : 'bg-slate-800/50'}`}>
                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Opponent</div>
                            <div className="text-2xl font-bold">{cpu.score} <span className="text-sm font-normal text-white/50">pts</span></div>
                        </div>
                        <div className="w-64 h-24 relative">
                            <div className="absolute inset-0 overflow-hidden rounded-lg bg-black/40 backdrop-blur-sm border border-white/5">
                                <LogWindow logs={logs} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Area: Field, Deck, CPU Hand */}
                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-8 items-center">

                    {/* Left: CPU Hand (Hidden) */}
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex -space-x-12 rotate-90 origin-center scale-75 opacity-80">
                            <AnimatePresence>
                                {cpu.hand.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        isFaceUp={false}
                                        className="shadow-xl border-white/20"
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Center: Field & Deck */}
                    <div className="flex flex-col items-center gap-8">
                        {/* Field Grid */}
                        <div className="grid grid-cols-4 gap-3 p-6 bg-green-900/20 rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl">
                            <AnimatePresence>
                                {field.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        isFaceUp={true}
                                        isSelectable={isFieldCardSelectable(card)}
                                        onClick={phase === 'select-match' ? onSelectMatch : undefined}
                                        className={`
                                            ${isFieldCardDimmed(card) ? 'opacity-40 grayscale' : 'opacity-100'}
                                            ${isFieldCardSelectable(card) ? 'ring-4 ring-yellow-400 scale-110 z-20 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : ''}
                                        `}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Action Zone: Deck & Active Card */}
                        <div className="flex items-center gap-12 h-32 relative">
                            <Deck remaining={deck.length} />

                            {/* Active Card Placeholder / Display */}
                            <div className="w-16 h-24 rounded-md border-2 border-white/10 border-dashed flex items-center justify-center relative">
                                <span className="text-white/10 text-xs">Active</span>

                                {/* Pending Card Animation */}
                                <AnimatePresence>
                                    {pendingCard && (
                                        <div className="absolute inset-0 z-50">
                                            <Card
                                                card={pendingCard}
                                                isFaceUp={true}
                                                className="shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-110"
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold bg-black/50 px-2 py-1 rounded text-white"
                                            >
                                                Playing...
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right: Empty for balance or future use */}
                    <div className="flex items-center justify-center">
                        {/* Could put special yaku indicators here */}
                    </div>
                </div>

                {/* Bottom Bar: Player Hand & Info */}
                <div className="flex flex-col gap-4 h-48 justify-end pb-4">
                    {/* Player Hand */}
                    <div className="flex justify-center -space-x-4 h-28 items-end">
                        <LayoutGroup>
                            <AnimatePresence>
                                {player.hand.map((card) => (
                                    <Card
                                        key={card.id}
                                        card={card}
                                        isFaceUp={true}
                                        isSelectable={phase === 'waiting-input'}
                                        onClick={onPlayCard}
                                        className={`
                                            origin-bottom transition-all duration-300
                                            ${phase === 'waiting-input' ? 'hover:-translate-y-4 hover:z-10 hover:scale-110 cursor-pointer' : 'opacity-80 cursor-not-allowed grayscale-[0.3]'}
                                        `}
                                    />
                                ))}
                            </AnimatePresence>
                        </LayoutGroup>
                    </div>

                    {/* Player Info & Captured */}
                    <div className="flex justify-between items-end">
                        <div className={`px-6 py-3 rounded-lg backdrop-blur-md shadow-lg border border-white/10 transition-colors ${currentTurn === 0 ? 'bg-green-600/50 border-green-400/50' : 'bg-slate-800/50'}`}>
                            <div className="text-xs text-white/70 uppercase tracking-wider mb-1">You</div>
                            <div className="text-3xl font-bold">{player.score} <span className="text-sm font-normal text-white/50">pts</span></div>
                        </div>

                        <CapturedArea cards={player.captured} owner="player" className="w-2/3 flex-row-reverse" />
                    </div>
                </div>
            </div>

            {/* Overlay Messages */}
            <AnimatePresence>
                {phase === 'select-match' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
                    >
                        <div className="bg-black/80 text-white px-8 py-4 rounded-full font-bold text-2xl shadow-[0_0_50px_rgba(250,204,21,0.5)] border border-yellow-500/50 animate-pulse">
                            Select a match!
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-900 border border-white/10 p-12 rounded-2xl text-center shadow-2xl max-w-lg w-full"
                    >
                        <h2 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
                            {winner === 0 ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW'}
                        </h2>
                        <div className="text-white/50 mb-8 uppercase tracking-widest text-sm">Round Complete</div>

                        <div className="flex justify-center gap-12 mb-10">
                            <div className="text-center">
                                <div className="text-sm text-white/50 mb-1">You</div>
                                <div className="text-4xl font-bold">{player.score}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-white/50 mb-1">CPU</div>
                                <div className="text-4xl font-bold">{cpu.score}</div>
                            </div>
                        </div>

                        <button
                            onClick={onRestart}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg hover:shadow-green-500/20"
                        >
                            Play Again
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
