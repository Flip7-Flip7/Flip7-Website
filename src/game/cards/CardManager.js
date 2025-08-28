/**
 * CardManager - Handles all card operations in the game
 * Deals with drawing, dealing, discarding, and special card actions
 */
class CardManager {
    constructor(deck, eventBus, players = []) {
        this.deck = deck;
        this.eventBus = eventBus;
        this.players = players;
    }
    
    /**
     * Update players reference
     * @param {Array<Player>} players - Current players
     */
    setPlayers(players) {
        this.players = players;
    }

    /**
     * Deal initial cards to all players
     * @param {Array<Player>} players - Array of players
     */
    async dealInitialCards(players) {
        console.log('CardManager: Starting initial deal to players');
        
        this.eventBus.emit(GameEvents.INITIAL_DEAL_START, {
            players: players.map(p => ({ id: p.id, name: p.name, status: p.status }))
        });
        
        // Deal one card to each active player, handling action cards immediately
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            
            // Skip frozen or busted players during initial deal
            if (player.status !== 'active') {
                console.log(`CardManager: Skipping ${player.name} (status: ${player.status}) during initial deal`);
                continue;
            }
            
            const card = this.deck.draw();
            if (!card) {
                console.error('CardManager: Ran out of cards during initial deal!');
                break;
            }
            
            console.log(`CardManager: Dealing ${card.type}:${card.value} to ${player.name}`);
            
            // Add card to player (handles Second Chance automatically)
            const result = player.addCard(card);
            
            // Emit card dealt event
            this.eventBus.emit(GameEvents.CARD_DEALT, {
                card: card,
                playerId: player.id,
                playerIndex: i,
                isInitialDeal: true
            });
            
            // Check if this card requires immediate action (Freeze/Flip3)
            if (card.type === 'action' && (card.value === 'freeze' || card.value === 'flip3')) {
                console.log(`CardManager: Action card ${card.value} drawn during initial deal by ${player.name} - pausing deal`);
                
                this.eventBus.emit(GameEvents.INITIAL_DEAL_PAUSED, {
                    pausedPlayer: player,
                    actionCard: card,
                    currentPlayerIndex: i,
                    remainingPlayers: players.slice(i + 1).filter(p => p.status === 'active')
                });
                
                this.eventBus.emit(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, {
                    card: card,
                    sourcePlayer: player,
                    availableTargets: this.getActivePlayersForAction(players, player, card),
                    isInitialDeal: true
                });
                
                // Wait for action to be resolved before continuing
                await this.waitForActionResolution();
                
                console.log(`CardManager: Action resolved, resuming initial deal from player ${i + 1}`);
                this.eventBus.emit(GameEvents.INITIAL_DEAL_RESUMED, {
                    resumingPlayerIndex: i + 1
                });
            }
        }
        
