/**
 * CardManager - Handles all card operations in the game
 * Deals with drawing, dealing, discarding, and special card actions
 */
class CardManager {
    constructor(deck, eventBus) {
        this.deck = deck;
        this.eventBus = eventBus;
        this.animationQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Deal initial cards to all players
     * @param {Array<Player>} players - Array of players
     * @param {boolean} animate - Whether to animate the dealing
     */
    async dealInitialCards(players, animate = true) {
        console.log('CardManager: Dealing initial cards to players');
        
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const card = this.deck.draw();
            
            if (card) {
                // Add card to player
                const result = player.addCard(card);
                
                // Emit event for UI update
                this.eventBus.emit(GameEvents.CARD_DEALT, {
                    card: card,
                    playerId: player.id,
                    playerIndex: i,
                    isInitialDeal: true,
                    animate: animate
                });
                
                // Add delay between cards if animating
                if (animate) {
                    await this.delay(500);
                }
            }
        }
        
        console.log('CardManager: Initial cards dealt');
    }

    /**
     * Draw a card for a player
     * @param {Player} player - The player drawing the card
     * @returns {Object} Result of the draw
     */
    drawCardForPlayer(player) {
        const card = this.deck.draw();
        
        if (!card) {
            console.error('CardManager: No cards left in deck!');
            return { success: false, reason: 'empty_deck' };
        }
        
        // Check if it's a special action card
        if (card.requiresSpecialHandling()) {
            return {
                success: true,
                card: card,
                requiresAction: true,
                actionType: card.value
            };
        }
        
        // Add card to player
        const result = player.addCard(card);
        
        // Handle duplicate number
        if (result.isDuplicate && !player.hasSecondChance) {
            // Player busts
            return {
                success: false,
                reason: 'bust',
                card: card,
                isDuplicate: true
            };
        }
        
        // Handle second chance activation
        if (result.isDuplicate && player.hasSecondChance) {
            player.hasSecondChance = false;
            this.eventBus.emit(GameEvents.SECOND_CHANCE_ACTIVATED, {
                player: player,
                card: card
            });
        }
        
        // Check for Flip 7
        if (result.isFlip7) {
            this.eventBus.emit(GameEvents.PLAYER_FLIP7, {
                player: player
            });
        }
        
        return {
            success: true,
            card: card,
            isDuplicate: result.isDuplicate,
            isFlip7: result.isFlip7
        };
    }

    /**
     * Handle special action card (Freeze or Flip3)
     * @param {Card} card - The action card
     * @param {Player} sourcePlayer - Player who drew the card
     * @param {Player} targetPlayer - Target player for the action
     */
    async handleActionCard(card, sourcePlayer, targetPlayer) {
        if (card.value === 'freeze') {
            return this.handleFreezeCard(sourcePlayer, targetPlayer);
        } else if (card.value === 'flip3') {
            return this.handleFlip3Card(sourcePlayer, targetPlayer);
        }
    }

    /**
     * Handle Freeze card action
     * @param {Player} sourcePlayer - Player using the card
     * @param {Player} targetPlayer - Player being frozen
     */
    handleFreezeCard(sourcePlayer, targetPlayer) {
        targetPlayer.status = 'frozen';
        
        this.eventBus.emit(GameEvents.FREEZE_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });
        
        return {
            success: true,
            message: `${sourcePlayer.name} froze ${targetPlayer.name}!`
        };
    }

    /**
     * Handle Flip3 card action
     * @param {Player} sourcePlayer - Player using the card
     * @param {Player} targetPlayer - Player who must draw 3 cards
     */
    async handleFlip3Card(sourcePlayer, targetPlayer) {
        this.eventBus.emit(GameEvents.FLIP3_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });
        
        const cardsToFlip = [];
        let bustOnCard = null;
        
        // Draw 3 cards (or until bust)
        for (let i = 0; i < 3; i++) {
            const card = this.deck.draw();
            if (!card) break;
            
            cardsToFlip.push(card);
            
            // Check if this card would cause a bust
            if (card.type === 'number' && targetPlayer.uniqueNumbers.has(card.value) && !targetPlayer.hasSecondChance) {
                bustOnCard = i + 1;
                break;
            }
        }
        
        return {
            success: true,
            cards: cardsToFlip,
            bustOnCard: bustOnCard,
            message: `${sourcePlayer.name} used Flip3 on ${targetPlayer.name}!`
        };
    }

    /**
     * Discard multiple cards
     * @param {Array<Card>} cards - Cards to discard
     */
    discardCards(cards) {
        cards.forEach(card => this.deck.discard(card));
    }

    /**
     * Get deck statistics
     * @returns {Object}
     */
    getDeckStats() {
        return this.deck.getStats();
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Make available globally
window.CardManager = CardManager;