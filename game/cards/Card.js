/**
 * Card - Represents a card in the Flip 7 game
 */
class Card {
    constructor(type, value, display = null) {
        this.type = type; // 'number', 'modifier', 'action'
        this.value = value;
        this.display = display || this.getDefaultDisplay();
        this.id = `${type}_${value}_${Date.now()}_${Math.random()}`;
    }

    /**
     * Get default display text for the card
     * @returns {string} Display text
     */
    getDefaultDisplay() {
        switch (this.type) {
            case 'number':
                return this.value.toString();
                
            case 'modifier':
                if (this.value === 'x2') return '×2';
                if (this.value === 'second chance') return '💛';
                if (typeof this.value === 'number') return `+${this.value}`;
                return this.value;
                
            case 'action':
                if (this.value === 'freeze') return '❄️';
                if (this.value === 'flip3') return '🔄';
                return this.value;
                
            default:
                return '?';
        }
    }

    /**
     * Get CSS classes for this card
     * @returns {Array} CSS class names
     */
    getCSSClasses() {
        const classes = ['card', this.type];
        
        if (this.type === 'modifier' && this.value === 'second chance') {
            classes.push('second-chance');
        }
        
        if (this.type === 'action') {
            classes.push('action');
            if (this.value === 'freeze' || this.value === 'flip3') {
                classes.push('custom-image');
            }
        }
        
        return classes;
    }

    /**
     * Check if this card requires special handling
     * @returns {boolean}
     */
    requiresSpecialHandling() {
        return this.type === 'action' && (this.value === 'freeze' || this.value === 'flip3');
    }

    /**
     * Get the points value of this card
     * @returns {number}
     */
    getPointValue() {
        if (this.type === 'number') {
            return this.value;
        }
        if (this.type === 'modifier' && typeof this.value === 'number') {
            return this.value;
        }
        return 0;
    }

    /**
     * Clone this card
     * @returns {Card} A new card instance with same properties
     */
    clone() {
        return new Card(this.type, this.value, this.display);
    }

    /**
     * Get card data for serialization
     * @returns {object}
     */
    toJSON() {
        return {
            type: this.type,
            value: this.value,
            display: this.display
        };
    }

    /**
     * Create a card from JSON data
     * @param {object} data - Card data
     * @returns {Card}
     */
    static fromJSON(data) {
        return new Card(data.type, data.value, data.display);
    }
}

// Make available globally
window.Card = Card;