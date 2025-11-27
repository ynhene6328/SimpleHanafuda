export type CardType = 'hikari' | 'tane' | 'tan' | 'kasu';

export interface Card {
    id: number;
    month: number; // 1-12
    type: CardType;
    name: string;
    image?: string; // Path to image asset
}

export interface Player {
    id: string;
    hand: Card[];
    captured: Card[]; // Cards captured by the player (field + played/drawn)
    score: number;
    isHuman: boolean;
}

export interface GameState {
    deck: Card[];
    field: Card[];
    players: [Player, Player]; // Player 0 (usually human/first), Player 1
    currentTurn: number; // 0 or 1
    currentMonth: number; // 1 to totalRounds
    totalRounds: number; // 6 or 12
    isRoundOver: boolean;
    winner: number | null; // 0 or 1, or null
}

export type GamePhase =
    | 'idle'
    | 'waiting-input'   // Player's turn: waiting to select a card from hand
    | 'select-match'    // Player's turn: waiting to select which card to match (if 2 matches)
    | 'resolve-hand'    // Processing hand card match/discard
    | 'draw-deck'       // Drawing from deck animation
    | 'resolve-deck'    // Processing deck card match/discard
    | 'check-yaku'      // Checking for Yaku
    | 'koi-koi-decision'// Waiting for Koi-Koi decision
    | 'cpu-turn'        // CPU is thinking/acting
    | 'game-over';
