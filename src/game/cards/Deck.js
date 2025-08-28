/**
 * Deck - Manages the deck of cards in Flip 7
 */
class Deck {
    constructor() {
        this.cards = [];
        this.discardPile = [];
        this.initialize();
    }

    /**
     * Initialize a fresh deck with all cards
     */
    initialize() {
        this.cards = [];
        this.discardPile = [];
        
        // Add number cards (0-12) - multiple copies of each
        const numberCardCounts = {
            0: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
            6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12
        };
        
        for (const [value, count] of Object.entries(numberCardCounts)) {
            for (let i = 0; i < count; i++) {
                this.cards.push(new Card('number', parseInt(value)));
            }
        }
        
        // Add modifier cards
        const modifierCards = [
            { value: 2, count: 1 },      // +2
            { value: 4, count: 1 },      // +4
            { value: 6, count: 1 },      // +6
            { value: 8, count: 1 },      // +8
            { value: 10, count: 1 },     // +10
            { value: 'x2', count: 1 },   // ×2
        ];
        
        modifierCards.forEach(({ value, count }) => {
            for (let i = 0; i < count; i++) {
                this.cards.push(new Card('modifier', value));
            }
        });
        
        // Add action cards
        const actionCards = [
            { value: 'freeze', count: 3 },
            { value: 'flip3', count: 3 },
            { value: 'second chance', count: 3 } // Second Chance
        ];
        
        actionCards.forEach(({ value, count }) => {
            for (let i = 0; i < count; i++) {
                this.cards.push(new Card('action', value));
            }
        });
        
        this.shuffle();
    }

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Draw a card from the deck
     * @returns {Card|null} The drawn card or null if deck is empty
     */
    draw() {
        if (this.cards.length === 0) {
            this.reshuffleDiscardPile();
        }
        
        if (this.cards.length === 0) {
            console.warn('Deck is empty and no cards in discard pile!');
            return null;
        }
        
        return this.cards.pop();
    }

    /**
     * Add a card to the discard pile
     * @param {Card} card - The card to discard
     */
    discard(card) {
        if (card) {
            this.discardPile.push(card);
        }
    }

    /**
     * Reshuffle the discard pile back into the deck
     */
    reshuffleDiscardPile() {
        if (this.discardPile.length === 0) return;
        
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
        
        gameEventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
            type: 'deckReshuffled',
            cardsRemaining: this.cards.length
        });
    }

    /**
     * Get the number of cards remaining in the deck
     * @returns {number}
     */
    getCardsRemaining() {
        return this.cards.length;
    }

    /**
     * Get the number of cards in the discard pile
     * @returns {number}
     */
    getDiscardCount() {
        return this.discardPile.length;
    }

    /**
     * Peek at the top card without removing it
     * @returns {Card|null}
     */
    peek() {
        if (this.cards.length === 0) return null;
        return this.cards[this.cards.length - 1];
    }

    /**
     * Get deck statistics
     * @returns {object}
     */
    getStats() {
        const stats = {
            totalCards: this.cards.length + this.discardPile.length,
            deckSize: this.cards.length,
            discardSize: this.discardPile.length,
            cardTypes: {
                number: 0,
                modifier: 0,
                action: 0
            }
        };
        
        // Count cards by type in deck
        this.cards.forEach(card => {
            stats.cardTypes[card.type]++;
        });
        
        return stats;
    }

    /**
     * Reset the deck for a new game
     */
    reset() {
        this.initialize();
    }
}

// Make available globally
window.Deck = Deck;