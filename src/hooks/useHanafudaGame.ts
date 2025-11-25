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
    const [logs, setLogs] = useState<string[]>([]);

    // Track previous scores to detect Yaku updates
    const prevScores = useRef<[number, number]>([0, 0]);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev, message]);
    }, []);

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
        setLogs(['Game Started!']);
        prevScores.current = [0, 0];
    }, []);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const resolveTurn = useCallback(async (playedCard: Card, playerIndex: number) => {
        if (!gameState) return;

        const playerName = playerIndex === 0 ? 'Player' : 'CPU';
        addLog(`${playerName} played [${playedCard.month}月: ${playedCard.name}]`);

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
        await sleep(500);
        const step1 = matchOnField(playedCard, currentField);
        currentField = step1.newField;

        if (step1.matched) {
            addLog(`Matched [${playedCard.name}] with [${step1.taken[1].name}]`);
            capturedCards.push(...step1.taken);
        } else {
            addLog(`No match for [${playedCard.name}] (Discarded)`);
        }

        // Update state after step 1 (visual update)
        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players] as [Player, Player];
            const currentPlayer = { ...newPlayers[playerIndex] };
            currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== playedCard.id);
            return { ...prev, field: currentField, players: newPlayers };
        });

        // Step 2: Draw from deck
        await sleep(500);
        const [drawnCard, ...remainingDeck] = gameState.deck;
        if (!drawnCard) return;

        addLog(`Drew [${drawnCard.month}月: ${drawnCard.name}] from deck`);

        // Step 3: Match drawn card
        await sleep(500);
        const step2 = matchOnField(drawnCard, currentField);
        currentField = step2.newField;

        if (step2.matched) {
            addLog(`Matched [${drawnCard.name}] with [${step2.taken[1].name}]`);
            capturedCards.push(...step2.taken);
        } else {
            addLog(`No match for [${drawnCard.name}] (Discarded)`);
        }

        // Final Update for this turn
        let newPhase: typeof phase = playerIndex === 0 ? 'cpu-turn' : 'player-turn';
        let yakuUpdateInfo: { name: string; score: number } | null = null;

        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players] as [Player, Player];
            const currentPlayer = { ...newPlayers[playerIndex] };

            // Ensure hand is updated (already done above but good to be safe)
            currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== playedCard.id);

            // Add captured cards
            currentPlayer.captured = [...currentPlayer.captured, ...capturedCards];

            // Calculate Score
            const scoreResult = calculateYaku(currentPlayer.captured);
            currentPlayer.score = scoreResult.totalScore;

            // Check for Score Increase (Yaku formed/improved)
            if (currentPlayer.score > prevScores.current[playerIndex]) {
                const diff = currentPlayer.score - prevScores.current[playerIndex];
                yakuUpdateInfo = { name: '役成立', score: diff };
                prevScores.current[playerIndex] = currentPlayer.score;
                newPhase = 'koi-koi-chance';
                addLog(`${playerName} formed Yaku! Score +${diff}`);
            }

            newPlayers[playerIndex] = currentPlayer;

            const handsEmpty = newPlayers[0].hand.length === 0 && newPlayers[1].hand.length === 0;

            if (handsEmpty && newPhase !== 'koi-koi-chance') {
                newPhase = 'game-over';
                addLog('Round Over (Empty Hands)');
                return {
                    ...prev,
                    deck: remainingDeck,
                    field: currentField,
                    players: newPlayers,
                    isRoundOver: true,
                    winner: null,
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

            if (playerIndex === 1) {
                setTimeout(() => {
                    handleShobu();
                }, 1000);
            }
        } else {
            setPhase(newPhase);
        }

    }, [gameState, addLog]);

    const handleKoiKoi = useCallback(() => {
        addLog('Player chose Koi-Koi!');
        setPhase(prev => {
            if (!gameState) return 'idle';
            const nextTurn = (gameState.currentTurn + 1) % 2;
            if (gameState.players[0].hand.length === 0 && gameState.players[1].hand.length === 0) {
                return 'game-over';
            }
            return nextTurn === 0 ? 'player-turn' : 'cpu-turn';
        });
        setLastYakuInfo(null);
    }, [gameState, addLog]);

    const handleShobu = useCallback(() => {
        // We need to access the current state, but handleShobu is a callback.
        // We can use a functional update or ref if needed, but here we rely on the closure or state update.
        // Ideally, we should pass the winner info or derive it.
        // Let's assume the current turn player is the winner (since they chose Shobu).

        setGameState(prev => {
            if (!prev) return null;
            const winnerName = prev.currentTurn === 0 ? 'Player' : 'CPU';
            // Note: We can't call addLog here easily because it's inside setGameState (pure function expected ideally, though React allows side effects sometimes, it's bad practice).
            // Better to call addLog outside.
            return {
                ...prev,
                isRoundOver: true,
                winner: prev.currentTurn,
            };
        });
        addLog(`Round Over! Winner decided.`);
        setPhase('game-over');
        setLastYakuInfo(null);
    }, [addLog]);


    // Improved CPU Logic
    const cpuTurn = useCallback(() => {
        if (!gameState || phase !== 'cpu-turn') return;

        const cpuHand = gameState.players[1].hand;
        const field = gameState.field;
        if (cpuHand.length === 0) return;

        let bestCard = cpuHand[0];

        const matchableCards = cpuHand.filter(handCard =>
            field.some(fieldCard => fieldCard.month === handCard.month)
        );

        if (matchableCards.length > 0) {
            const typeValue = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
            matchableCards.sort((a, b) => typeValue[b.type] - typeValue[a.type]);
            bestCard = matchableCards[0];
        } else {
            const kasuCards = cpuHand.filter(c => c.type === 'kasu');
            if (kasuCards.length > 0) {
                bestCard = kasuCards[0];
            } else {
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
        logs,
        initGame,
        playCard: (card: Card) => resolveTurn(card, 0),
        cpuTurn,
        handleKoiKoi,
        handleShobu,
    };
};
