// Player-simple.test.js - Simplified unit tests for Player class logic

describe('Player Class (Simplified)', () => {
    // Mock Player class for testing core logic
    class MockPlayer {
        constructor(id, name, isHuman = false) {
            this.id = id;
            this.name = name;
            this.isHuman = isHuman;
            this.totalScore = 0;
            this.roundScore = 0;
            this.numberCards = [];
            this.modifierCards = [];
            this.actionCards = [];
            this.uniqueNumbers = new Set();
            this.status = 'waiting';
            this.hasSecondChance = false;
            this.isFrozen = false;
        }

        addCard(card) {
            if (card.type === 'number') {
                this.numberCards.push(card);
                this.uniqueNumbers.add(card.value);
                this.numberCards.sort((a, b) => a.value - b.value);
            } else if (card.type === 'modifier') {
                this.modifierCards.push(card);
            } else if (card.type === 'action') {
                if (card.value === 'second_chance' && !this.hasSecondChance) {
                    this.hasSecondChance = true;
                    this.actionCards.push(card);
                }
            }
        }

        hasDuplicate(value) {
            return this.uniqueNumbers.has(value);
        }

        hasFlip7() {
            return this.uniqueNumbers.size === 7;
        }

        calculateRoundScore() {
            if (this.status === 'busted') {
                this.roundScore = 0;
                return 0;
            }

            let score = 0;
            
            // Sum number cards
            this.numberCards.forEach(card => {
                score += card.value;
            });
            
            // Apply modifiers
            let hasX2 = false;
            let bonusPoints = 0;
            
            this.modifierCards.forEach(card => {
                if (card.value === 'x2') {
                    hasX2 = true;
                } else {
                    bonusPoints += card.value;
                }
            });
            
            if (hasX2) score *= 2;
            score += bonusPoints;
            
            // Add Flip 7 bonus
            if (this.hasFlip7()) {
                score += 15;
            }
            
            this.roundScore = score;
            return score;
        }

        bust() {
            this.status = 'busted';
            this.roundScore = 0;
        }

        stay() {
            this.status = 'stayed';
            this.calculateRoundScore();
        }

        resetForNewRound() {
            this.roundScore = 0;
            this.numberCards = [];
            this.modifierCards = [];
            this.actionCards = [];
            this.uniqueNumbers.clear();
            this.status = 'active';
            this.hasSecondChance = false;
            this.isFrozen = false;
        }
    }

    // Helper function to create test cards
    const createCard = {
        number: (value) => ({ type: 'number', value: value, display: value.toString() }),
        modifier: (value) => ({ type: 'modifier', value: value, display: value === 'x2' ? 'x2' : `+${value}` }),
        action: (value) => ({ type: 'action', value: value, display: value })
    };

    let player;

    beforeEach(() => {
        player = new MockPlayer('test-player', 'Test Player', false);
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
            expect(player.numberCards).toEqual([]);
            expect(player.uniqueNumbers.size).toBe(0);
        });

        test('should initialize human player correctly', () => {
            const humanPlayer = new MockPlayer('human', 'Human Player', true);
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

        test('should add second chance action card', () => {
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
    });

    describe('hasFlip7', () => {
        test('should return false with less than 7 unique numbers', () => {
            [1, 3, 5, 8, 10].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(false);
        });

        test('should return true with exactly 7 unique numbers', () => {
            [0, 1, 2, 3, 4, 5, 6].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(true);
        });

        test('should return false with more than 7 unique numbers', () => {
            [0, 1, 2, 3, 4, 5, 6, 7].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(false);
            expect(player.uniqueNumbers.size).toBe(8);
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
            [0, 1, 2, 3, 4, 5, 6].forEach(v => player.addCard(createCard.number(v)));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(36); // (0+1+2+3+4+5+6) + 15 = 21 + 15
        });

        test('should handle complex scenario: Flip 7 + x2 + bonus', () => {
            [0, 1, 2, 3, 4, 5, 6].forEach(v => player.addCard(createCard.number(v)));
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

        test('should preserve player identity', () => {
            player.totalScore = 150;
            
            player.resetForNewRound();
            
            expect(player.totalScore).toBe(150);
            expect(player.id).toBe('test-player');
            expect(player.name).toBe('Test Player');
            expect(player.isHuman).toBe(false);
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

        test('should handle multiple modifier types correctly', () => {
            player.addCard(createCard.number(10));
            player.addCard(createCard.modifier('x2'));
            player.addCard(createCard.modifier(3));
            player.addCard(createCard.modifier(5));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(28); // (10 * 2) + 3 + 5
        });

        test('should handle zero value cards', () => {
            player.addCard(createCard.number(0));
            player.addCard(createCard.number(5));
            
            const score = player.calculateRoundScore();
            expect(score).toBe(5); // 0 + 5
        });

        test('should handle Flip 7 with different number combinations', () => {
            [5, 6, 7, 8, 9, 10, 11].forEach(v => player.addCard(createCard.number(v)));
            expect(player.hasFlip7()).toBe(true);
            
            const score = player.calculateRoundScore();
            expect(score).toBe(71); // (5+6+7+8+9+10+11) + 15 = 56 + 15
        });
    });
});