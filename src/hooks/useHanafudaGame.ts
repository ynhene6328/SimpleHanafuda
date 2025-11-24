import { useState, useCallback } from 'react';
import type { Card, GameState, Player } from '../hanafuda-logic/types';
import { ALL_CARDS } from '../hanafuda-logic/constants';
import { calculateYaku } from '../hanafuda-logic/utils';

// Fisher-Yates shuffle
function shuffle(array: Card[]): Card[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const INITIAL_PLAYER_STATE: Player = {
    id: '',
    hand: [],
    captured: [],
    score: 0,
    isHuman: false,
};

export const useHanafudaGame = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [phase, setPhase] = useState<'idle' | 'player-turn' | 'cpu-turn' | 'game-over'>('idle');

    const initGame = useCallback(() => {
        const shuffledDeck = shuffle(ALL_CARDS);

        // Deal cards: 8 to player, 8 to field, 8 to cpu
        // Note: Real dealing is 4-4-4-4-4-4 usually, but simple deal is fine for now
        const playerHand = shuffledDeck.slice(0, 8);
        const fieldCards = shuffledDeck.slice(8, 16);
        const cpuHand = shuffledDeck.slice(16, 24);
        const remainingDeck = shuffledDeck.slice(24);

        const player1: Player = { ...INITIAL_PLAYER_STATE, id: 'Player', hand: playerHand, isHuman: true };
        const player2: Player = { ...INITIAL_PLAYER_STATE, id: 'CPU', hand: cpuHand, isHuman: false };

        setGameState({
            deck: remainingDeck,
            field: fieldCards,
            players: [player1, player2],
            currentTurn: 0, // Player starts
            currentMonth: 1,
            totalRounds: 6,
            isRoundOver: false,
            winner: null,
        });
        setPhase('player-turn');
    }, []);

    const resolveTurn = useCallback(async (playedCard: Card, playerIndex: number) => {
        if (!gameState) return;

        // 1. Match played card with field
        let currentField = [...gameState.field];
        let capturedCards: Card[] = [];

        const matchOnField = (card: Card, field: Card[]): { matched: boolean, taken: Card[], newField: Card[] } => {
            const matches = field.filter(c => c.month === card.month);
            if (matches.length === 0) {
                // No match, leave on field
                return { matched: false, taken: [], newField: [...field, card] };
            } else if (matches.length === 1) {
                // 1 match, take both
                return { matched: true, taken: [card, matches[0]], newField: field.filter(c => c.id !== matches[0].id) };
            } else if (matches.length === 2) {
                // 2 matches, choose one (simplified: take first one for now)
                // TODO: UI for selection
                return { matched: true, taken: [card, matches[0]], newField: field.filter(c => c.id !== matches[0].id) };
            } else if (matches.length === 3) {
                // 3 matches, take all (4 cards total)
                return { matched: true, taken: [card, ...matches], newField: field.filter(c => c.month !== card.month) };
            }
            return { matched: false, taken: [], newField: field };
        };

        // Step 1: Play from hand
        const step1 = matchOnField(playedCard, currentField);
        currentField = step1.newField;
        capturedCards.push(...step1.taken);

        // Step 2: Draw from deck
        const [drawnCard, ...remainingDeck] = gameState.deck;
        if (!drawnCard) {
            // End of deck (should be handled by round end logic usually)
            return;
        }

        // Step 3: Match drawn card
        const step2 = matchOnField(drawnCard, currentField);
        currentField = step2.newField;
        capturedCards.push(...step2.taken);

        // Update State
        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players] as [Player, Player];
            const currentPlayer = { ...newPlayers[playerIndex] };

            // Remove played card from hand
            currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== playedCard.id);

            // Add captured cards
            currentPlayer.captured = [...currentPlayer.captured, ...capturedCards];

            // Calculate Score (Basic)
            const scoreResult = calculateYaku(currentPlayer.captured);
            currentPlayer.score = scoreResult.totalScore;

            newPlayers[playerIndex] = currentPlayer;

            // Check for empty hands -> Round Over
            const isRoundOver = newPlayers[0].hand.length === 0 && newPlayers[1].hand.length === 0;

            return {
                ...prev,
                deck: remainingDeck,
                field: currentField,
                players: newPlayers,
                currentTurn: isRoundOver ? prev.currentTurn : (prev.currentTurn + 1) % 2,
                isRoundOver,
            };
        });

        // Switch Phase
        if (gameState.players[0].hand.length === 0 && gameState.players[1].hand.length === 0) { // Check previous state for safety, but logic above handles it
            setPhase('game-over');
        } else {
            setPhase(playerIndex === 0 ? 'cpu-turn' : 'player-turn');
        }

    }, [gameState]);

    // Simple CPU Logic
    const cpuTurn = useCallback(() => {
        if (!gameState || phase !== 'cpu-turn') return;

        // Simple: Pick random card
        const cpuHand = gameState.players[1].hand;
        if (cpuHand.length === 0) return;

        const randomIndex = Math.floor(Math.random() * cpuHand.length);
        const playedCard = cpuHand[randomIndex];

        // Simulate delay
        setTimeout(() => {
            resolveTurn(playedCard, 1);
        }, 1000);

    }, [gameState, phase, resolveTurn]);

    // Trigger CPU turn
    if (phase === 'cpu-turn' && gameState && !gameState.isRoundOver) {
        // Use effect or just call it? Better to use effect in component or check here carefully
        // For hook, exposing a function or auto-running?
        // Let's expose a function or use a useEffect inside the hook if we want auto-cpu
    }

    return {
        gameState,
        phase,
        initGame,
        playCard: (card: Card) => resolveTurn(card, 0),
        cpuTurn, // Expose for now to call from UI or Effect
    };
};
