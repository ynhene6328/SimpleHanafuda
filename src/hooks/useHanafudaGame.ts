import { useState, useCallback, useRef, useEffect } from 'react';
import type { Card, GameState, Player, GamePhase } from '../hanafuda-logic/types';
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
    const [phase, setPhase] = useState<GamePhase>('idle');
    const [lastYakuInfo, setLastYakuInfo] = useState<{ name: string; score: number } | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    // State for intermediate turn processing
    const [pendingCard, setPendingCard] = useState<Card | null>(null); // Card currently being played/drawn
    const [matchOptions, setMatchOptions] = useState<Card[]>([]); // Field cards that can be matched (for selection)
    const [turnSource, setTurnSource] = useState<'hand' | 'deck'>('hand'); // Are we processing hand or deck?

    // Track previous scores to detect Yaku updates
    const prevScores = useRef<[number, number]>([0, 0]);

    // Lock for async operations to prevent race conditions (double-clicks)
    const isProcessing = useRef(false);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev, message]);
    }, []);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        setPhase('waiting-input');
        setLastYakuInfo(null);
        setLogs(['Game Started!']);
        prevScores.current = [0, 0];
        setPendingCard(null);
        setMatchOptions([]);
        isProcessing.current = false;
    }, [addLog]);

    // --- Core Logic Helpers ---

    const findMatches = (card: Card, field: Card[]): Card[] => {
        return field.filter(c => c.month === card.month);
    };

    // --- State Machine Actions ---

    // 1. Player selects a card from hand
    const playCard = useCallback(async (card: Card) => {
        if (!gameState || phase !== 'waiting-input' || isProcessing.current) return;
        isProcessing.current = true;

        setPendingCard(card);
        setTurnSource('hand');
        addLog(`Player played [${card.name}]`);

        // Remove from hand immediately for visual feedback
        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players] as [Player, Player];
            newPlayers[0].hand = newPlayers[0].hand.filter(c => c.id !== card.id);
            return { ...prev, players: newPlayers };
        });

        const matches = findMatches(card, gameState.field);

        if (matches.length === 2) {
            // Ambiguous match -> User must select
            setMatchOptions(matches);
            setPhase('select-match');
            addLog('Select a card to match.');
            isProcessing.current = false; // Allow input for selection
        } else {
            // 0, 1, or 3 matches -> Auto resolve
            setPhase('resolve-hand'); // Block input
            await resolveMatch(card, matches, 'hand');
            isProcessing.current = false;
        }
    }, [gameState, phase, addLog]);

    // 2. Resolve Match (Common for Hand and Deck)
    const resolveMatch = async (card: Card, matches: Card[], source: 'hand' | 'deck', selectedMatchId?: number) => {
        if (!gameState) return;

        let taken: Card[] = [];
        let newField = [...gameState.field];

        if (matches.length === 0) {
            // Discard
            newField.push(card);
            addLog(`No match. Discarded to field.`);
        } else if (matches.length === 1) {
            // Single match
            taken = [card, matches[0]];
            newField = newField.filter(c => c.id !== matches[0].id);
            addLog(`Matched with [${matches[0].name}]`);
        } else if (matches.length === 2) {
            // 2 matches - use selectedMatchId
            const target = matches.find(c => c.id === selectedMatchId) || matches[0]; // Fallback should not happen in correct flow
            taken = [card, target];
            newField = newField.filter(c => c.id !== target.id);
            addLog(`Matched with [${target.name}]`);
        } else if (matches.length === 3) {
            // 3 matches - take all (Hikari-Kuttsuki rule usually, or just take all 3 + played = 4)
            taken = [card, ...matches];
            newField = newField.filter(c => c.month !== card.month);
            addLog(`Matched all 3 cards!`);
        }

        // Update State with result
        setGameState(prev => {
            if (!prev) return null;
            const currentPlayerIdx = prev.currentTurn;
            const newPlayers = [...prev.players] as [Player, Player];

            // Deduplicate: Ensure we don't add cards that are already captured
            const currentCapturedIds = new Set(newPlayers[currentPlayerIdx].captured.map(c => c.id));
            const uniqueTaken = taken.filter(c => !currentCapturedIds.has(c.id));

            if (uniqueTaken.length !== taken.length) {
                console.warn('[WARNING] Attempted to capture duplicate cards:', taken);
            }

            newPlayers[currentPlayerIdx].captured = [...newPlayers[currentPlayerIdx].captured, ...uniqueTaken];
            return { ...prev, field: newField, players: newPlayers };
        });

        // DEBUG: Log captured cards to verify state
        if (gameState) {
            const currentPlayerIdx = gameState.currentTurn;
            const currentCaptured = gameState.players[currentPlayerIdx].captured;
            const newCaptured = [...currentCaptured, ...taken];
            const capturedNames = newCaptured.map(c => c.name).join(', ');
            addLog(`[DEBUG] Captured (${newCaptured.length}): ${capturedNames}`);
        }

        setPendingCard(null);
        setMatchOptions([]);

        // Transition to next phase
        if (source === 'hand') {
            setPhase('draw-deck');
        } else {
            setPhase('check-yaku');
        }
    };

    // 3. User selects a match (from UI)
    const selectMatch = useCallback(async (fieldCard: Card) => {
        if (phase !== 'select-match' || !pendingCard || isProcessing.current) return;
        isProcessing.current = true;

        // Validate selection
        if (!matchOptions.some(c => c.id === fieldCard.id)) {
            isProcessing.current = false;
            return;
        }

        setPhase(turnSource === 'hand' ? 'resolve-hand' : 'resolve-deck'); // Immediate transition
        await resolveMatch(pendingCard, matchOptions, turnSource, fieldCard.id);
        isProcessing.current = false;
    }, [phase, pendingCard, matchOptions, turnSource, gameState]);

    // 6. End Turn / Switch Player
    const endTurn = async () => {
        if (!gameState) return;

        // Check for empty hands (Game Over)
        if (gameState.players[0].hand.length === 0 && gameState.players[1].hand.length === 0) {
            setPhase('game-over');
            setGameState(prev => ({ ...prev!, isRoundOver: true, winner: null })); // Draw or check scores
            addLog('Round Over (Empty Hands)');
            return;
        }

        const nextTurn = (gameState.currentTurn + 1) % 2;
        setGameState(prev => ({ ...prev!, currentTurn: nextTurn }));

        if (nextTurn === 0) {
            setPhase('waiting-input');
        } else {
            setPhase('cpu-turn');
        }
    };

    // 4a. Draw from Deck (Initiate)
    useEffect(() => {
        let isCancelled = false;

        if (phase === 'draw-deck' && gameState && !pendingCard) {
            const draw = async () => {
                await sleep(500); // Animation delay
                if (isCancelled) return;

                const [drawnCard, ...remainingDeck] = gameState.deck;
                if (!drawnCard) {
                    setPhase('check-yaku'); // Or game over
                    return;
                }

                setGameState(prev => ({ ...prev!, deck: remainingDeck }));
                setTurnSource('deck');
                setPendingCard(drawnCard);
                addLog(`Drew [${drawnCard.name}] from deck`);
            };
            draw();
        }
        return () => { isCancelled = true; };
    }, [phase, gameState?.deck, pendingCard]);

    // 4b. Draw from Deck (Resolve)
    useEffect(() => {
        let isCancelled = false;

        if (phase === 'draw-deck' && gameState && pendingCard) {
            const resolve = async () => {
                await sleep(500); // Wait for user to see the card
                if (isCancelled) return;

                const matches = findMatches(pendingCard, gameState.field);

                if (matches.length === 2 && gameState.currentTurn === 0) {
                    // Player drew ambiguous match -> Select
                    setMatchOptions(matches);
                    setPhase('select-match');
                    addLog('Select a card to match.');
                } else {
                    // CPU or auto-resolve
                    let targetId: number | undefined;
                    if (matches.length === 2 && gameState.currentTurn === 1) {
                        targetId = matches[0].id;
                    }
                    await resolveMatch(pendingCard, matches, 'deck', targetId);
                }
            };
            resolve();
        }
        return () => { isCancelled = true; };
    }, [phase, pendingCard]);

    // 5. Check Yaku (Auto-triggered effect)
    useEffect(() => {
        let isCancelled = false;

        // Use isProcessing to prevent re-entry during state updates
        if (phase === 'check-yaku' && gameState && !isProcessing.current) {
            isProcessing.current = true;
            const check = async () => {
                if (isCancelled) { isProcessing.current = false; return; }

                const currentPlayerIdx = gameState.currentTurn;
                const player = gameState.players[currentPlayerIdx];
                const scoreResult = calculateYaku(player.captured);
                const currentScore = scoreResult.totalScore;
                const prevScore = prevScores.current[currentPlayerIdx];

                // Update score in state
                setGameState(prev => {
                    if (!prev) return null;
                    const newPlayers = [...prev.players] as [Player, Player];
                    newPlayers[currentPlayerIdx].score = currentScore;
                    return { ...prev, players: newPlayers };
                });

                if (currentScore > prevScore) {
                    // Yaku formed/improved!
                    const diff = currentScore - prevScore;
                    addLog(`${currentPlayerIdx === 0 ? 'Player' : 'CPU'} formed Yaku! (+${diff})`);

                    setLastYakuInfo({ name: '役成立', score: diff }); // Simplified name
                    setPhase('koi-koi-decision');
                } else {
                    // No new Yaku -> Next Turn
                    await endTurn();
                }
                isProcessing.current = false;
            };
            check();
        }
        return () => { isCancelled = true; isProcessing.current = false; };
    }, [phase]);

    // 7a. CPU Turn (Decide & Play)
    useEffect(() => {
        let isCancelled = false;

        if (phase === 'cpu-turn' && gameState && gameState.currentTurn === 1 && !pendingCard) {
            const executeCpuTurn = async () => {
                await sleep(1000); // Thinking time
                if (isCancelled) return;

                const cpuHand = gameState.players[1].hand;
                const field = gameState.field;

                // --- CPU AI Logic ---
                let bestCard = cpuHand[0];
                const matchableCards = cpuHand.filter(handCard =>
                    field.some(fieldCard => fieldCard.month === handCard.month)
                );

                if (matchableCards.length > 0) {
                    // Priority: Hikari > Tane > Tan > Kasu
                    const typeValue = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
                    matchableCards.sort((a, b) => typeValue[b.type] - typeValue[a.type]);
                    bestCard = matchableCards[0];
                } else {
                    // Discard: Kasu first
                    const kasuCards = cpuHand.filter(c => c.type === 'kasu');
                    if (kasuCards.length > 0) {
                        bestCard = kasuCards[0];
                    } else {
                        // Sort by value ascending (discard low value)
                        const typeValue = { hikari: 4, tane: 3, tan: 2, kasu: 1 };
                        const sortedHand = [...cpuHand].sort((a, b) => typeValue[a.type] - typeValue[b.type]);
                        bestCard = sortedHand[0];
                    }
                }

                // Execute Play
                setGameState(prev => {
                    if (!prev) return null;
                    const newPlayers = [...prev.players] as [Player, Player];
                    newPlayers[1].hand = newPlayers[1].hand.filter(c => c.id !== bestCard.id);
                    return { ...prev, players: newPlayers };
                });

                setTurnSource('hand');
                setPendingCard(bestCard);
                addLog(`CPU played [${bestCard.name}]`);
            };
            executeCpuTurn();
        }
        return () => { isCancelled = true; };
    }, [phase, pendingCard]);

    // 7b. CPU Turn (Resolve)
    useEffect(() => {
        let isCancelled = false;

        if (phase === 'cpu-turn' && gameState && pendingCard) {
            const resolve = async () => {
                await sleep(500);
                if (isCancelled) return;

                const matches = findMatches(pendingCard, gameState.field);

                // CPU 2-match selection logic
                let targetId: number | undefined;
                if (matches.length === 2) {
                    // Simple logic: pick first
                    targetId = matches[0].id;
                }

                await resolveMatch(pendingCard, matches, 'hand', targetId);
            };
            resolve();
        }
        return () => { isCancelled = true; };
    }, [phase, pendingCard]);

    // 8. Koi-Koi Decision Handling
    useEffect(() => {
        let isCancelled = false;

        if (phase === 'koi-koi-decision' && gameState?.currentTurn === 1 && !isProcessing.current) {
            isProcessing.current = true;
            // CPU Decision
            const cpuDecide = async () => {
                await sleep(1000);
                if (isCancelled) { isProcessing.current = false; return; }
                // Simple AI: Always Koi-Koi if score < 10, else Shobu?
                // Let's just Stop to show winning for now.
                handleShobu();
                isProcessing.current = false;
            };
            cpuDecide();
        }
        return () => { isCancelled = true; isProcessing.current = false; };
    }, [phase]);

    const handleKoiKoi = useCallback(() => {
        if (!gameState) return;
        const currentPlayerIdx = gameState.currentTurn;
        prevScores.current[currentPlayerIdx] = gameState.players[currentPlayerIdx].score;

        addLog('Koi-Koi! Game continues.');
        setLastYakuInfo(null);
        endTurn(); // Proceed to next turn
    }, [gameState]);

    const handleShobu = useCallback(() => {
        if (!gameState) return;
        addLog(`${gameState.currentTurn === 0 ? 'Player' : 'CPU'} chose Shobu!`);
        setGameState(prev => ({
            ...prev!,
            isRoundOver: true,
            winner: prev!.currentTurn,
        }));
        setPhase('game-over');
        setLastYakuInfo(null);
    }, [gameState]);

    return {
        gameState,
        phase,
        lastYakuInfo,
        logs,
        matchOptions, // Export for UI
        initGame,
        playCard,
        selectMatch, // Export for UI
        handleKoiKoi,
        handleShobu,
        pendingCard, // Export for UI visualization
    };
};
