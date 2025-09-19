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
     * @param {number} dealerIndex - Index of the dealer (to determine starting player)
     */
    async dealInitialCards(players, dealerIndex = 0) {
        console.log('CardManager: Starting initial deal to players');
        
        this.eventBus.emit(GameEvents.INITIAL_DEAL_START, {
            players: players.map(p => ({ id: p.id, name: p.name, status: p.status }))
        });
        
        // Deal one card to each active player sequentially starting with player after dealer
        const startingPlayerIndex = (dealerIndex + 1) % players.length;
        console.log(`CardManager: Initial deal starting with player ${startingPlayerIndex} (${players[startingPlayerIndex]?.name}) after dealer ${dealerIndex}`);
        
        for (let round = 0; round < players.length; round++) {
            const playerIndex = (startingPlayerIndex + round) % players.length;
            const player = players[playerIndex];
            
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
                playerIndex: playerIndex,
                isInitialDeal: true
            });
            
            // Wait for animation to complete before dealing next card
            await new Promise(resolve => setTimeout(resolve, 1300)); // Wait for full animation
            
            // Check if the player busted on duplicate during initial deal
            if (result.isDuplicate && !player.hasSecondChance) {
                console.log(`CardManager: ${player.name} busted on duplicate ${card.value} during initial deal`);
                player.status = 'busted';
                player.roundScore = 0;
                this.eventBus.emit(GameEvents.PLAYER_BUST, {
                    player: player,
                    card: card
                });
                // Continue dealing to other players
                continue;
            }
            
            // Check if this card requires immediate action (Freeze/Flip3/Second Chance)
            if (card.type === 'action') {
                console.log(`CardManager: Action card ${card.value} drawn during initial deal by ${player.name}`);

                // For action cards during initial deal, emit event for ActionCardHandler
                if (card.value === 'freeze' || card.value === 'flip3') {
                    console.log(`CardManager: Action card requires immediate use - pausing deal`);

                    // Set up action resolution promise BEFORE emitting events
                    const actionResolutionPromise = this.waitForActionResolution();

                    this.eventBus.emit(GameEvents.INITIAL_DEAL_PAUSED, {
                        pausedPlayer: player,
                        actionCard: card,
                        currentPlayerIndex: playerIndex,
                        remainingPlayers: players.slice(playerIndex + 1).filter(p => p.status === 'active')
                    });

                    this.eventBus.emit(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, {
                        card: card,
                        sourcePlayer: player,
                        isInitialDeal: true
                    });

                    // Wait for action to be resolved before continuing
                    await actionResolutionPromise;

                    console.log(`CardManager: Action resolved, continuing initial deal from player ${round + 1}`);
                    this.eventBus.emit(GameEvents.INITIAL_DEAL_RESUMED, {
                        resumingPlayerIndex: round + 1
                    });
                } else if (card.value === 'second chance') {
                    // Second Chance doesn't pause dealing but needs processing
                    this.eventBus.emit(GameEvents.INITIAL_DEAL_ACTION_REQUIRED, {
                        card: card,
                        sourcePlayer: player,
                        isInitialDeal: true
                    });
                }
            }
        }
        
        console.log('CardManager: Initial deal complete');
        
        // Check if Flip3 animation is active before emitting completion
        const displayManager = window.Flip7?.display;
        if (displayManager?.isFlip3Active()) {
            console.log('CardManager: Waiting for Flip3 animation to complete before emitting INITIAL_DEAL_COMPLETE');
            
            // Wait for Flip3 to complete
            const flip3CompleteHandler = (data) => {
                console.log('CardManager: Flip3 completed, now emitting INITIAL_DEAL_COMPLETE');
                this.eventBus.off(GameEvents.FLIP3_ANIMATION_COMPLETE, flip3CompleteHandler);
                
                this.eventBus.emit(GameEvents.INITIAL_DEAL_COMPLETE, {
                    players: players.map(p => ({
                        id: p.id,
                        name: p.name,
                        status: p.status,
                        cardCount: p.numberCards.length + p.actionCards.length + p.modifierCards.length
                    }))
                });
            };
            
            this.eventBus.on(GameEvents.FLIP3_ANIMATION_COMPLETE, flip3CompleteHandler);
        } else {
            // No Flip3 active, emit immediately
            this.eventBus.emit(GameEvents.INITIAL_DEAL_COMPLETE, {
                players: players.map(p => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    cardCount: p.numberCards.length + p.actionCards.length + p.modifierCards.length
                }))
            });
        }
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

        // For action cards, add to hand first for visual display, then let ActionCardHandler handle logic
        if (card.type === 'action') {
            // Add card to player's hand
            player.addCard(card);

            // Emit CARD_DRAWN event to trigger animation
            this.eventBus.emit(GameEvents.CARD_DRAWN, {
                card: card,
                player: player,
                playerId: player.id,
                isInitialDeal: false
            });

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
            player: player,
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
                // Also remove the duplicate card that was just added to hand
                player.removeCard(card);
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
     * Draw multiple cards from deck
     * @param {number} count - Number of cards to draw
     * @returns {Array<Card>} Array of drawn cards
     */
    drawCards(count) {
        const cards = [];
        for (let i = 0; i < count; i++) {
            const card = this.deck.draw();
            if (!card) break;
            cards.push(card);
        }
        return cards;
    }

    /**
     * Transfer a Second Chance card between players
     * @param {Object} params
     * @param {Player|null} params.sourcePlayer - Player losing the card (optional)
     * @param {Player} params.targetPlayer - Player receiving the card
     * @param {Card} [params.card] - Specific card instance to transfer
     * @param {boolean} [params.emitUIRefresh=true] - Whether to trigger UI refresh events
     * @returns {Object} Transfer result
     */
    transferSecondChanceCard({ sourcePlayer = null, targetPlayer, card = null, emitUIRefresh = true } = {}) {
        if (!targetPlayer) {
            console.error('CardManager: transferSecondChanceCard called without target player');
            return { success: false };
        }

        let cardToTransfer = card;

        if (sourcePlayer) {
            // Ensure we remove exactly one instance from source when needed
            const actionCards = sourcePlayer.actionCards;
            if (cardToTransfer) {
                const index = actionCards.indexOf(cardToTransfer);
                if (index !== -1) {
                    actionCards.splice(index, 1);
                } else {
                    console.log(`CardManager: Provided Second Chance card already removed from ${sourcePlayer.name}`);
                }
            } else {
                const index = actionCards.findIndex(c => c.value === 'second chance');
                if (index !== -1) {
                    const [removedCard] = actionCards.splice(index, 1);
                    cardToTransfer = removedCard;
                } else {
                    console.warn(`CardManager: No Second Chance card found on ${sourcePlayer.name} to transfer`);
                }
            }

            sourcePlayer.hasSecondChance = actionCards.some(c => c.value === 'second chance');
        }

        if (!cardToTransfer) {
            console.warn('CardManager: Creating fallback Second Chance card for transfer');
            cardToTransfer = new Card('action', 'second chance');
        }

        if (!targetPlayer.actionCards.includes(cardToTransfer)) {
            targetPlayer.actionCards.push(cardToTransfer);
        }
        targetPlayer.hasSecondChance = true;

        this.eventBus.emit(GameEvents.SECOND_CHANCE_GIVEN, {
            giver: sourcePlayer,
            recipient: targetPlayer,
            card: cardToTransfer
        });

        if (emitUIRefresh) {
            if (sourcePlayer) {
                this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                    type: 'refreshPlayerCards',
                    playerId: sourcePlayer.id,
                    player: sourcePlayer
                });
            }
            this.eventBus.emit(GameEvents.UI_UPDATE_NEEDED, {
                type: 'refreshPlayerCards',
                playerId: targetPlayer.id,
                player: targetPlayer
            });
        }

        return {
            success: true,
            card: cardToTransfer,
            recipient: targetPlayer
        };
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
     * Wait for action card resolution during initial deal
     * @returns {Promise} Promise that resolves when action is complete
     */
    async waitForActionResolution() {
        console.log('CardManager: Setting up waitForActionResolution promise...');
        return new Promise((resolve) => {
            // Set up a one-time listener for action completion
            const handleActionComplete = (eventData) => {
                console.log('CardManager: Action completed, resolving waitForActionResolution promise', eventData);
                this.eventBus.off(GameEvents.FREEZE_CARD_USED, handleActionComplete);
                this.eventBus.off(GameEvents.FLIP3_ANIMATION_COMPLETE, handleActionComplete);
                this.eventBus.off(GameEvents.SECOND_CHANCE_ANIMATION_COMPLETE, handleActionComplete);
                resolve();
            };
            
            console.log('CardManager: Setting up event listeners for action resolution...');
            // For Freeze, wait for the card to be used
            this.eventBus.on(GameEvents.FREEZE_CARD_USED, handleActionComplete);
            // For Flip3, wait for the entire animation to complete
            this.eventBus.on(GameEvents.FLIP3_ANIMATION_COMPLETE, handleActionComplete);
            // For Second Chance, wait for animation to complete
            this.eventBus.on(GameEvents.SECOND_CHANCE_ANIMATION_COMPLETE, handleActionComplete);
        });
    }

    /**
     * Discard multiple cards
     * @param {Array<Card>} cards - Cards to discard
     */
    discardCards(cards) {
        if (!cards || cards.length === 0) return;
        cards.forEach(card => this.deck.discard(card));
        const after = this.deck.getDiscardCount();
        console.log(`[Discard Debug] +${cards.length} discarded → pile size ${after}`);
    }

}

// Make available globally
window.CardManager = CardManager;
