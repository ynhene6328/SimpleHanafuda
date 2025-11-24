import type { Card } from './types';

export interface YakuResult {
    name: string;
    score: number;
}

export interface ScoreResult {
    yaku: YakuResult[];
    totalScore: number;
}

// Special Card IDs
const ID_SAKE_CUP = 32; // 菊に盃
const ID_RAIN_MAN = 40; // 柳に小野道風
const ID_BOAR = 24;     // 萩に猪
const ID_DEER = 36;     // 紅葉に鹿
const ID_BUTTERFLY = 20; // 牡丹に蝶

// Ribbon IDs
const IDS_AKATAN = [1, 5, 9];   // 松、梅、桜の赤短
const IDS_AOTAN = [21, 33, 37]; // 牡丹、菊、紅葉の青短

export function calculateYaku(hand: Card[]): ScoreResult {
    const yakuList: YakuResult[] = [];

    // 1. Categorize cards
    const hikariCards = hand.filter(c => c.type === 'hikari');
    const taneCards = hand.filter(c => c.type === 'tane');
    const tanCards = hand.filter(c => c.type === 'tan');

    // Kasu calculation (Sake Cup counts as Kasu too)
    const kasuCards = hand.filter(c => c.type === 'kasu');
    const hasSakeCup = hand.some(c => c.id === ID_SAKE_CUP);
    const kasuCount = kasuCards.length + (hasSakeCup ? 1 : 0);

    // 2. Hikari Yaku
    const hikariCount = hikariCards.length;
    const hasRainMan = hikariCards.some(c => c.id === ID_RAIN_MAN);

    if (hikariCount === 5) {
        yakuList.push({ name: '五光', score: 10 });
    } else if (hikariCount === 4) {
        if (hasRainMan) {
            yakuList.push({ name: '雨四光', score: 7 });
        } else {
            yakuList.push({ name: '四光', score: 8 });
        }
    } else if (hikariCount === 3 && !hasRainMan) {
        yakuList.push({ name: '三光', score: 5 });
    }

    // 3. Tane Yaku
    // Inoshikacho
    const hasBoar = taneCards.some(c => c.id === ID_BOAR);
    const hasDeer = taneCards.some(c => c.id === ID_DEER);
    const hasButterfly = taneCards.some(c => c.id === ID_BUTTERFLY);

    if (hasBoar && hasDeer && hasButterfly) {
        yakuList.push({ name: '猪鹿蝶', score: 5 });
    }

    // Tane (Count)
    if (taneCards.length >= 5) {
        const extra = taneCards.length - 5;
        yakuList.push({ name: 'タネ', score: 1 + extra });
    }

    // 4. Tan Yaku
    // Akatan
    const akatanCount = tanCards.filter(c => IDS_AKATAN.includes(c.id)).length;
    if (akatanCount === 3) {
        yakuList.push({ name: '赤短', score: 5 });
    }

    // Aotan
    const aotanCount = tanCards.filter(c => IDS_AOTAN.includes(c.id)).length;
    if (aotanCount === 3) {
        yakuList.push({ name: '青短', score: 5 });
    }

    // Tan (Count)
    if (tanCards.length >= 5) {
        const extra = tanCards.length - 5;
        yakuList.push({ name: 'タン', score: 1 + extra });
    }

    // 5. Kasu Yaku
    if (kasuCount >= 10) {
        const extra = kasuCount - 10;
        yakuList.push({ name: 'カス', score: 1 + extra });
    }

    // 6. Special Yaku (Hanami-zake, Tsukimi-zake)
    // Note: These are optional rules but often included. The user prompt mentioned "standard rules" and the rulebook includes them.
    // Rulebook:
    // 月見酒: Moon (28) + Sake Cup (32)
    // 花見酒: Curtain (8) + Sake Cup (32)
    if (hasSakeCup) {
        const hasMoon = hikariCards.some(c => c.id === 28); // 芒に月
        const hasCurtain = hikariCards.some(c => c.id === 8); // 桜に幕

        if (hasMoon) {
            yakuList.push({ name: '月見酒', score: 5 });
        }
        if (hasCurtain) {
            yakuList.push({ name: '花見酒', score: 5 });
        }
    }

    const totalScore = yakuList.reduce((sum, yaku) => sum + yaku.score, 0);

    return { yaku: yakuList, totalScore };
}
