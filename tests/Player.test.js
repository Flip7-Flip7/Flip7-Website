// Player.test.js - Unit tests for Player class

import { Player } from '../modules/game/core/Player.js';
import { createCard, createFlip7Cards, assertPlayerCards, scoringScenarios } from './utils/TestUtils.js';

describe('Player Class', () => {
    let player;

    beforeEach(() => {
        player = new Player('test-player', 'Test Player', false);
    });

    describe('Constructor', () => {
        test('should initialize player with correct default values', () => {
            expect(player.id).toBe('test-player');
            expect(player.name).toBe('Test Player');
            expect(player.isHuman).toBe(false);
            expect(player.totalScore).toBe(0);
            expect(player.roundScore).toBe(0);
            expect(player.status).toBe('waiting');
            expect(player.hasSecondChance).toBe(false);
            expect(player.isFrozen).toBe(false);
            expect(player.numberCards).toEqual([]);
            expect(player.modifierCards).toEqual([]);
            expect(player.actionCards).toEqual([]);
            expect(player.uniqueNumbers.size).toBe(0);
        });

        test('should initialize human player correctly', () => {
            const humanPlayer = new Player('human', 'Human Player', true);
            expect(humanPlayer.isHuman).toBe(true);
        });
    });

    describe('addCard', () => {
        test('should add number card and update unique numbers', () => {
            const card = createCard.number(5);
            player.addCard(card);

            expect(player.numberCards).toContain(card);
            expect(player.uniqueNumbers.has(5)).toBe(true);
            expect(player.uniqueNumbers.size).toBe(1);
        });

        test('should sort number cards after adding', () => {
            player.addCard(createCard.number(7));
            player.addCard(createCard.number(3));
            player.addCard(createCard.number(9));

            const values = player.numberCards.map(card => card.value);
            expect(values).toEqual([3, 7, 9]);
        });

        test('should add modifier card', () => {
            const card = createCard.modifier('x2');
            player.addCard(card);

            expect(player.modifierCards).toContain(card);
            expect(player.numberCards.length).toBe(0);
        });

        test('should add action card and set second chance flag', () => {
            const card = createCard.action('second_chance');
            player.addCard(card);

            expect(player.actionCards).toContain(card);
            expect(player.hasSecondChance).toBe(true);
        });

        test('should not add duplicate second chance card', () => {
            const card1 = createCard.action('second_chance');
            const card2 = createCard.action('second_chance');
            
            player.addCard(card1);
            player.addCard(card2);

            expect(player.actionCards.length).toBe(1);
            expect(player.hasSecondChance).toBe(true);
        });

        test('should add non-second-chance action cards normally', () => {
            const freezeCard = createCard.action('freeze');
            const flip3Card = createCard.action('flip3');
            
            player.addCard(freezeCard);
            player.addCard(flip3Card);

            expect(player.actionCards).toContain(freezeCard);
            expect(player.actionCards).toContain(flip3Card);
            expect(player.hasSecondChance).toBe(false);
        });
    });

    describe('hasDuplicate', () => {
        test('should return false for new number', () => {
            player.addCard(createCard.number(5));
            expect(player.hasDuplicate(3)).toBe(false);
        });

        test('should return true for existing number', () => {
            player.addCard(createCard.number(5));
            expect(player.hasDuplicate(5)).toBe(true);
        });

        test('should work with multiple numbers', () => {
            player.addCard(createCard.number(2));
            player.addCard(createCard.number(7));
            player.addCard(createCard.number(9));

            expect(player.hasDuplicate(2)).toBe(true);
            expect(player.hasDuplicate(7)).toBe(true);
            expect(player.hasDuplicate(9)).toBe(true);
            expect(player.hasDuplicate(5)).toBe(false);
        });
    });

    describe('hasFlip7', () => {
        test('should return false with less than 7 unique numbers', () => {
            [1, 3, 5, 8, 10].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(false);
        });

        test('should return true with exactly 7 unique numbers', () => {
            createFlip7Cards().forEach(card => player.addCard(card));
            expect(player.hasFlip7()).toBe(true);
        });

        test('should return false with more than 7 unique numbers (edge case)', () => {
            [0, 1, 2, 3, 4, 5, 6, 7].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(false);
            expect(player.uniqueNumbers.size).toBe(8);
        });

        test('should work with different number combinations', () => {
            // Test different 7-number combinations
            [5, 6, 7, 8, 9, 10, 11].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(true);
        });
    });

    describe('getCardCount', () => {
        test('should return 0 for new player', () => {
            expect(player.getCardCount()).toBe(0);
        });

        test('should count all card types', () => {
            player.addCard(createCard.number(5));
            player.addCard(createCard.number(8));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.action('freeze'));

            expect(player.getCardCount()).toBe(4);
        });
    });

    describe('calculateRoundScore', () => {
        test('should return 0 for busted player', () => {
            player.addCard(createCard.number(5));
            player.bust();
            
            const score = player.calculateRoundScore();
            expect(score).toBe(0);
            expect(player.roundScore).toBe(0);
        });

        test('should calculate simple number card sum', () => {
            player.addCard(createCard.number(3));
            player.addCard(createCard.number(7));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(10);
        });

        test('should apply x2 modifier correctly', () => {
            player.addCard(createCard.number(5));
            player.addCard(createCard.number(3));
            player.addCard(createCard.modifier('x2'));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(16); // (5 + 3) * 2
        });

        test('should apply bonus points correctly', () => {
            player.addCard(createCard.number(4));
            player.addCard(createCard.modifier(3));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(7); // 4 + 3
        });

        test('should apply x2 before bonus points', () => {
            player.addCard(createCard.number(5));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(4));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(14); // (5 * 2) + 4
        });

        test('should add Flip 7 bonus', () => {
            createFlip7Cards().forEach(card => player.addCard(card));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(36); // (0+1+2+3+4+5+6) + 15
        });

        test('should handle complex scenario: Flip 7 + x2 + bonus', () => {
            createFlip7Cards().forEach(card => player.addCard(card));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(5));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(62); // ((0+1+2+3+4+5+6) * 2) + 5 + 15 = 42 + 5 + 15
        });

        test('should handle multiple x2 modifiers (only apply once)', () => {
            player.addCard(createCard.number(10));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier('x2'));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(20); // 10 * 2, not 10 * 2 * 2
        });
    });

    describe('bust', () => {
        test('should set status to busted and score to 0', () => {
            player.addCard(createCard.number(10));
            player.roundScore = 15;
            
            player.bust();
            
            expect(player.status).toBe('busted');
            expect(player.roundScore).toBe(0);
        });
    });

    describe('stay', () => {
        test('should set status to stayed and calculate score', () => {
            player.addCard(createCard.number(8));
            
            player.stay();
            
            expect(player.status).toBe('stayed');
            expect(player.roundScore).toBe(8);
        });
    });

    describe('freeze', () => {
        test('should set frozen status', () => {
            player.freeze();
            
            expect(player.status).toBe('frozen');
            expect(player.isFrozen).toBe(true);
        });

        test('should calculate score and set to stayed if has cards', () => {
            player.addCard(createCard.number(6));
            
            player.freeze();
            
            expect(player.isFrozen).toBe(true);
            expect(player.status).toBe('stayed');
            expect(player.roundScore).toBe(6);
        });

        test('should stay frozen if no cards', () => {
            player.freeze();
            
            expect(player.status).toBe('frozen');
            expect(player.roundScore).toBe(0);
        });
    });

    describe('useSecondChance', () => {
        test('should return false if no second chance', () => {
            const result = player.useSecondChance();
            expect(result).toBe(false);
            expect(player.hasSecondChance).toBe(false);
        });

        test('should use second chance and remove flag', () => {
            player.addCard(createCard.action('second_chance'));
            
            const result = player.useSecondChance();
            
            expect(result).toBe(true);
            expect(player.hasSecondChance).toBe(false);
            expect(player.actionCards.length).toBe(0);
        });
    });

    describe('removeDuplicateCard', () => {
        test('should remove last occurrence of number', () => {
            player.addCard(createCard.number(5));
            player.addCard(createCard.number(3));
            player.addCard(createCard.number(5)); // This should be removed
            
            player.removeDuplicateCard(5);
            
            expect(player.numberCards.length).toBe(2);
            const values = player.numberCards.map(c => c.value);
            expect(values).toEqual([3, 5]);
        });

        test('should re-sort cards after removal', () => {
            player.addCard(createCard.number(9));
            player.addCard(createCard.number(2));
            player.addCard(createCard.number(5));
            
            player.removeDuplicateCard(5);
            
            const values = player.numberCards.map(c => c.value);
            expect(values).toEqual([2, 9]);
        });
    });

    describe('resetForNewRound', () => {
        test('should reset all round-specific data', () => {
            // Set up player with cards and status
            player.addCard(createCard.number(5));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.action('second_chance'));
            player.roundScore = 25;
            player.status = 'stayed';
            player.isFrozen = true;
            
            player.resetForNewRound();
            
            expect(player.roundScore).toBe(0);
            expect(player.numberCards).toEqual([]);
            expect(player.modifierCards).toEqual([]);
            expect(player.actionCards).toEqual([]);
            expect(player.uniqueNumbers.size).toBe(0);
            expect(player.status).toBe('active');
            expect(player.hasSecondChance).toBe(false);
            expect(player.isFrozen).toBe(false);
        });

        test('should preserve totalScore and player identity', () => {
            player.totalScore = 150;
            
            player.resetForNewRound();
            
            expect(player.totalScore).toBe(150);
            expect(player.id).toBe('test-player');
            expect(player.name).toBe('Test Player');
            expect(player.isHuman).toBe(false);
        });
    });

    describe('addToTotalScore', () => {
        test('should add round score to total', () => {
            player.roundScore = 25;
            player.totalScore = 75;
            
            player.addToTotalScore();
            
            expect(player.totalScore).toBe(100);
        });

        test('should handle zero round score', () => {
            player.roundScore = 0;
            player.totalScore = 50;
            
            player.addToTotalScore();
            
            expect(player.totalScore).toBe(50);
        });
    });

    describe('getState and setState', () => {
        test('should serialize player state correctly', () => {
            player.addCard(createCard.number(5));
            player.addCard(createCard.modifier('x2'));
            player.totalScore = 100;
            player.roundScore = 15;
            player.status = 'stayed';
            
            const state = player.getState();
            
            expect(state.id).toBe(player.id);
            expect(state.totalScore).toBe(100);
            expect(state.roundScore).toBe(15);
            expect(state.status).toBe('stayed');
            expect(state.numberCards).toEqual(player.numberCards);
            expect(state.uniqueNumbers).toEqual([5]);
        });

        test('should restore player state correctly', () => {
            const state = {
                totalScore: 75,
                roundScore: 20,
                numberCards: [createCard.number(3), createCard.number(7)],
                modifierCards: [createCard.modifier(4)],
                actionCards: [],
                uniqueNumbers: [3, 7],
                status: 'active',
                hasSecondChance: false,
                isFrozen: false
            };
            
            player.setState(state);
            
            expect(player.totalScore).toBe(75);
            expect(player.roundScore).toBe(20);
            expect(player.numberCards).toEqual(state.numberCards);
            expect(player.modifierCards).toEqual(state.modifierCards);
            expect(player.uniqueNumbers).toEqual(new Set([3, 7]));
            expect(player.status).toBe('active');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty card arrays gracefully', () => {
            const score = player.calculateRoundScore();
            expect(score).toBe(0);
        });

        test('should handle maximum unique numbers (13: 0-12)', () => {
            for (let i = 0; i <= 12; i++) {
                player.addCard(createCard.number(i));
            }
            
            expect(player.uniqueNumbers.size).toBe(13);
            expect(player.hasFlip7()).toBe(false); // More than 7
        });

        test('should handle invalid card types gracefully', () => {
            const invalidCard = { type: 'invalid', value: 'test', display: 'Test' };
            
            expect(() => player.addCard(invalidCard)).not.toThrow();
            expect(player.getCardCount()).toBe(0);
        });

        test('should handle multiple modifier types correctly', () => {
            player.addCard(createCard.number(10));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(3));
            player.addCard(createCard.modifier(5));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(28); // (10 * 2) + 3 + 5
        });
    });
});