        console.log('CardManager: Initial deal complete');
        this.eventBus.emit(GameEvents.INITIAL_DEAL_COMPLETE, {
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                cardCount: p.numberCards.length + p.actionCards.length + p.modifierCards.length
            }))
        });
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
        
        // Handle Second Chance cards specially - add to hand or auto-give away
        if (card.type === 'action' && card.value === 'second chance') {
            return this.handleSecondChanceCard(player, card);
        }
        
        // Check if it's other action cards (Freeze/Flip3) - use immediately
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
        // Emit dealt to keep UI consistent for non-action draws
        this.eventBus.emit(GameEvents.CARD_DRAWN, {
            card: card,
            playerId: player.id,
            isInitialDeal: false
        });
        
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
            // Find and remove the Second Chance card from hand
            const secondChanceCard = player.actionCards.find(c => c.value === 'second chance');
            if (secondChanceCard) {
                player.removeCard(secondChanceCard);
                // Discard both the Second Chance card and the duplicate card that triggered it
                this.discardCards([secondChanceCard, card]);
            }
            
            this.eventBus.emit(GameEvents.SECOND_CHANCE_ACTIVATED, {
                player: player,
                card: card,
                secondChanceCard: secondChanceCard,
                discardedCards: [secondChanceCard, card]
            });
            
            // Return special result for Second Chance usage
            return {
                success: true,
                card: card,
                secondChanceUsed: true,
                secondChanceCard: secondChanceCard,
                isDuplicate: true
            };
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
     * Handle Second Chance card logic
     * @param {Player} player - Player who drew the card
     * @param {Card} card - Second Chance card
     * @returns {Object} Result
     */
    handleSecondChanceCard(player, card) {
        // If player doesn't have Second Chance, add it to their hand
        if (!player.hasSecondChance) {
            player.addCard(card);
            player.hasSecondChance = true;
            
            this.eventBus.emit(GameEvents.CARD_DRAWN, {
                card: card,
                playerId: player.id,
                isInitialDeal: false
            });
            
            this.eventBus.emit(GameEvents.SECOND_CHANCE_ACQUIRED, {
                player: player
            });
            
            return {
                success: true,
                card: card,
                addedToHand: true
            };
        }
        
        // Player already has Second Chance - must give to another active player without Second Chance
        const eligibleRecipients = this.getEligibleSecondChanceRecipients(player);
        if (eligibleRecipients.length === 0) {
            // No eligible recipients - discard it
            this.discardCards([card]);
            return {
                success: true,
                card: card,
                discarded: true
            };
        }
        
        // Auto-select recipient (prefer player with lowest total score)
        const recipient = eligibleRecipients.sort((a, b) => a.totalScore - b.totalScore)[0];
        recipient.addCard(card);
        recipient.hasSecondChance = true;
        
        this.eventBus.emit(GameEvents.SECOND_CHANCE_GIVEN, {
            giver: player,
            recipient: recipient,
            card: card
        });
        
        return {
            success: true,
            card: card,
            givenTo: recipient.id
        };
    }
    
    /**
     * Get active players excluding the specified player
     * @param {Player} excludePlayer - Player to exclude
     * @returns {Array<Player>} Active players
     */
    getActivePlayers(excludePlayer) {
        return this.players.filter(p => 
            p.id !== excludePlayer.id && 
            p.status === 'active'
        );
    }
    
    /**
     * Get eligible Second Chance recipients (active players without Second Chance)
     * @param {Player} excludePlayer - Player to exclude
     * @returns {Array<Player>} Eligible recipients
     */
    getEligibleSecondChanceRecipients(excludePlayer) {
        return this.players.filter(p => 
            p.id !== excludePlayer.id && 
            p.status === 'active' &&
            !p.hasSecondChance
        );
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
        console.log(`CardManager: Handling freeze card - ${sourcePlayer.name} freezing ${targetPlayer.name}`);
        targetPlayer.status = 'frozen';
        
        console.log('CardManager: About to emit FREEZE_CARD_USED event');
        this.eventBus.emit(GameEvents.FREEZE_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });
        console.log('CardManager: FREEZE_CARD_USED event emitted');
        
        return {
            success: true,
            message: `${sourcePlayer.name} froze ${targetPlayer.name}!`
        };
    }

    /**
     * Handle Flip3 card action - draw cards until bust or 3 cards dealt
     * @param {Player} sourcePlayer - Player using the card
     * @param {Player} targetPlayer - Player who must draw 3 cards
     */
    async handleFlip3Card(sourcePlayer, targetPlayer) {
        this.eventBus.emit(GameEvents.FLIP3_CARD_USED, {
            sourcePlayer: sourcePlayer,
            targetPlayer: targetPlayer
        });
        
        const dealtCards = [];
        const actionCards = [];
        let bustOnCard = null;
        
        // Draw cards one by one, stopping at bust or 3 cards
        for (let i = 0; i < 3; i++) {
            const card = this.deck.draw();
            if (!card) break;
            
            // Check if this card would cause a bust BEFORE adding it
            if (card.type === 'number' && targetPlayer.uniqueNumbers.has(card.value) && !targetPlayer.hasSecondChance) {
                bustOnCard = i + 1;
                // Put the bust card back on top of deck (it wasn't dealt)
                this.deck.cards.push(card);
                break;
            }
            
            // Card is dealt - add to dealt cards
            dealtCards.push(card);
            
            // Separate action cards for later processing
            if (card.type === 'action') {
                actionCards.push(card);
            }
        }
        
        return {
            success: true,
            dealtCards: dealtCards,
            actionCards: actionCards,
            bustOnCard: bustOnCard,
            message: `${sourcePlayer.name} used Flip3 on ${targetPlayer.name}! ${dealtCards.length} cards dealt.`
        };
    }

    /**
     * Get active players for action card targeting
     * @param {Array<Player>} allPlayers - All players in game
     * @param {Player} sourcePlayer - Player using the action card
     * @param {Card} actionCard - The action card being used
     * @returns {Array<Player>} Available targets
     */
    getActivePlayersForAction(allPlayers, sourcePlayer, actionCard) {
        // For Freeze and Flip3, can target any active player (including self)
        return allPlayers.filter(p => p.status === 'active');
    }
    
    /**
     * Wait for action card resolution during initial deal
     * @returns {Promise} Promise that resolves when action is complete
     */
    async waitForActionResolution() {
        console.log('CardManager: Setting up waitForActionResolution promise...');
        return new Promise((resolve) => {
            // Set up a one-time listener for action completion
            const handleActionComplete = (eventData) => {
                console.log('CardManager: Action completed, resolving waitForActionResolution promise', eventData);
                this.eventBus.off(GameEvents.ACTION_CARD_TARGET_SELECTED, handleActionComplete);
                this.eventBus.off(GameEvents.FREEZE_CARD_USED, handleActionComplete);
                this.eventBus.off(GameEvents.FLIP3_CARD_USED, handleActionComplete);
                resolve();
            };
            
            console.log('CardManager: Setting up event listeners for action resolution...');
            this.eventBus.on(GameEvents.ACTION_CARD_TARGET_SELECTED, handleActionComplete);
            this.eventBus.on(GameEvents.FREEZE_CARD_USED, handleActionComplete);
            this.eventBus.on(GameEvents.FLIP3_CARD_USED, handleActionComplete);
        });
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