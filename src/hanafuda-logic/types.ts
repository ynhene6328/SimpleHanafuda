export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type CardType = 'hikari' | 'tane' | 'tan' | 'kasu';

export interface Card {
    id: number; // Unique ID 0-47
    month: Month;
    type: CardType;
    name?: string; // Optional name for debugging/display
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
