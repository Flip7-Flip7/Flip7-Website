// Player.js - Player state and methods

export class Player {
    constructor(id, name, isHuman = false, playstyle = null) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.playstyle = playstyle; // 'aggressive', 'conservative', 'middle', or null for human
        
        // Score tracking
        this.totalScore = 0;
        this.roundScore = 0;
        
        // Cards
        this.numberCards = [];
        this.modifierCards = [];
        this.actionCards = [];
        this.uniqueNumbers = new Set();
        
        // Status
        this.status = 'waiting'; // waiting, active, stayed, busted, frozen, flip7
        this.hasSecondChance = false;
        this.isFrozen = false;
    }

    /**
     * Reset player for new round
     */
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

    /**
     * Add card to player's hand
     */
    addCard(card) {
        if (card.type === 'number') {
            this.numberCards.push(card);
            this.uniqueNumbers.add(card.value);
            this.numberCards.sort((a, b) => a.value - b.value);
        } else if (card.type === 'modifier') {
            this.modifierCards.push(card);
        } else if (card.type === 'action') {
            // Always add action cards to hand first
            this.actionCards.push(card);
            
            // Second Chance logic will be handled by GameEngine after card is in hand
        }
    }

    /**
     * Check if player has duplicate number
     */
    hasDuplicate(value) {
        return this.uniqueNumbers.has(value);
    }

    /**
     * Check if a card would be a duplicate against player's hand
     */
    wouldBeDuplicate(card) {
        if (card.type !== 'number') return false;
        return this.hasDuplicate(card.value);
    }

    /**
     * Check if a card would be a duplicate against a list of cards
     */
    checkDuplicateAgainstCards(card, cardList) {
        if (card.type !== 'number') return false;
        
        // Check against existing hand
        if (this.hasDuplicate(card.value)) return true;
        
        // Check against provided card list
        return cardList.some(existingCard => 
            existingCard.type === 'number' && existingCard.value === card.value
        );
    }

    /**
     * Check if player achieved Flip 7
     */
    hasFlip7() {
        return this.uniqueNumbers.size === 7;
    }

    /**
     * Get card count
     */
    getCardCount() {
        return this.numberCards.length + this.modifierCards.length + this.actionCards.length;
    }

    /**
     * Calculate current round score
     */
    calculateRoundScore() {
        if (this.status === 'busted') {
            this.roundScore = 0;
            return 0;
        }

        let score = 0;
        
        // Sum all number cards
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
        
        if (hasX2) {
            score *= 2;
        }
        
        score += bonusPoints;
        
        // Add Flip 7 bonus
        if (this.hasFlip7()) {
            score += 15;
        }
        
        this.roundScore = score;
        return score;
    }

    /**
     * Set player as busted
     */
    bust() {
        this.status = 'busted';
        this.roundScore = 0;
    }

    /**
     * Set player as stayed
     */
    stay() {
        this.status = 'stayed';
        this.calculateRoundScore();
    }

    /**
     * Set player as frozen
     */
    freeze() {
        this.status = 'stayed'; // Frozen players have same game status as stayed players
        this.isFrozen = true;    // But keep frozen flag for visual effects
        // Always calculate score to lock in current points
        this.calculateRoundScore();
    }

    /**
     * Give second chance to player
     */
    giveSecondChance() {
        this.hasSecondChance = true;
        console.log(`✨ ${this.name} received a Second Chance!`);
    }

    /**
     * Use second chance
     */
    useSecondChance() {
        if (!this.hasSecondChance) return false;
        
        this.hasSecondChance = false;
        // Remove second chance card from action cards
        this.actionCards = this.actionCards.filter(card => card.value !== 'second_chance');
        
        return true;
    }

    /**
     * Remove duplicate card
     */
    removeDuplicateCard(value) {
        // Find and remove the last card with this value
        for (let i = this.numberCards.length - 1; i >= 0; i--) {
            if (this.numberCards[i].value === value) {
                this.numberCards.splice(i, 1);
                break;
            }
        }
        
        // Re-sort cards
        this.numberCards.sort((a, b) => a.value - b.value);
    }

    /**
     * Add to total score
     */
    addToTotalScore() {
        this.totalScore += this.roundScore;
    }

    /**
     * Get player state for serialization
     */
    getState() {
        return {
            id: this.id,
            name: this.name,
            isHuman: this.isHuman,
            totalScore: this.totalScore,
            roundScore: this.roundScore,
            numberCards: [...this.numberCards],
            modifierCards: [...this.modifierCards],
            actionCards: [...this.actionCards],
            uniqueNumbers: Array.from(this.uniqueNumbers),
            status: this.status,
            hasSecondChance: this.hasSecondChance,
            isFrozen: this.isFrozen
        };
    }

    /**
     * Restore player state from serialization
     */
    setState(state) {
        this.totalScore = state.totalScore;
        this.roundScore = state.roundScore;
        this.numberCards = [...state.numberCards];
        this.modifierCards = [...state.modifierCards];
        this.actionCards = [...state.actionCards];
        this.uniqueNumbers = new Set(state.uniqueNumbers);
        this.status = state.status;
        this.hasSecondChance = state.hasSecondChance;
        this.isFrozen = state.isFrozen;
    }
}

export default Player;