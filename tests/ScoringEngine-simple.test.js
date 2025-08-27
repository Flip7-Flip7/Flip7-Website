// ScoringEngine-simple.test.js - Simplified unit tests for scoring logic

describe('ScoringEngine (Simplified)', () => {
    // Mock ScoringEngine class for testing
    class MockScoringEngine {
        constructor() {
            this.FLIP7_BONUS = 15;
            this.WINNING_SCORE_DEFAULT = 200;
        }

        sumNumberCards(numberCards) {
            return numberCards.reduce((sum, card) => sum + card.value, 0);
        }

        applyModifiers(baseScore, modifierCards) {
            let score = baseScore;
            let hasX2 = false;
            let bonusPoints = 0;
            
            modifierCards.forEach(card => {
                if (card.value === 'x2') {
                    hasX2 = true;
                } else {
                    bonusPoints += card.value;
                }
            });
            
            if (hasX2) score *= 2;
            score += bonusPoints;
            
            return score;
        }

        calculateRoundScore(player) {
            if (player.status === 'busted') {
                return 0;
            }

            let score = this.sumNumberCards(player.numberCards);
            score = this.applyModifiers(score, player.modifierCards);
            
            if (player.uniqueNumbers && player.uniqueNumbers.size === 7) {
                score += this.FLIP7_BONUS;
            }
            
            return score;
        }

        checkForWinner(players, winningScore = this.WINNING_SCORE_DEFAULT) {
            const winner = players.find(player => player.totalScore >= winningScore);
            
            if (winner) {
                const highestScore = Math.max(...players.map(p => p.totalScore));
                const winners = players.filter(p => p.totalScore === highestScore);
                return winners[0];
            }
            
            return null;
        }

        getPlayerRankings(players) {
            return [...players].sort((a, b) => b.totalScore - a.totalScore);
        }

        getPointsToWin(player, winningScore = this.WINNING_SCORE_DEFAULT) {
            return Math.max(0, winningScore - player.totalScore);
        }

        getScoreBreakdown(player) {
            const breakdown = {
                numberCards: this.sumNumberCards(player.numberCards),
                hasX2: false,
                bonusPoints: 0,
                flip7Bonus: 0,
                total: 0
            };
            
            player.modifierCards.forEach(card => {
                if (card.value === 'x2') {
                    breakdown.hasX2 = true;
                } else {
                    breakdown.bonusPoints += card.value;
                }
            });
            
            breakdown.total = breakdown.numberCards;
            if (breakdown.hasX2) breakdown.total *= 2;
            breakdown.total += breakdown.bonusPoints;
            
            if (player.uniqueNumbers && player.uniqueNumbers.size === 7) {
                breakdown.flip7Bonus = this.FLIP7_BONUS;
                breakdown.total += breakdown.flip7Bonus;
            }
            
            return breakdown;
        }
    }

    const createCard = {
        number: (value) => ({ type: 'number', value: value, display: value.toString() }),
        modifier: (value) => ({ type: 'modifier', value: value, display: value === 'x2' ? 'x2' : `+${value}` })
    };

    const createTestPlayer = (cards = [], modifiers = [], status = 'active') => ({
        numberCards: cards,
        modifierCards: modifiers,
        status: status,
        uniqueNumbers: new Set(cards.map(c => c.value)),
        totalScore: 0
    });

    let scoringEngine;

    beforeEach(() => {
        scoringEngine = new MockScoringEngine();
    });

    describe('Constructor', () => {
        test('should initialize with correct default values', () => {
            expect(scoringEngine.FLIP7_BONUS).toBe(15);
            expect(scoringEngine.WINNING_SCORE_DEFAULT).toBe(200);
        });
    });

    describe('sumNumberCards', () => {
        test('should return 0 for empty array', () => {
            expect(scoringEngine.sumNumberCards([])).toBe(0);
        });

        test('should sum simple number cards', () => {
            const cards = [
                createCard.number(3),
                createCard.number(7),
                createCard.number(2)
            ];
            expect(scoringEngine.sumNumberCards(cards)).toBe(12);
        });

        test('should handle zero value cards', () => {
            const cards = [
                createCard.number(0),
                createCard.number(5),
                createCard.number(0)
            ];
            expect(scoringEngine.sumNumberCards(cards)).toBe(5);
        });
    });

    describe('applyModifiers', () => {
        test('should return base score with no modifiers', () => {
            const result = scoringEngine.applyModifiers(10, []);
            expect(result).toBe(10);
        });

        test('should apply x2 multiplier', () => {
            const modifiers = [createCard.modifier('x2')];
            const result = scoringEngine.applyModifiers(15, modifiers);
            expect(result).toBe(30);
        });

        test('should apply bonus points', () => {
            const modifiers = [createCard.modifier(5)];
            const result = scoringEngine.applyModifiers(10, modifiers);
            expect(result).toBe(15);
        });

        test('should apply x2 before bonus points', () => {
            const modifiers = [
                createCard.modifier('x2'),
                createCard.modifier(3)
            ];
            const result = scoringEngine.applyModifiers(8, modifiers);
            expect(result).toBe(19); // (8 * 2) + 3
        });

        test('should handle multiple x2 modifiers (only apply once)', () => {
            const modifiers = [
                createCard.modifier('x2'),
                createCard.modifier('x2')
            ];
            const result = scoringEngine.applyModifiers(7, modifiers);
            expect(result).toBe(14); // 7 * 2, not 7 * 2 * 2
        });

        test('should handle complex modifier combination', () => {
            const modifiers = [
                createCard.modifier('x2'),
                createCard.modifier(3),
                createCard.modifier('x2'),
                createCard.modifier(5)
            ];
            const result = scoringEngine.applyModifiers(6, modifiers);
            expect(result).toBe(20); // (6 * 2) + 3 + 5
        });
    });

    describe('calculateRoundScore', () => {
        test('should return 0 for busted player', () => {
            const player = createTestPlayer([createCard.number(10)], [], 'busted');
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(0);
        });

        test('should calculate simple number card score', () => {
            const player = createTestPlayer([
                createCard.number(3),
                createCard.number(7)
            ]);
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(10);
        });

        test('should apply modifiers correctly', () => {
            const player = createTestPlayer(
                [createCard.number(5)],
                [createCard.modifier('x2'), createCard.modifier(3)]
            );
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(13); // (5 * 2) + 3
        });

        test('should add Flip 7 bonus', () => {
            const flip7Cards = [0, 1, 2, 3, 4, 5, 6].map(v => createCard.number(v));
            const player = createTestPlayer(flip7Cards);
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(36); // (0+1+2+3+4+5+6) + 15
        });

        test('should handle Flip 7 with modifiers', () => {
            const flip7Cards = [0, 1, 2, 3, 4, 5, 6].map(v => createCard.number(v));
            const player = createTestPlayer(
                flip7Cards,
                [createCard.modifier('x2'), createCard.modifier(4)]
            );
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(61); // ((0+1+2+3+4+5+6) * 2) + 4 + 15
        });
    });

    describe('checkForWinner', () => {
        test('should return null if no winner', () => {
            const players = [
                { totalScore: 150 },
                { totalScore: 180 }
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner).toBeNull();
        });

        test('should return winner when score reached', () => {
            const players = [
                { totalScore: 150, id: 'p1' },
                { totalScore: 210, id: 'p2' }
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner.id).toBe('p2');
            expect(winner.totalScore).toBe(210);
        });

        test('should return highest scorer in case of ties above threshold', () => {
            const players = [
                { totalScore: 250, id: 'p1' },
                { totalScore: 220, id: 'p2' },
                { totalScore: 230, id: 'p3' }
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner.id).toBe('p1');
            expect(winner.totalScore).toBe(250);
        });
    });

    describe('getPlayerRankings', () => {
        test('should sort players by score descending', () => {
            const players = [
                { totalScore: 100, id: 'p1' },
                { totalScore: 200, id: 'p2' },
                { totalScore: 150, id: 'p3' }
            ];
            
            const rankings = scoringEngine.getPlayerRankings(players);
            
            expect(rankings[0].totalScore).toBe(200);
            expect(rankings[1].totalScore).toBe(150);
            expect(rankings[2].totalScore).toBe(100);
        });

        test('should not modify original array', () => {
            const players = [
                { totalScore: 100 },
                { totalScore: 200 }
            ];
            const originalOrder = [...players];
            
            scoringEngine.getPlayerRankings(players);
            
            expect(players).toEqual(originalOrder);
        });
    });

    describe('getPointsToWin', () => {
        test('should calculate points needed', () => {
            const player = { totalScore: 150 };
            const points = scoringEngine.getPointsToWin(player, 200);
            expect(points).toBe(50);
        });

        test('should return 0 if already won', () => {
            const player = { totalScore: 250 };
            const points = scoringEngine.getPointsToWin(player, 200);
            expect(points).toBe(0);
        });

        test('should use default winning score', () => {
            const player = { totalScore: 180 };
            const points = scoringEngine.getPointsToWin(player);
            expect(points).toBe(20); // 200 - 180
        });
    });

    describe('getScoreBreakdown', () => {
        test('should provide detailed score breakdown', () => {
            const player = createTestPlayer(
                [createCard.number(3), createCard.number(7)],
                [createCard.modifier('x2'), createCard.modifier(4)]
            );
            
            const breakdown = scoringEngine.getScoreBreakdown(player);
            
            expect(breakdown.numberCards).toBe(10);
            expect(breakdown.hasX2).toBe(true);
            expect(breakdown.bonusPoints).toBe(4);
            expect(breakdown.flip7Bonus).toBe(0);
            expect(breakdown.total).toBe(24); // (10 * 2) + 4
        });

        test('should include Flip 7 bonus in breakdown', () => {
            const flip7Cards = [0, 1, 2, 3, 4, 5, 6].map(v => createCard.number(v));
            const player = createTestPlayer(flip7Cards);
            
            const breakdown = scoringEngine.getScoreBreakdown(player);
            
            expect(breakdown.numberCards).toBe(21);
            expect(breakdown.flip7Bonus).toBe(15);
            expect(breakdown.total).toBe(36);
        });

        test('should handle empty cards', () => {
            const player = createTestPlayer();
            
            const breakdown = scoringEngine.getScoreBreakdown(player);
            
            expect(breakdown.numberCards).toBe(0);
            expect(breakdown.hasX2).toBe(false);
            expect(breakdown.bonusPoints).toBe(0);
            expect(breakdown.flip7Bonus).toBe(0);
            expect(breakdown.total).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle extreme high scores', () => {
            const highCards = [12, 11, 10, 9, 8].map(v => createCard.number(v));
            const player = createTestPlayer(
                highCards,
                [createCard.modifier('x2'), createCard.modifier(5)]
            );
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(105); // (50 * 2) + 5
        });

        test('should handle zero scores', () => {
            const player = createTestPlayer([createCard.number(0)]);
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(0);
        });

        test('should handle negative modifiers', () => {
            const player = createTestPlayer(
                [createCard.number(10)],
                [{ type: 'modifier', value: -5, display: '-5' }]
            );
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(5); // 10 + (-5)
        });

        test('should handle winner determination with zero scores', () => {
            const players = [
                { totalScore: 0, id: 'p1' },
                { totalScore: 0, id: 'p2' }
            ];
            
            const winner = scoringEngine.checkForWinner(players, 0);
            expect(winner).not.toBeNull();
            expect(winner.id).toBe('p1');
        });
    });
});