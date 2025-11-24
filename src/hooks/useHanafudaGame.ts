import { useState, useCallback, useRef } from 'react';
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
    const [phase, setPhase] = useState<'idle' | 'player-turn' | 'cpu-turn' | 'game-over' | 'koi-koi-chance'>('idle');
    const [lastYakuInfo, setLastYakuInfo] = useState<{ name: string; score: number } | null>(null);

    // Track previous scores to detect Yaku updates
    const prevScores = useRef<[number, number]>([0, 0]);

    const initGame = useCallback(() => {
        const shuffledDeck = shuffle(ALL_CARDS);

        // Deal cards: 8 to player, 8 to field, 8 to cpu
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
        setLastYakuInfo(null);
        prevScores.current = [0, 0];
    }, []);

    const resolveTurn = useCallback(async (playedCard: Card, playerIndex: number) => {
        if (!gameState) return;

        // 1. Match played card with field
        let currentField = [...gameState.field];
        let capturedCards: Card[] = [];

        const matchOnField = (card: Card, field: Card[]): { matched: boolean, taken: Card[], newField: Card[] } => {
            const matches = field.filter(c => c.month === card.month);
            if (matches.length === 0) {
                return { matched: false, taken: [], newField: [...field, card] };
            } else if (matches.length === 1) {
                return { matched: true, taken: [card, matches[0]], newField: field.filter(c => c.id !== matches[0].id) };
            } else if (matches.length === 2) {
                // 2 matches, choose one (simplified: take first one for now)
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
            // End of deck logic if needed
            return;
        }

        // Step 3: Match drawn card
        const step2 = matchOnField(drawnCard, currentField);
        currentField = step2.newField;
        capturedCards.push(...step2.taken);

        // Update State
        let newPhase: typeof phase = playerIndex === 0 ? 'cpu-turn' : 'player-turn';
        let yakuUpdateInfo: { name: string; score: number } | null = null;

        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players] as [Player, Player];
            const currentPlayer = { ...newPlayers[playerIndex] };

            // Remove played card from hand
            currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== playedCard.id);

            // Add captured cards
            currentPlayer.captured = [...currentPlayer.captured, ...capturedCards];

            // Calculate Score
            const scoreResult = calculateYaku(currentPlayer.captured);
            currentPlayer.score = scoreResult.totalScore;

            // Check for Score Increase (Yaku formed/improved)
            if (currentPlayer.score > prevScores.current[playerIndex]) {
                // Score increased!
                // Determine which yaku triggered it (simplified: just show total or last added)
                // For now, just say "Yaku Formed"
                const diff = currentPlayer.score - prevScores.current[playerIndex];
                yakuUpdateInfo = { name: '役成立', score: diff }; // Simplified

                // Update prev score
                prevScores.current[playerIndex] = currentPlayer.score;

                // Trigger Koi-Koi Chance
                newPhase = 'koi-koi-chance';
            }

            newPlayers[playerIndex] = currentPlayer;

            // Check for empty hands -> Round Over (if no koi-koi happened yet, but standard rule is check after turn)
            const handsEmpty = newPlayers[0].hand.length === 0 && newPlayers[1].hand.length === 0;

            if (handsEmpty && newPhase !== 'koi-koi-chance') {
                // Game Over (Draw or end)
                newPhase = 'game-over';
                return {
                    ...prev,
                    deck: remainingDeck,
                    field: currentField,
                    players: newPlayers,
                    isRoundOver: true,
                    winner: null, // Draw if ran out of cards without yaku? Or compare scores? Standard is dealer wins or draw.
                };
            }

            return {
                ...prev,
                deck: remainingDeck,
                field: currentField,
                players: newPlayers,
                currentTurn: newPhase === 'koi-koi-chance' ? prev.currentTurn : (prev.currentTurn + 1) % 2,
                isRoundOver: false,
            };
        });

        if (yakuUpdateInfo) {
            setLastYakuInfo(yakuUpdateInfo);
            setPhase('koi-koi-chance');

            // If CPU, decide immediately (simplified)
            if (playerIndex === 1) {
                setTimeout(() => {
                    // CPU always Koi-Koi for now if score < 10, else Stop? 
                    // Let's make CPU simple: Stop if > 5 points, else Koi-Koi
                    // Or just random for fun?
                    // Let's just Stop to show winning.
                    handleShobu();
                }, 1000);
            }
        } else {
            setPhase(newPhase);
        }

    }, [gameState]);

    const handleKoiKoi = useCallback(() => {
        setPhase(prev => {
            if (!gameState) return 'idle';
            // Resume turn switching
            const nextTurn = (gameState.currentTurn + 1) % 2;
            // Check if game over (hands empty)
            if (gameState.players[0].hand.length === 0 && gameState.players[1].hand.length === 0) {
                return 'game-over';
            }
            return nextTurn === 0 ? 'player-turn' : 'cpu-turn';
        });
        setLastYakuInfo(null);
    }, [gameState]);

    const handleShobu = useCallback(() => {
        if (!gameState) return;
        setGameState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                isRoundOver: true,
                winner: prev.currentTurn,
            };
        });
        setPhase('game-over');
        setLastYakuInfo(null);
    }, [gameState]);


    // Improved CPU Logic
    const cpuTurn = useCallback(() => {
        if (!gameState || phase !== 'cpu-turn') return;

        const cpuHand = gameState.players[1].hand;
        const field = gameState.field;
        if (cpuHand.length === 0) return;

        // 1. Check for matches
        // Priority: Match > Random
        // Better Priority: Match High Value (Hikari/Tane) > Match Any > Discard Kasu > Discard Any

        let bestCard = cpuHand[0];
        let foundMatch = false;

        // Find matches
        const matchableCards = cpuHand.filter(handCard =>
            field.some(fieldCard => fieldCard.month === handCard.month)
        );

        if (matchableCards.length > 0) {
            // Pick best match
            // Sort by type value: hikari > tane > tan > kasu
            const typeValue = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
            matchableCards.sort((a, b) => typeValue[b.type] - typeValue[a.type]);
            bestCard = matchableCards[0];
            foundMatch = true;
        } else {
            // No match, discard logic
            // Discard Kasu first
            const kasuCards = cpuHand.filter(c => c.type === 'kasu');
            if (kasuCards.length > 0) {
                bestCard = kasuCards[0];
            } else {
                // Discard lowest value
                const typeValue = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
                const sortedHand = [...cpuHand].sort((a, b) => typeValue[a.type] - typeValue[b.type]);
                bestCard = sortedHand[0];
            }
        }

        // Simulate delay
        setTimeout(() => {
            resolveTurn(bestCard, 1);
        }, 1000);

    }, [gameState, phase, resolveTurn]);

    return {
        gameState,
        phase,
        lastYakuInfo,
        initGame,
        playCard: (card: Card) => resolveTurn(card, 0),
        cpuTurn,
        handleKoiKoi,
        handleShobu,
    };
};
