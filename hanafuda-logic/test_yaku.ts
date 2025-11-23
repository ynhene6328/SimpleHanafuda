import { ALL_CARDS } from './constants';
import { calculateYaku } from './utils';
import { Card } from './types';

function testYaku(name: string, handIds: number[]) {
    const hand = handIds.map(id => ALL_CARDS.find(c => c.id === id) as Card);
    const result = calculateYaku(hand);

    console.log(`--- Test: ${name} ---`);
    console.log(`Hand IDs: ${handIds.join(', ')}`);
    if (result.yaku.length === 0) {
        console.log('Yaku: None');
    } else {
        result.yaku.forEach(y => console.log(`- ${y.name}: ${y.score}`));
    }
    console.log(`Total Score: ${result.totalScore}`);
    console.log('');
}

// 1. Gokou (Five Lights)
// IDs: 0 (Crane), 8 (Curtain), 28 (Moon), 40 (Rain), 44 (Phoenix)
testYaku('Gokou (Five Lights)', [0, 8, 28, 40, 44]);

// 2. Inoshikacho (Boar, Deer, Butterfly)
// IDs: 20 (Butterfly), 24 (Boar), 36 (Deer)
testYaku('Inoshikacho', [20, 24, 36]);

// 3. Akatan (Red Ribbons)
// IDs: 1 (Pine), 5 (Plum), 9 (Cherry)
testYaku('Akatan', [1, 5, 9]);

// 4. Kasu x10
// IDs: 2, 3, 6, 7, 10, 11, 14, 15, 18, 19
testYaku('Kasu x10', [2, 3, 6, 7, 10, 11, 14, 15, 18, 19]);

// 5. Sake Cup Special (9 Kasu + Sake Cup = 10 Kasu)
// IDs: 2, 3, 6, 7, 10, 11, 14, 15, 18 (9 Kasu) + 32 (Sake Cup)
testYaku('Sake Cup as Kasu (9 Kasu + Sake Cup)', [2, 3, 6, 7, 10, 11, 14, 15, 18, 32]);

// 6. Tsukimi-zake (Moon + Sake Cup)
// IDs: 28 (Moon), 32 (Sake Cup)
testYaku('Tsukimi-zake', [28, 32]);

// 7. Hanami-zake (Curtain + Sake Cup)
// IDs: 8 (Curtain), 32 (Sake Cup)
testYaku('Hanami-zake', [8, 32]);

// 8. Combined: Inoshikacho + Tane (6 cards)
// IDs: 20, 24, 36 (Ino-Shika-Cho) + 4 (Uguisu), 12 (Cuckoo), 16 (Yatsuhashi)
testYaku('Inoshikacho + Tane x6', [20, 24, 36, 4, 12, 16]);
