// DeckManager.test.js - Unit tests for DeckManager

import { DeckManager } from '../modules/game/deck/DeckManager.js';
import { createMockEventBus } from './utils/TestUtils.js';

describe('DeckManager', () => {
    let deckManager;
    let mockEventBus;

    beforeEach(() => {
        mockEventBus = createMockEventBus();
        deckManager = new DeckManager();
        
        // Replace the real eventBus with our mock
        deckManager.eventBus = mockEventBus;
    });

    describe('Constructor', () => {
        test('should initialize with empty deck and discard pile', () => {
            expect(deckManager.deck).toEqual([]);
            expect(deckManager.discardPile).toEqual([]);
            expect(deckManager.cardsDealt).toBe(0);
        });
    });

    describe('createNewDeck', () => {
        beforeEach(() => {
            deckManager.createNewDeck();
        });

        test('should create deck with correct number of cards', () => {
            // Count expected cards:
            // Number cards: 4*12 + 6 (for 7s) = 54
            // Modifier cards: 6 + 4 + 4 + 3 + 2 = 19
            // Action cards: 6 + 4 + 4 = 14
            // Total: 54 + 19 + 14 = 87
            expect(deckManager.deck.length).toBe(87);
        });

        test('should create correct number card distribution', () => {
            const numberCards = deckManager.deck.filter(card => card.type === 'number');
            
            // Count each number
            const counts = {};
            numberCards.forEach(card => {
                counts[card.value] = (counts[card.value] || 0) + 1;
            });

            // Check specific distributions
            expect(counts[7]).toBe(6); // More 7s for Flip 7 strategy
            for (let i = 0; i <= 12; i++) {
                if (i !== 7) {
                    expect(counts[i]).toBe(4);
                }
            }
        });

        test('should create correct modifier card distribution', () => {
            const modifierCards = deckManager.deck.filter(card => card.type === 'modifier');
            
            const x2Cards = modifierCards.filter(card => card.value === 'x2');
            const plus2Cards = modifierCards.filter(card => card.value === 2);
            const plus3Cards = modifierCards.filter(card => card.value === 3);
            const plus4Cards = modifierCards.filter(card => card.value === 4);
            const plus5Cards = modifierCards.filter(card => card.value === 5);

            expect(x2Cards.length).toBe(6);
            expect(plus2Cards.length).toBe(4);
            expect(plus3Cards.length).toBe(4);
            expect(plus4Cards.length).toBe(3);
            expect(plus5Cards.length).toBe(2);
        });

        test('should create correct action card distribution', () => {
            const actionCards = deckManager.deck.filter(card => card.type === 'action');
            
            const freezeCards = actionCards.filter(card => card.value === 'freeze');
            const flip3Cards = actionCards.filter(card => card.value === 'flip3');
            const secondChanceCards = actionCards.filter(card => card.value === 'second_chance');

            expect(freezeCards.length).toBe(6);
            expect(flip3Cards.length).toBe(4);
            expect(secondChanceCards.length).toBe(4);
        });

        test('should assign unique IDs to cards', () => {
            const ids = new Set(deckManager.deck.map(card => card.id));
            expect(ids.size).toBe(deckManager.deck.length); // All IDs should be unique
        });

        test('should reset cardsDealt counter', () => {
            deckManager.cardsDealt = 10;
            deckManager.createNewDeck();
            expect(deckManager.cardsDealt).toBe(0);
        });

        test('should clear discard pile', () => {
            deckManager.discardPile = [{ type: 'number', value: 5 }];
            deckManager.createNewDeck();
            expect(deckManager.discardPile).toEqual([]);
        });

        test('should emit cards remaining update event', () => {
            const emissions = mockEventBus.getEmissions();
            const updateEvent = emissions.find(e => e.event === 'display:cardsRemainingUpdate');
            expect(updateEvent).toBeDefined();
            expect(updateEvent.data.count).toBe(87);
        });
    });

    describe('shuffleDeck', () => {
        beforeEach(() => {
            deckManager.createNewDeck();
        });

        test('should change card order', () => {
            const originalOrder = [...deckManager.deck];
            
            deckManager.shuffleDeck();
            
            // Very unlikely that shuffle maintains exact same order
            const sameOrder = deckManager.deck.every((card, index) => 
                card.id === originalOrder[index].id
            );
            expect(sameOrder).toBe(false);
        });

        test('should maintain same number of cards', () => {
            const originalLength = deckManager.deck.length;
            
            deckManager.shuffleDeck();
            
            expect(deckManager.deck.length).toBe(originalLength);
        });

        test('should maintain all cards (no loss or duplication)', () => {
            const originalIds = deckManager.deck.map(card => card.id).sort();
            
            deckManager.shuffleDeck();
            
            const shuffledIds = deckManager.deck.map(card => card.id).sort();
            expect(shuffledIds).toEqual(originalIds);
        });
    });

    describe('drawCard', () => {
        beforeEach(() => {
            deckManager.createNewDeck();
        });

        test('should return a card from top of deck', () => {
            const originalDeckSize = deckManager.deck.length;
            const topCard = deckManager.deck[deckManager.deck.length - 1];
            
            const drawnCard = deckManager.drawCard();
            
            expect(drawnCard).toEqual(topCard);
            expect(deckManager.deck.length).toBe(originalDeckSize - 1);
        });

        test('should increment cardsDealt counter', () => {
            const originalCount = deckManager.cardsDealt;
            
            deckManager.drawCard();
            
            expect(deckManager.cardsDealt).toBe(originalCount + 1);
        });

        test('should emit cards remaining update event', () => {
            mockEventBus.clearEmissions();
            
            deckManager.drawCard();
            
            const emissions = mockEventBus.getEmissions();
            const updateEvent = emissions.find(e => e.event === 'display:cardsRemainingUpdate');
            expect(updateEvent).toBeDefined();
            expect(updateEvent.data.count).toBe(deckManager.deck.length);
        });

        test('should reshuffle discard pile when deck is empty', () => {
            // Empty the deck and add cards to discard pile
            deckManager.deck = [];
            deckManager.discardPile = [
                { type: 'number', value: 5, id: 'test1' },
                { type: 'number', value: 3, id: 'test2' }
            ];
            
            const drawnCard = deckManager.drawCard();
            
            expect(drawnCard).toBeDefined();
            expect(deckManager.discardPile.length).toBe(0);
            expect(deckManager.deck.length).toBe(1); // One card left after drawing
        });

        test('should create new deck if both deck and discard are empty', () => {
            deckManager.deck = [];
            deckManager.discardPile = [];
            
            const drawnCard = deckManager.drawCard();
            
            expect(drawnCard).toBeDefined();
            expect(deckManager.deck.length).toBe(86); // 87 - 1 drawn
        });

        test('should return null if unable to create cards', () => {
            // Mock the createNewDeck to fail
            deckManager.deck = [];
            deckManager.discardPile = [];
            
            // Override createNewDeck to not create cards (simulate failure)
            const originalCreate = deckManager.createNewDeck;
            deckManager.createNewDeck = jest.fn(() => {
                deckManager.deck = [];
            });
            
            const drawnCard = deckManager.drawCard();
            
            expect(drawnCard).toBeNull();
            
            // Restore original method
            deckManager.createNewDeck = originalCreate;
        });
    });

    describe('discardCard', () => {
        test('should add card to discard pile', () => {
            const card = { type: 'number', value: 7, id: 'test' };
            
            deckManager.discardCard(card);
            
            expect(deckManager.discardPile).toContain(card);
            expect(deckManager.discardPile.length).toBe(1);
        });

        test('should emit discard event', () => {
            const card = { type: 'number', value: 7, id: 'test' };
            
            deckManager.discardCard(card);
            
            const emissions = mockEventBus.getEmissions();
            const discardEvent = emissions.find(e => e.event === 'card:discarded');
            expect(discardEvent).toBeDefined();
            expect(discardEvent.data.card).toEqual(card);
        });

        test('should handle null card gracefully', () => {
            expect(() => deckManager.discardCard(null)).not.toThrow();
            expect(deckManager.discardPile.length).toBe(0);
        });

        test('should handle undefined card gracefully', () => {
            expect(() => deckManager.discardCard(undefined)).not.toThrow();
            expect(deckManager.discardPile.length).toBe(0);
        });
    });

    describe('reshuffleDiscardPile', () => {
        test('should move discard pile to deck and shuffle', () => {
            deckManager.deck = [{ type: 'number', value: 1, id: 'deck1' }];
            deckManager.discardPile = [
                { type: 'number', value: 2, id: 'discard1' },
                { type: 'number', value: 3, id: 'discard2' }
            ];
            
            deckManager.reshuffleDiscardPile();
            
            expect(deckManager.deck.length).toBe(3);
            expect(deckManager.discardPile.length).toBe(0);
            
            // Check that all cards are in deck
            const deckIds = deckManager.deck.map(card => card.id);
            expect(deckIds).toContain('deck1');
            expect(deckIds).toContain('discard1');
            expect(deckIds).toContain('discard2');
        });

        test('should emit cards remaining update event', () => {
            deckManager.discardPile = [
                { type: 'number', value: 2, id: 'discard1' }
            ];
            
            mockEventBus.clearEmissions();
            deckManager.reshuffleDiscardPile();
            
            const emissions = mockEventBus.getEmissions();
            const updateEvent = emissions.find(e => e.event === 'display:cardsRemainingUpdate');
            expect(updateEvent).toBeDefined();
        });

        test('should handle empty discard pile', () => {
            deckManager.deck = [{ type: 'number', value: 1 }];
            deckManager.discardPile = [];
            
            expect(() => deckManager.reshuffleDiscardPile()).not.toThrow();
            expect(deckManager.deck.length).toBe(1);
        });
    });

    describe('prepareForRound', () => {
        test('should reshuffle if deck is too small', () => {
            deckManager.deck = Array(15).fill(null).map((_, i) => ({ 
                type: 'number', value: i, id: `card${i}` 
            }));
            deckManager.discardPile = [
                { type: 'number', value: 99, id: 'discard1' }
            ];
            
            deckManager.prepareForRound();
            
            expect(deckManager.deck.length).toBe(16); // 15 + 1 from discard
            expect(deckManager.discardPile.length).toBe(0);
        });

        test('should create new deck if deck is empty', () => {
            deckManager.deck = [];
            deckManager.discardPile = [];
            
            deckManager.prepareForRound();
            
            expect(deckManager.deck.length).toBe(87); // Full new deck
        });

        test('should do nothing if deck has sufficient cards', () => {
            deckManager.deck = Array(50).fill(null).map((_, i) => ({ 
                type: 'number', value: i, id: `card${i}` 
            }));
            const originalLength = deckManager.deck.length;
            
            deckManager.prepareForRound();
            
            expect(deckManager.deck.length).toBe(originalLength);
        });
    });

    describe('Utility Methods', () => {
        beforeEach(() => {
            deckManager.createNewDeck();
            deckManager.cardsDealt = 5;
        });

        test('getRemainingCount should return deck size', () => {
            expect(deckManager.getRemainingCount()).toBe(deckManager.deck.length);
        });

        test('getDiscardCount should return discard pile size', () => {
            deckManager.discardPile = [
                { type: 'number', value: 1 },
                { type: 'number', value: 2 }
            ];
            expect(deckManager.getDiscardCount()).toBe(2);
        });

        test('getCardsDealt should return cards dealt counter', () => {
            expect(deckManager.getCardsDealt()).toBe(5);
        });

        test('peekNextCard should return top card without removing it', () => {
            const originalLength = deckManager.deck.length;
            const topCard = deckManager.deck[deckManager.deck.length - 1];
            
            const peeked = deckManager.peekNextCard();
            
            expect(peeked).toEqual(topCard);
            expect(deckManager.deck.length).toBe(originalLength); // Unchanged
        });

        test('peekNextCard should return null for empty deck', () => {
            deckManager.deck = [];
            expect(deckManager.peekNextCard()).toBeNull();
        });
    });

    describe('getDeckStats', () => {
        beforeEach(() => {
            deckManager.createNewDeck();
            deckManager.cardsDealt = 10;
            deckManager.discardPile = [
                { type: 'number', value: 1 },
                { type: 'modifier', value: 'x2' }
            ];
        });

        test('should return correct deck statistics', () => {
            const stats = deckManager.getDeckStats();
            
            expect(stats.remaining).toBe(deckManager.deck.length);
            expect(stats.discarded).toBe(2);
            expect(stats.dealt).toBe(10);
            expect(stats.cardTypes).toBeDefined();
            expect(stats.cardTypes.number).toBeGreaterThan(0);
            expect(stats.cardTypes.modifier).toBeGreaterThan(0);
            expect(stats.cardTypes.action).toBeGreaterThan(0);
        });

        test('should count card types correctly in remaining deck', () => {
            const stats = deckManager.getDeckStats();
            const totalCards = stats.cardTypes.number + 
                              stats.cardTypes.modifier + 
                              stats.cardTypes.action;
            
            expect(totalCards).toBe(deckManager.deck.length);
        });
    });

    describe('reset', () => {
        test('should reset all state and create new deck', () => {
            deckManager.cardsDealt = 25;
            deckManager.discardPile = [{ type: 'number', value: 5 }];
            deckManager.deck = [];
            
            deckManager.reset();
            
            expect(deckManager.cardsDealt).toBe(0);
            expect(deckManager.discardPile).toEqual([]);
            expect(deckManager.deck.length).toBe(87);
        });
    });

    describe('Event Listeners', () => {
        test('should create new deck on game started event', () => {
            deckManager.deck = [];
            
            // Simulate game started event
            mockEventBus.emit('game:started');
            
            expect(deckManager.deck.length).toBe(87);
        });

        test('should prepare for round on round started event', () => {
            deckManager.deck = Array(15).fill({ type: 'number', value: 1 });
            deckManager.discardPile = [{ type: 'number', value: 2 }];
            
            // Simulate round started event
            mockEventBus.emit('round:started');
            
            expect(deckManager.deck.length).toBe(16); // Reshuffled
        });
    });

    describe('Edge Cases', () => {
        test('should handle drawing all cards from deck', () => {
            deckManager.createNewDeck();
            const totalCards = deckManager.deck.length;
            
            const drawnCards = [];
            for (let i = 0; i < totalCards; i++) {
                const card = deckManager.drawCard();
                if (card) drawnCards.push(card);
            }
            
            expect(drawnCards.length).toBe(totalCards);
            expect(deckManager.deck.length).toBe(0);
        });

        test('should handle drawing from empty deck with empty discard', () => {
            deckManager.deck = [];
            deckManager.discardPile = [];
            
            const card = deckManager.drawCard();
            
            expect(card).toBeDefined(); // Should create new deck and draw
        });

        test('should handle massive discard pile reshuffle', () => {
            deckManager.deck = [];
            deckManager.discardPile = Array(100).fill(null).map((_, i) => ({
                type: 'number',
                value: i % 13,
                id: `massive${i}`
            }));
            
            deckManager.reshuffleDiscardPile();
            
            expect(deckManager.deck.length).toBe(100);
            expect(deckManager.discardPile.length).toBe(0);
        });

        test('should handle extreme card drawing scenarios', () => {
            deckManager.createNewDeck();
            
            // Draw cards until forced to reshuffle multiple times
            for (let i = 0; i < 200; i++) {
                const card = deckManager.drawCard();
                expect(card).toBeDefined();
                
                // Sometimes discard cards to create reshuffle scenarios
                if (i % 10 === 0) {
                    deckManager.discardCard(card);
                }
            }
            
            expect(deckManager.cardsDealt).toBe(200);
        });
    });
});