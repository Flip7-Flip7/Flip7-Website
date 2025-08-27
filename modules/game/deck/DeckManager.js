// DeckManager.js - Handles deck creation, shuffling, and card management

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class DeckManager {
    constructor() {
        this.deck = [];
        this.discardPile = [];
        this.cardsDealt = 0;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        eventBus.on(GameEvents.GAME_STARTED, () => this.createNewDeck());
        eventBus.on(GameEvents.ROUND_STARTED, () => this.prepareForRound());
    }

    /**
     * Create a fresh deck with all card types
     */
    createNewDeck() {
        console.log('🎴 DeckManager: Creating new deck');
        
        this.deck = [];
        this.discardPile = [];
        this.cardsDealt = 0;
        
        // Add number cards (0-12 with varying quantities)
        const numberCardCounts = {
            0: 4, 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4,
            7: 6, // More 7s for Flip 7 strategy
            8: 4, 9: 4, 10: 4, 11: 4, 12: 4
        };

        Object.entries(numberCardCounts).forEach(([value, count]) => {
            for (let i = 0; i < count; i++) {
                this.deck.push({
                    type: 'number',
                    value: parseInt(value),
                    display: value,
                    id: `number_${value}_${i}` // Unique ID for each card
                });
            }
        });

        // Add modifier cards
        this.addModifierCards();
        
        // Add action cards
        this.addActionCards();
        
        this.shuffleDeck();
        
        console.log(`✅ DeckManager: Created deck with ${this.deck.length} cards`);
        
        eventBus.emit(GameEvents.CARDS_REMAINING_UPDATE, {
            count: this.deck.length
        });
    }

    /**
     * Add modifier cards to deck
     */
    addModifierCards() {
        // x2 multiplier cards
        for (let i = 0; i < 6; i++) {
            this.deck.push({
                type: 'modifier',
                value: 'x2',
                display: 'x2',
                id: `modifier_x2_${i}`
            });
        }
        
        // +2 bonus point cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({
                type: 'modifier',
                value: 2,
                display: '+2',
                id: `modifier_plus2_${i}`
            });
        }
        
        // +3 bonus point cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({
                type: 'modifier',
                value: 3,
                display: '+3',
                id: `modifier_plus3_${i}`
            });
        }
        
        // +4 bonus point cards
        for (let i = 0; i < 3; i++) {
            this.deck.push({
                type: 'modifier',
                value: 4,
                display: '+4',
                id: `modifier_plus4_${i}`
            });
        }
        
        // +5 bonus point cards
        for (let i = 0; i < 2; i++) {
            this.deck.push({
                type: 'modifier',
                value: 5,
                display: '+5',
                id: `modifier_plus5_${i}`
            });
        }
    }

    /**
     * Add action cards to deck
     */
    addActionCards() {
        // Freeze cards
        for (let i = 0; i < 6; i++) {
            this.deck.push({
                type: 'action',
                value: 'freeze',
                display: 'Freeze',
                id: `action_freeze_${i}`
            });
        }
        
        // Flip 3 cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({
                type: 'action',
                value: 'flip3',
                display: 'Flip 3',
                id: `action_flip3_${i}`
            });
        }
        
        // Second Chance cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({
                type: 'action',
                value: 'second_chance',
                display: '2nd Chance',
                id: `action_secondchance_${i}`
            });
        }
    }

    /**
     * Shuffle the current deck using Fisher-Yates algorithm
     */
    shuffleDeck() {
        console.log('🔀 DeckManager: Shuffling deck');
        
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        
        console.log(`✅ DeckManager: Shuffled ${this.deck.length} cards`);
    }

    /**
     * Draw a card from the top of the deck
     */
    drawCard() {
        // Check if we need to reshuffle
        if (this.deck.length === 0) {
            if (this.discardPile.length > 0) {
                this.reshuffleDiscardPile();
            } else {
                console.warn('⚠️ DeckManager: No cards available, creating new deck');
                this.createNewDeck();
            }
        }
        
        if (this.deck.length === 0) {
            console.error('❌ DeckManager: Unable to draw card - deck is empty');
            return null;
        }
        
        const card = this.deck.pop();
        this.cardsDealt++;
        
        console.log(`🎴 DeckManager: Drew ${card.display} (${card.type}). ${this.deck.length} cards remaining`);
        
        eventBus.emit(GameEvents.CARDS_REMAINING_UPDATE, {
            count: this.deck.length
        });
        
        return card;
    }

    /**
     * Add card to discard pile
     */
    discardCard(card) {
        if (card) {
            this.discardPile.push(card);
            console.log(`🗑️ DeckManager: Discarded ${card.display}`);
            
            eventBus.emit(GameEvents.CARD_DISCARDED, {
                card: card
            });
        }
    }

    /**
     * Reshuffle discard pile back into deck
     */
    reshuffleDiscardPile() {
        console.log('🔄 DeckManager: Reshuffling discard pile back into deck');
        
        if (this.discardPile.length === 0) {
            console.warn('⚠️ DeckManager: No cards in discard pile to reshuffle');
            return;
        }
        
        // Move discard pile to deck
        this.deck = [...this.deck, ...this.discardPile];
        this.discardPile = [];
        
        // Shuffle the combined deck
        this.shuffleDeck();
        
        console.log(`✅ DeckManager: Reshuffled ${this.deck.length} cards back into deck`);
        
        eventBus.emit(GameEvents.CARDS_REMAINING_UPDATE, {
            count: this.deck.length
        });
    }

    /**
     * Prepare deck for new round
     */
    prepareForRound() {
        console.log('🎲 DeckManager: Preparing for new round');
        
        // Ensure we have enough cards for the round
        const minCardsNeeded = 20; // Safety buffer
        
        if (this.deck.length < minCardsNeeded) {
            if (this.discardPile.length > 0) {
                this.reshuffleDiscardPile();
            } else if (this.deck.length === 0) {
                this.createNewDeck();
            }
        }
        
        console.log(`✅ DeckManager: Ready for round with ${this.deck.length} cards`);
    }

    /**
     * Get remaining card count
     */
    getRemainingCount() {
        return this.deck.length;
    }

    /**
     * Get discard pile count
     */
    getDiscardCount() {
        return this.discardPile.length;
    }

    /**
     * Get total cards dealt this game
     */
    getCardsDealt() {
        return this.cardsDealt;
    }

    /**
     * Peek at next card without drawing it
     */
    peekNextCard() {
        if (this.deck.length === 0) return null;
        return this.deck[this.deck.length - 1];
    }

    /**
     * Get deck statistics
     */
    getDeckStats() {
        const stats = {
            remaining: this.deck.length,
            discarded: this.discardPile.length,
            dealt: this.cardsDealt,
            cardTypes: {
                number: 0,
                modifier: 0,
                action: 0
            }
        };

        // Count card types in remaining deck
        this.deck.forEach(card => {
            if (stats.cardTypes.hasOwnProperty(card.type)) {
                stats.cardTypes[card.type]++;
            }
        });

        return stats;
    }

    /**
     * Reset deck manager for new game
     */
    reset() {
        console.log('🔄 DeckManager: Resetting for new game');
        
        this.deck = [];
        this.discardPile = [];
        this.cardsDealt = 0;
        
        this.createNewDeck();
    }
}

// Create singleton instance
const deckManager = new DeckManager();
export default deckManager;