// ScoringEngine.test.js - Unit tests for ScoringEngine

import { ScoringEngine } from '../modules/game/rules/ScoringEngine.js';
import { createTestPlayer, createCard, createFlip7Cards, scoringScenarios, createMockEventBus } from './utils/TestUtils.js';

describe('ScoringEngine', () => {
    let scoringEngine;
    let mockEventBus;

    beforeEach(() => {
        mockEventBus = createMockEventBus();
        scoringEngine = new ScoringEngine();
        
        // Replace the real eventBus with our mock
        scoringEngine.eventBus = mockEventBus;
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

        test('should handle high value cards', () => {
            const cards = [
                createCard.number(12),
                createCard.number(11),
                createCard.number(10)
            ];
            expect(scoringEngine.sumNumberCards(cards)).toBe(33);
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

        test('should apply multiple bonus points', () => {
            const modifiers = [
                createCard.modifier(2),
                createCard.modifier(4),
                createCard.modifier(3)
            ];
            const result = scoringEngine.applyModifiers(10, modifiers);
            expect(result).toBe(19); // 10 + 2 + 4 + 3
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
                createCard.modifier('x2'), // Second x2 should not double again
                createCard.modifier(5)
            ];
            const result = scoringEngine.applyModifiers(6, modifiers);
            expect(result).toBe(20); // (6 * 2) + 3 + 5
        });

        test('should handle zero base score with modifiers', () => {
            const modifiers = [
                createCard.modifier('x2'),
                createCard.modifier(5)
            ];
            const result = scoringEngine.applyModifiers(0, modifiers);
            expect(result).toBe(5); // (0 * 2) + 5
        });
    });

    describe('calculateRoundScore', () => {
        test('should return 0 for busted player', () => {
            const player = createTestPlayer();
            player.status = 'busted';
            player.addCard(createCard.number(10));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(0);
        });

        test('should calculate simple number card score', () => {
            const player = createTestPlayer();
            player.addCard(createCard.number(3));
            player.addCard(createCard.number(7));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(10);
        });

        test('should apply modifiers correctly', () => {
            const player = createTestPlayer();
            player.addCard(createCard.number(5));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(3));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(13); // (5 * 2) + 3
        });

        test('should add Flip 7 bonus', () => {
            const player = createTestPlayer();
            createFlip7Cards().forEach(card => player.addCard(card));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(36); // (0+1+2+3+4+5+6) + 15
        });

        test('should handle Flip 7 with modifiers', () => {
            const player = createTestPlayer();
            createFlip7Cards().forEach(card => player.addCard(card));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(4));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(result).toBe(61); // ((0+1+2+3+4+5+6) * 2) + 4 + 15 = 42 + 4 + 15
        });

        test('should not add Flip 7 bonus without exactly 7 unique', () => {
            const player = createTestPlayer();
            [1, 2, 3, 4, 5, 6].forEach(v => player.addCard(createCard.number(v)));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(21); // No Flip 7 bonus
        });
    });

    describe('calculateCurrentScore', () => {
        test('should return same as calculateRoundScore', () => {
            const player = createTestPlayer();
            player.addCard(createCard.number(8));
            player.addCard(createCard.modifier(2));
            
            const roundScore = scoringEngine.calculateRoundScore(player);
            const currentScore = scoringEngine.calculateCurrentScore(player);
            
            expect(currentScore).toBe(roundScore);
            expect(currentScore).toBe(10);
        });
    });

    describe('checkForWinner', () => {
        test('should return null if no winner', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 150 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 180 }),
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner).toBeNull();
        });

        test('should return winner when score reached', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 150 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 210 }),
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner.id).toBe('p2');
            expect(winner.totalScore).toBe(210);
        });

        test('should return highest scorer in case of ties above threshold', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 250 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 220 }),
                Object.assign(createTestPlayer('p3'), { totalScore: 230 }),
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner.id).toBe('p1');
            expect(winner.totalScore).toBe(250);
        });

        test('should handle multiple players with same high score', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 220 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 220 }),
            ];
            
            const winner = scoringEngine.checkForWinner(players, 200);
            expect(winner.totalScore).toBe(220);
            // Should return first winner in case of exact tie
        });

        test('should use default winning score if not provided', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 210 })
            ];
            
            const winner = scoringEngine.checkForWinner(players);
            expect(winner).not.toBeNull();
            expect(winner.totalScore).toBe(210);
        });
    });

    describe('getLeader', () => {
        test('should return null for empty array', () => {
            const leader = scoringEngine.getLeader([]);
            expect(leader).toBeNull();
        });

        test('should return player with highest score', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 100 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 150 }),
                Object.assign(createTestPlayer('p3'), { totalScore: 120 }),
            ];
            
            const leader = scoringEngine.getLeader(players);
            expect(leader.id).toBe('p2');
            expect(leader.totalScore).toBe(150);
        });

        test('should return first player in case of tie', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 150 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 150 }),
            ];
            
            const leader = scoringEngine.getLeader(players);
            expect(leader.id).toBe('p1');
        });
    });

    describe('getPlayerRankings', () => {
        test('should sort players by score descending', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 100 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 200 }),
                Object.assign(createTestPlayer('p3'), { totalScore: 150 }),
            ];
            
            const rankings = scoringEngine.getPlayerRankings(players);
            
            expect(rankings[0].totalScore).toBe(200);
            expect(rankings[1].totalScore).toBe(150);
            expect(rankings[2].totalScore).toBe(100);
        });

        test('should not modify original array', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 100 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 200 }),
            ];
            const originalOrder = [...players];
            
            scoringEngine.getPlayerRankings(players);
            
            expect(players).toEqual(originalOrder);
        });
    });

    describe('getPointsToWin', () => {
        test('should calculate points needed', () => {
            const player = Object.assign(createTestPlayer(), { totalScore: 150 });
            
            const points = scoringEngine.getPointsToWin(player, 200);
            expect(points).toBe(50);
        });

        test('should return 0 if already won', () => {
            const player = Object.assign(createTestPlayer(), { totalScore: 250 });
            
            const points = scoringEngine.getPointsToWin(player, 200);
            expect(points).toBe(0);
        });

        test('should use default winning score', () => {
            const player = Object.assign(createTestPlayer(), { totalScore: 180 });
            
            const points = scoringEngine.getPointsToWin(player);
            expect(points).toBe(20); // 200 - 180
        });
    });

    describe('getScoreBreakdown', () => {
        test('should provide detailed score breakdown', () => {
            const player = createTestPlayer();
            player.addCard(createCard.number(3));
            player.addCard(createCard.number(7));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(4));
            
            const breakdown = scoringEngine.getScoreBreakdown(player);
            
            expect(breakdown.numberCards).toBe(10);
            expect(breakdown.hasX2).toBe(true);
            expect(breakdown.bonusPoints).toBe(4);
            expect(breakdown.flip7Bonus).toBe(0);
            expect(breakdown.total).toBe(24); // (10 * 2) + 4
        });

        test('should include Flip 7 bonus in breakdown', () => {
            const player = createTestPlayer();
            createFlip7Cards().forEach(card => player.addCard(card));
            
            const breakdown = scoringEngine.getScoreBreakdown(player);
            
            expect(breakdown.numberCards).toBe(21); // 0+1+2+3+4+5+6
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

    describe('Event Emissions', () => {
        test('should emit score update event', () => {
            const player = createTestPlayer('test-player');
            player.roundScore = 25;
            player.totalScore = 100;
            player.uniqueNumbers.add(1);
            player.uniqueNumbers.add(2);
            
            scoringEngine.emitScoreUpdate(player);
            
            const emissions = mockEventBus.getEmissions();
            expect(emissions.length).toBe(1);
            expect(emissions[0].event).toBe('score:updated');
            expect(emissions[0].data.playerId).toBe('test-player');
            expect(emissions[0].data.roundScore).toBe(25);
            expect(emissions[0].data.totalScore).toBe(100);
            expect(emissions[0].data.hasFlip7).toBe(false);
        });

        test('should emit round score calculated event', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { roundScore: 15 }),
                Object.assign(createTestPlayer('p2'), { roundScore: 22 })
            ];
            
            scoringEngine.calculateAllRoundScores(players);
            
            const emissions = mockEventBus.getEmissions();
            const roundCalcEvent = emissions.find(e => e.event === 'score:roundCalculated');
            
            expect(roundCalcEvent).toBeDefined();
            expect(roundCalcEvent.data.players).toHaveLength(2);
        });
    });

    describe('Edge Cases', () => {
        test('should handle player with no cards', () => {
            const player = createTestPlayer();
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(0);
        });

        test('should handle extremely high scores', () => {
            const player = createTestPlayer();
            // Add maximum possible cards
            [12, 11, 10, 9, 8].forEach(v => player.addCard(createCard.number(v)));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(5));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(105); // (12+11+10+9+8) * 2 + 5 = 100 + 5
        });

        test('should handle negative modifiers gracefully', () => {
            const player = createTestPlayer();
            player.addCard(createCard.number(10));
            
            // Create a negative modifier (edge case)
            const negativeModifier = createCard.modifier(-5);
            player.addCard(negativeModifier);
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(5); // 10 + (-5)
        });

        test('should handle winner determination with zero scores', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { totalScore: 0 }),
                Object.assign(createTestPlayer('p2'), { totalScore: 0 })
            ];
            
            const winner = scoringEngine.checkForWinner(players, 0);
            expect(winner).not.toBeNull();
        });

        test('should handle Flip 7 with modifier edge cases', () => {
            const player = createTestPlayer();
            createFlip7Cards().forEach(card => player.addCard(card));
            
            // Multiple x2 modifiers should only apply once
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier('x2'));
            
            const score = scoringEngine.calculateRoundScore(player);
            expect(score).toBe(57); // (21 * 2) + 15 = 42 + 15
        });
    });
});