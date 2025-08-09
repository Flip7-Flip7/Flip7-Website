/**
 * Player - Represents a player in the Flip 7 game
 */
class Player {
    constructor(config = {}) {
        this.id = config.id || `player_${Date.now()}`;
        this.name = config.name || 'Player';
        this.isHuman = config.isHuman !== undefined ? config.isHuman : true;
        
        // Score tracking
        this.totalScore = 0;
        this.roundScore = 0;
        
        // Card collections
        this.numberCards = [];
        this.modifierCards = [];
        this.actionCards = [];
        this.uniqueNumbers = new Set();
        
        // Status
        this.status = 'waiting'; // waiting, active, stayed, busted, frozen, flip7
        this.hasSecondChance = false;
        
        // UI element reference
        this.elementId = config.elementId || this.id;
    }

    /**
     * Reset player for a new round
     */
    resetForNewRound() {
        this.roundScore = 0;
        this.numberCards = [];
        this.modifierCards = [];
        this.actionCards = [];
        this.uniqueNumbers.clear();
        this.status = 'waiting';
        this.hasSecondChance = false;
    }

    /**
     * Add a card to the player's hand
     * @param {Card} card - The card to add
     * @returns {object} Result of adding the card
     */
    addCard(card) {
        const result = {
            success: true,
            isDuplicate: false,
            isFlip7: false
        };

        switch (card.type) {
            case 'number':
                // Check for duplicate
                if (this.uniqueNumbers.has(card.value)) {
                    result.isDuplicate = true;
                    result.success = !this.hasSecondChance;
                }
                
                this.numberCards.push(card);
                this.uniqueNumbers.add(card.value);
                
                // Check for Flip 7
                if (this.uniqueNumbers.size === 7) {
                    result.isFlip7 = true;
                    this.status = 'flip7';
                }
                break;
                
            case 'modifier':
                this.modifierCards.push(card);
                if (card.value === 'second chance') {
                    this.hasSecondChance = true;
                }
                break;
                
            case 'action':
                this.actionCards.push(card);
                break;
        }

        return result;
    }

    /**
     * Remove a card from the player's hand
     * @param {Card} card - The card to remove
     */
    removeCard(card) {
        switch (card.type) {
            case 'number':
                const index = this.numberCards.findIndex(c => c.value === card.value);
                if (index !== -1) {
                    this.numberCards.splice(index, 1);
                    this.uniqueNumbers.delete(card.value);
                }
                break;
                
            case 'modifier':
                const modIndex = this.modifierCards.findIndex(c => c.value === card.value);
                if (modIndex !== -1) {
                    this.modifierCards.splice(modIndex, 1);
                }
                break;
                
            case 'action':
                const actionIndex = this.actionCards.findIndex(c => c.value === card.value);
                if (actionIndex !== -1) {
                    this.actionCards.splice(actionIndex, 1);
                }
                break;
        }
    }

    /**
     * Calculate the player's round score
     * @returns {number} The calculated score
     */
    calculateScore() {
        // Base score from number cards
        let score = this.numberCards.reduce((sum, card) => sum + card.value, 0);
        
        // Apply multipliers first
        const hasMultiplier = this.modifierCards.some(card => card.value === 'x2');
        if (hasMultiplier) {
            score *= 2;
        }
        
        // Add modifier bonuses
        this.modifierCards.forEach(card => {
            if (typeof card.value === 'number') {
                score += card.value;
            }
        });
        
        // Add Flip 7 bonus
        if (this.uniqueNumbers.size === 7) {
            score += 15;
        }
        
        this.roundScore = score;
        return score;
    }

    /**
     * Check if player can play (not busted, stayed, or frozen)
     * @returns {boolean}
     */
    canPlay() {
        return this.status === 'active';
    }

    /**
     * Get all cards in hand
     * @returns {Array} All cards
     */
    getAllCards() {
        return [...this.numberCards, ...this.modifierCards, ...this.actionCards];
    }

    /**
     * Get player state for saving/logging
     * @returns {object} Player state
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            isHuman: this.isHuman,
            totalScore: this.totalScore,
            roundScore: this.roundScore,
            numberCards: this.numberCards.length,
            uniqueNumbers: this.uniqueNumbers.size,
            modifierCards: this.modifierCards.length,
            actionCards: this.actionCards.length,
            status: this.status,
            hasSecondChance: this.hasSecondChance
        };
    }
}