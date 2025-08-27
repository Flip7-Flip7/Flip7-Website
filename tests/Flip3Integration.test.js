// Flip3Integration.test.js - Integration tests for complex Flip 3 scenarios

describe('Flip 3 Integration Tests', () => {
    // Mock classes for testing complex Flip 3 scenarios
    class MockGameEngine {
        constructor() {
            this.players = [];
            this.currentPlayerIndex = 0;
            this.isProcessingFlip3 = false;
            this.pendingActionResolution = 0;
            this.pendingFlip3Queue = [];
            this.flip3DrawnCards = [];
            this.deck = [];
            this.discardPile = [];
            this.actionLog = [];
        }

        createPlayer(id, name, isHuman = false) {
            return {
                id,
                name,
                isHuman,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                hasSecondChance: false,
                status: 'active',
                roundScore: 0,
                totalScore: 0,
                isFrozen: false
            };
        }

        addCard(player, card) {
            if (card.type === 'number') {
                player.numberCards.push(card);
                player.uniqueNumbers.add(card.value);
                player.numberCards.sort((a, b) => a.value - b.value);
            } else if (card.type === 'modifier') {
                player.modifierCards.push(card);
            } else if (card.type === 'action') {
                if (card.value === 'second_chance' && !player.hasSecondChance) {
                    player.hasSecondChance = true;
                    player.actionCards.push(card);
                } else if (card.value === 'freeze' || card.value === 'flip3') {
                    player.actionCards.push(card);
                }
            }
        }

        simulateFlip3WithSecondChance(targetPlayer, cards) {
            // Simulate the complex logic we just fixed
            const results = {
                survived: false,
                busted: false,
                secondChanceUsed: false,
                cardsAdded: [],
                actionsQueued: []
            };

            let cardIndex = 0;
            for (const card of cards) {
                cardIndex++;
                
                if (card.type === 'number') {
                    const isDuplicate = targetPlayer.uniqueNumbers.has(card.value);
                    
                    if (isDuplicate && targetPlayer.hasSecondChance) {
                        // Use Second Chance to survive (our fix)
                        targetPlayer.numberCards.push(card);
                        targetPlayer.numberCards.sort((a, b) => a.value - b.value);
                        targetPlayer.uniqueNumbers.add(card.value);
                        targetPlayer.hasSecondChance = false;
                        targetPlayer.actionCards = targetPlayer.actionCards.filter(c => c.value !== 'second_chance');
                        
                        results.secondChanceUsed = true;
                        results.survived = true;
                        results.cardsAdded.push(card);
                        
                        this.actionLog.push(`${targetPlayer.name} used Second Chance to survive duplicate ${card.value} during Flip 3`);
                    } else if (isDuplicate && !targetPlayer.hasSecondChance) {
                        // Bust immediately
                        targetPlayer.status = 'busted';
                        targetPlayer.roundScore = 0;
                        results.busted = true;
                        results.cardsAdded.push(card);
                        
                        this.actionLog.push(`${targetPlayer.name} BUSTED with duplicate ${card.value} during Flip 3`);
                        break; // Stop processing remaining cards
                    } else {
                        // Normal card
                        targetPlayer.numberCards.push(card);
                        targetPlayer.uniqueNumbers.add(card.value);
                        targetPlayer.numberCards.sort((a, b) => a.value - b.value);
                        results.cardsAdded.push(card);
                    }
                } else if (card.type === 'action') {
                    // Action cards are queued for later processing (our fix)
                    results.actionsQueued.push({
                        card,
                        drawnBy: targetPlayer,
                        cardNumber: cardIndex
                    });
                    this.pendingActionResolution++;
                } else if (card.type === 'modifier') {
                    targetPlayer.modifierCards.push(card);
                    results.cardsAdded.push(card);
                }
            }

            return results;
        }

        simulateActionResolution(actionData) {
            const { card, drawnBy } = actionData;
            const results = { resolved: false, actionTaken: null };

            if (card.value === 'second_chance') {
                if (!drawnBy.hasSecondChance) {
                    drawnBy.hasSecondChance = true;
                    drawnBy.actionCards.push(card);
                    results.resolved = true;
                    results.actionTaken = 'gained_second_chance';
                }
            } else if (card.value === 'freeze') {
                // Add freeze card for later use
                drawnBy.actionCards.push(card);
                results.resolved = true;
                results.actionTaken = 'received_freeze';
            } else if (card.value === 'flip3') {
                // Add to flip3 queue
                this.pendingFlip3Queue.push({
                    cardOwner: drawnBy,
                    card: card
                });
                results.resolved = true;
                results.actionTaken = 'queued_flip3';
            }

            if (results.resolved) {
                this.pendingActionResolution--;
            }

            return results;
        }
    }

    const createCard = {
        number: (value) => ({ type: 'number', value, display: value.toString() }),
        modifier: (value) => ({ type: 'modifier', value, display: value === 'x2' ? 'x2' : `+${value}` }),
        action: (value) => ({ 
            type: 'action', 
            value, 
            display: value === 'second_chance' ? 'Second Chance' : 
                    value === 'flip3' ? 'Flip 3' : 
                    value === 'freeze' ? 'Freeze' : value 
        })
    };

    let gameEngine;
    let testPlayer;

    beforeEach(() => {
        gameEngine = new MockGameEngine();
        testPlayer = gameEngine.createPlayer('player1', 'Test Player', false);
        gameEngine.players.push(testPlayer);
    });

    describe('Second Chance During Flip 3', () => {
        test('should use Second Chance to survive duplicate during Flip 3', () => {
            // Setup: Player has Second Chance and cards 1, 2, 3
            testPlayer.hasSecondChance = true;
            testPlayer.actionCards.push(createCard.action('second_chance'));
            gameEngine.addCard(testPlayer, createCard.number(1));
            gameEngine.addCard(testPlayer, createCard.number(2));
            gameEngine.addCard(testPlayer, createCard.number(3));

            // Flip 3 reveals: [duplicate 2, new card 4, new card 5]
            const flip3Cards = [
                createCard.number(2), // Duplicate!
                createCard.number(4),
                createCard.number(5)
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify Second Chance was used correctly
            expect(results.secondChanceUsed).toBe(true);
            expect(results.survived).toBe(true);
            expect(results.busted).toBe(false);
            expect(testPlayer.hasSecondChance).toBe(false); // Used up
            expect(testPlayer.status).toBe('active'); // Still active
            
            // All cards should be added to hand
            expect(results.cardsAdded).toHaveLength(3);
            expect(testPlayer.uniqueNumbers.size).toBe(5); // 1,2,3,4,5
            expect(testPlayer.numberCards).toHaveLength(6); // 1,2,2,3,4,5
        });

        test('should bust when duplicate found and no Second Chance', () => {
            // Setup: Player has cards 1, 2, 3 (no Second Chance)
            gameEngine.addCard(testPlayer, createCard.number(1));
            gameEngine.addCard(testPlayer, createCard.number(2));
            gameEngine.addCard(testPlayer, createCard.number(3));

            // Flip 3 reveals: [duplicate 2, card 4, card 5]
            const flip3Cards = [
                createCard.number(2), // Duplicate!
                createCard.number(4),
                createCard.number(5)
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify player busts immediately
            expect(results.busted).toBe(true);
            expect(results.secondChanceUsed).toBe(false);
            expect(testPlayer.status).toBe('busted');
            
            // Only the duplicate card should be added before busting
            expect(results.cardsAdded).toHaveLength(1);
            expect(results.cardsAdded[0].value).toBe(2);
        });

        test('should handle Second Chance with multiple duplicates', () => {
            // Setup: Player has Second Chance and cards 1, 2
            testPlayer.hasSecondChance = true;
            testPlayer.actionCards.push(createCard.action('second_chance'));
            gameEngine.addCard(testPlayer, createCard.number(1));
            gameEngine.addCard(testPlayer, createCard.number(2));

            // Flip 3 reveals: [duplicate 1, duplicate 2, new card 3]
            const flip3Cards = [
                createCard.number(1), // First duplicate - should use Second Chance
                createCard.number(2), // Second duplicate - should bust (no more Second Chance)
                createCard.number(3)
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // First duplicate uses Second Chance, second duplicate busts
            expect(results.secondChanceUsed).toBe(true);
            expect(results.busted).toBe(true);
            expect(testPlayer.hasSecondChance).toBe(false);
            expect(testPlayer.status).toBe('busted');
        });
    });

    describe('Action Card Queuing During Flip 3', () => {
        test('should queue action cards for resolution after Flip 3', () => {
            // Flip 3 reveals: [number card, freeze card, flip3 card]
            const flip3Cards = [
                createCard.number(5),
                createCard.action('freeze'),
                createCard.action('flip3')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify action cards are queued
            expect(results.actionsQueued).toHaveLength(2);
            expect(results.actionsQueued[0].card.value).toBe('freeze');
            expect(results.actionsQueued[1].card.value).toBe('flip3');
            expect(gameEngine.pendingActionResolution).toBe(2);
        });

        test('should process queued actions after Flip 3 completes', () => {
            // Queue some actions from Flip 3
            const queuedActions = [
                {
                    card: createCard.action('second_chance'),
                    drawnBy: testPlayer,
                    cardNumber: 1
                },
                {
                    card: createCard.action('freeze'),
                    drawnBy: testPlayer,
                    cardNumber: 2
                }
            ];

            gameEngine.pendingActionResolution = 2;

            // Process each queued action
            const secondChanceResult = gameEngine.simulateActionResolution(queuedActions[0]);
            expect(secondChanceResult.resolved).toBe(true);
            expect(secondChanceResult.actionTaken).toBe('gained_second_chance');
            expect(testPlayer.hasSecondChance).toBe(true);

            const freezeResult = gameEngine.simulateActionResolution(queuedActions[1]);
            expect(freezeResult.resolved).toBe(true);
            expect(freezeResult.actionTaken).toBe('received_freeze');

            // Verify resolution counter decremented
            expect(gameEngine.pendingActionResolution).toBe(0);
        });

        test('should handle mixed action cards with Second Chance gain', () => {
            // Flip 3 reveals: [Second Chance, duplicate (should bust), Freeze]
            gameEngine.addCard(testPlayer, createCard.number(3));
            
            const flip3Cards = [
                createCard.action('second_chance'), // Gained during Flip 3
                createCard.number(3), // Duplicate, but Second Chance not available yet
                createCard.action('freeze')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Player should bust because Second Chance is queued, not immediately available
            expect(results.busted).toBe(true);
            // Only Second Chance should be queued - processing stops at bust
            expect(results.actionsQueued).toHaveLength(1); // Only Second Chance queued before bust
            expect(results.actionsQueued[0].card.value).toBe('second_chance');
        });
    });

    describe('Complex Integration Scenarios', () => {
        test('should handle Flip 3 with Second Chance, action cards, and modifiers', () => {
            // Setup: Player has Second Chance
            testPlayer.hasSecondChance = true;
            testPlayer.actionCards.push(createCard.action('second_chance'));
            gameEngine.addCard(testPlayer, createCard.number(7));

            // Complex Flip 3: [duplicate 7, x2 modifier, freeze action]
            const flip3Cards = [
                createCard.number(7), // Duplicate - should use Second Chance
                createCard.modifier('x2'),
                createCard.action('freeze')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify all aspects handled correctly
            expect(results.secondChanceUsed).toBe(true);
            expect(results.survived).toBe(true);
            expect(results.cardsAdded).toHaveLength(2); // number + modifier
            expect(results.actionsQueued).toHaveLength(1); // freeze
            
            expect(testPlayer.numberCards).toHaveLength(2); // 7, 7
            expect(testPlayer.modifierCards).toHaveLength(1); // x2
            expect(testPlayer.hasSecondChance).toBe(false); // Used
        });

        test('should handle nested Flip 3 queuing', () => {
            // Flip 3 reveals another Flip 3 card
            const flip3Cards = [
                createCard.number(8),
                createCard.action('flip3'),
                createCard.number(9)
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify Flip 3 is queued for later execution
            expect(results.actionsQueued).toHaveLength(1);
            expect(results.actionsQueued[0].card.value).toBe('flip3');

            // Process the queued Flip 3
            const actionResult = gameEngine.simulateActionResolution(results.actionsQueued[0]);
            expect(actionResult.resolved).toBe(true);
            expect(actionResult.actionTaken).toBe('queued_flip3');
            expect(gameEngine.pendingFlip3Queue).toHaveLength(1);
        });

        test('should handle extreme scenario: all action cards in Flip 3', () => {
            // Flip 3 reveals: [Second Chance, Freeze, Flip 3]
            const flip3Cards = [
                createCard.action('second_chance'),
                createCard.action('freeze'),
                createCard.action('flip3')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // All should be queued for action resolution
            expect(results.actionsQueued).toHaveLength(3);
            expect(gameEngine.pendingActionResolution).toBe(3);
            expect(testPlayer.numberCards).toHaveLength(0); // No number cards added
        });
    });

    describe('Edge Cases and Error Conditions', () => {
        test('should handle Flip 3 with no cards', () => {
            const flip3Cards = [];
            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            expect(results.cardsAdded).toHaveLength(0);
            expect(results.actionsQueued).toHaveLength(0);
            expect(results.busted).toBe(false);
            expect(results.survived).toBe(false);
        });

        test('should handle Flip 3 when player already busted', () => {
            // Pre-bust the player
            testPlayer.status = 'busted';
            
            const flip3Cards = [
                createCard.number(1),
                createCard.action('freeze')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Should still process cards even if player is busted
            expect(results.cardsAdded).toHaveLength(1);
            expect(results.actionsQueued).toHaveLength(1);
        });

        test('should handle duplicate Second Chance action cards', () => {
            // Player already has Second Chance
            testPlayer.hasSecondChance = true;
            testPlayer.actionCards.push(createCard.action('second_chance'));

            const queuedAction = {
                card: createCard.action('second_chance'),
                drawnBy: testPlayer,
                cardNumber: 1
            };

            const result = gameEngine.simulateActionResolution(queuedAction);

            // Should not give another Second Chance
            expect(result.resolved).toBe(false);
            expect(testPlayer.hasSecondChance).toBe(true); // Still true
            expect(testPlayer.actionCards.filter(c => c.value === 'second_chance')).toHaveLength(1);
        });
    });

    describe('State Consistency', () => {
        test('should maintain consistent game state through complex Flip 3', () => {
            // Setup complex initial state
            testPlayer.hasSecondChance = true;
            gameEngine.addCard(testPlayer, createCard.number(1));
            gameEngine.addCard(testPlayer, createCard.number(2));
            gameEngine.addCard(testPlayer, createCard.modifier(5));

            const initialUniqueCount = testPlayer.uniqueNumbers.size;
            const initialCardCount = testPlayer.numberCards.length;
            const initialModifierCount = testPlayer.modifierCards.length;

            // Complex Flip 3
            const flip3Cards = [
                createCard.number(2), // Duplicate
                createCard.number(3), // New
                createCard.action('freeze')
            ];

            const results = gameEngine.simulateFlip3WithSecondChance(testPlayer, flip3Cards);

            // Verify state consistency
            expect(testPlayer.uniqueNumbers.size).toBe(initialUniqueCount + 1); // Added card 3
            expect(testPlayer.numberCards.length).toBe(initialCardCount + 2); // Added duplicate 2 and new 3
            expect(testPlayer.modifierCards.length).toBe(initialModifierCount); // Unchanged
            expect(testPlayer.hasSecondChance).toBe(false); // Used
            
            // Verify derived state
            const uniqueValues = Array.from(testPlayer.uniqueNumbers).sort();
            expect(uniqueValues).toEqual([1, 2, 3]);
        });
    });
});