import { calculateYaku } from './src/hanafuda-logic/utils';
import { ALL_CARDS } from './src/hanafuda-logic/constants';
import { Card } from './src/hanafuda-logic/types';

function runTests() {
    console.log('--- Scoring Logic Verification ---');

    // Helper to find cards
    const findCard = (month: number, type: string, namePart?: string) => {
        const card = ALL_CARDS.find(c =>
            c.month === month &&
            c.type === type &&
            (!namePart || c.name.includes(namePart))
        );
        if (!card) throw new Error(`Card not found: ${month}月 ${type} ${namePart || ''}`);
        return card;
    };

    // Case A: Gokou (5 Brights)
    console.log('\nCase A: Gokou (5 Brights)');
    const gokouCards = [
        findCard(1, 'hikari'),  // Pine with Crane
        findCard(3, 'hikari'),  // Cherry with Curtain
        findCard(8, 'hikari'),  // Moon
        findCard(11, 'hikari'), // Rainman
        findCard(12, 'hikari'), // Phoenix
    ];
    const resultA = calculateYaku(gokouCards);
    const gokouYaku = resultA.yaku.find(y => y.name === '五光');
    console.log(`Expected: 10 pts (五光), Actual: ${gokouYaku ? gokouYaku.score : 0} pts (${resultA.totalScore})`);
    if (gokouYaku && gokouYaku.score === 10) console.log('✅ PASS');
    else console.log('❌ FAIL');

    // Case B: Ino-Shika-Cho
    console.log('\nCase B: Ino-Shika-Cho');
    const inoShikaChoCards = [
        findCard(7, 'tane'),  // Boar (Hagi)
        findCard(10, 'tane'), // Deer (Momiji)
        findCard(6, 'tane'),  // Butterfly (Botan)
    ];
    const resultB = calculateYaku(inoShikaChoCards);
    const iscYaku = resultB.yaku.find(y => y.name === '猪鹿蝶');
    console.log(`Expected: 5 pts (猪鹿蝶), Actual: ${iscYaku ? iscYaku.score : 0} pts (${resultB.totalScore})`);
    if (iscYaku && iscYaku.score === 5) console.log('✅ PASS');
    else console.log('❌ FAIL');

    // Case C: Kasu (10 cards -> 1 pt, 11 cards -> 2 pts)
    console.log('\nCase C: Kasu');
    const kasuCards = ALL_CARDS.filter(c => c.type === 'kasu').slice(0, 10);
    const resultC1 = calculateYaku(kasuCards);
    const kasuYaku1 = resultC1.yaku.find(y => y.name === 'カス');
    console.log(`[10 Cards] Expected: 1 pt, Actual: ${kasuYaku1 ? kasuYaku1.score : 0} pts`);

    const kasuCards11 = ALL_CARDS.filter(c => c.type === 'kasu').slice(0, 11);
    const resultC2 = calculateYaku(kasuCards11);
    const kasuYaku2 = resultC2.yaku.find(y => y.name === 'カス');
    console.log(`[11 Cards] Expected: 2 pts, Actual: ${kasuYaku2 ? kasuYaku2.score : 0} pts`);

    if (kasuYaku1?.score === 1 && kasuYaku2?.score === 2) console.log('✅ PASS');
    else console.log('❌ FAIL');

    // Case D: Sake Cup + 9 Kasu
    console.log('\nCase D: Sake Cup + 9 Kasu');
    const sakeCup = findCard(9, 'tane'); // Chrysanthemum with Cup
    const kasu9 = ALL_CARDS.filter(c => c.type === 'kasu').slice(0, 9);
    const resultD = calculateYaku([sakeCup, ...kasu9]);
    // Note: Sake Cup is technically a Tane, but in some rules it counts as Kasu as well.
    // If our logic supports this, it should form a Kasu yaku (10 cards equivalent).
    const kasuYakuD = resultD.yaku.find(y => y.name === 'カス');
    console.log(`Expected: 1 pt (as Kasu 10), Actual: ${kasuYakuD ? kasuYakuD.score : 0} pts`);

    if (kasuYakuD && kasuYakuD.score >= 1) console.log('✅ PASS');
    else console.log('❌ FAIL (Sake Cup might not be counted as Kasu)');

}

runTests();
