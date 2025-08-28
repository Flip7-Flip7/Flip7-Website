/**
 * Card - Represents a card in the Flip 7 game
 */
class Card {
    constructor(type, value, display = null) {
        this.type = type; // 'number', 'modifier', 'action'
        this.value = value;
        this.id = `${type}_${value}_${Date.now()}_${Math.random()}`;
    }


    /**
     * Check if this card requires special targeting (not Second Chance)
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
     * Whether this card has a custom image available
     */
    hasImage() {
        if (this.type === 'number') {
            return [0,1,2,3,4,5,6,7,8,9,10,11,12].includes(this.value);
        }
        if (this.type === 'modifier') {
            return [2,4,6,8,10,'x2'].includes(this.value);
        }
        if (this.type === 'action') {
            return ['freeze','flip3','second chance'].includes(this.value);
        }
        return false;
    }

    /**
     * Map to image file name
     */
    getImageName() {
        if (!this.hasImage()) return null;
        if (this.type === 'number') {
            return `card-${this.value}.png`;
        }
        if (this.type === 'modifier') {
            if (this.value === 'x2') return 'card-*2.png';
            if (typeof this.value === 'number') return `card-+${this.value}.png`;
        }
        if (this.type === 'action') {
            if (this.value === 'flip3') return 'card-Flip3.png';
            if (this.value === 'freeze') return 'card-Freeze.png';
            if (this.value === 'second chance') return 'card-SecondChance.png';
        }
        return null;
    }

    /**
     * Create a DOM element for this card (image-first)
     */
    toElement() {
        const div = document.createElement('div');
        div.className = `card ${this.type}`;
        const imageName = this.getImageName();
        if (imageName) {
            div.classList.add('custom-image');
            div.style.backgroundImage = `url('./images/${imageName}')`;
            div.style.backgroundSize = 'cover';
            div.style.backgroundPosition = 'center';
            return div;
        }
        const span = document.createElement('span');
        span.textContent = String(this.value);
        div.appendChild(span);
        return div;
    }

    /**
     * Clone this card
     * @returns {Card} A new card instance with same properties
     */
    clone() {
        return new Card(this.type, this.value);
    }

    /**
     * Get card data for serialization
     * @returns {object}
     */
    toJSON() {
        return {
            type: this.type,
            value: this.value
        };
    }

    /**
     * Create a card from JSON data
     * @param {object} data - Card data
     * @returns {Card}
     */
    static fromJSON(data) {
        return new Card(data.type, data.value);
    }
}

// Make available globally
window.Card = Card;