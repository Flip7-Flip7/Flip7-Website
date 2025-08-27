// GameEngine.js - Core game flow and state management

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';
import { Player } from './Player.js';
import scoringEngine from '../rules/ScoringEngine.js';
import deckManager from '../deck/DeckManager.js';

export class GameEngine {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.roundNumber = 1;
        this.gameActive = false;
        this.winningScore = 200;
        this.isInitialDealing = false;
        this.currentDealIndex = 0;
        this.isStartingNewRound = false;
        this.isWaitingForTargeting = false;
        this.pendingActionCard = null;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for game engine
     */
    setupEventListeners() {
        eventBus.on(GameEvents.NEW_GAME_REQUESTED, () => this.startNewGame());
        eventBus.on(GameEvents.PLAYER_ACTION_HIT, () => this.handlePlayerHit());
        eventBus.on(GameEvents.PLAYER_ACTION_STAY, () => this.handlePlayerStay());
        eventBus.on(GameEvents.ROUND_SCORE_CALCULATED, () => this.checkForGameWinner());
        
        // AI action events
        eventBus.on(GameEvents.AI_ACTION_TAKEN, (data) => this.handleAIAction(data));
        
        // Targeting system events
        eventBus.on(GameEvents.ACTION_CARD_AWAITING_TARGET, (data) => this.handleActionCardTargeting(data));
        eventBus.on(GameEvents.PLAYER_TAPPED_FOR_TARGET, (data) => this.handleTargetSelected(data));
        eventBus.on(GameEvents.ACTION_CARD_TARGETING_CANCELLED, (data) => this.handleTargetingCancelled(data));
    }

    /**
     * Initialize players for new game
     */
    initializePlayers() {
        this.players = [
            new Player('player', 'You', true),
            new Player('opponent1', 'AI Bot 1', false),
            new Player('opponent2', 'AI Bot 2', false),
            new Player('opponent3', 'AI Bot 3', false)
        ];

        // Make game state globally accessible
        window.gameState = {
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            roundNumber: this.roundNumber,
            deck: deckManager.deck,
            isStartingNewRound: this.isStartingNewRound
        };
    }

    /**
     * Start a new game
     */
    startNewGame() {
        console.log('🎮 GameEngine: Starting new game');
        
        this.gameActive = true;
        this.roundNumber = 1;
        this.dealerIndex = 0;
        
        this.initializePlayers();
        
        // Reset all player scores
        this.players.forEach(player => {
            player.totalScore = 0;
            player.status = 'waiting';
        });

        eventBus.emit(GameEvents.GAME_STARTED, {
            players: this.players,
            roundNumber: this.roundNumber
        });

        // Update deck reference after GAME_STARTED (deck gets created)
        setTimeout(() => {
            window.gameState.deck = deckManager.deck;
        }, 100);

        // Start first round
        this.startNewRound();
    }

    /**
     * Start a new round
     */
    startNewRound() {
        console.log('🎲 GameEngine: Starting new round');
        
        this.isStartingNewRound = true;
        this.currentPlayerIndex = this.dealerIndex; // Start with dealer
        
        // Reset players for new round
        this.players.forEach(player => {
            player.resetForNewRound();
        });

        // Prepare deck for new round
        deckManager.prepareForRound();

        eventBus.emit(GameEvents.ROUND_STARTED, {
            roundNumber: this.roundNumber,
            dealer: this.players[this.dealerIndex]
        });

        // Update global game state
        window.gameState.currentPlayerIndex = this.currentPlayerIndex;
        window.gameState.roundNumber = this.roundNumber;
        window.gameState.isStartingNewRound = this.isStartingNewRound;
        
        // Trigger display update after round start
        eventBus.emit(GameEvents.DISPLAY_UPDATE_REQUIRED);

        // Start dealing initial cards after delay
        setTimeout(() => {
            this.dealInitialCards();
            this.isStartingNewRound = false;
            window.gameState.isStartingNewRound = false;
        }, 500);
    }

    /**
     * Deal initial cards to all players
     */
    dealInitialCards() {
        console.log('🎰 GameEngine: Starting initial deal');
        
        this.isInitialDealing = true;
        this.currentDealIndex = 0; // Start with human player
        
        const dealNextCard = () => {
            if (this.currentDealIndex >= this.players.length) {
                // Initial dealing complete
                this.isInitialDealing = false;
                this.currentPlayerIndex = -1; // Set to -1 so nextTurn() advances to 0 (human)
                
                // Update display after initial cards dealt
                eventBus.emit(GameEvents.DISPLAY_UPDATE_REQUIRED);
                
                // Check if human player can act or if we need to skip to next
                this.nextTurn();
                return;
            }

            const player = this.players[this.currentDealIndex];
            
            // Skip frozen or busted players during initial deal
            if (player.status === 'frozen' || player.status === 'busted') {
                this.currentDealIndex++;
                setTimeout(dealNextCard, 300);
                return;
            }

            const card = deckManager.drawCard();
            
            eventBus.emit(GameEvents.CARD_DRAWN, {
                card: card,
                playerId: player.id,
                isInitialDeal: true
            });

            // Handle the card
            const result = this.handleCardDraw(player, card);
            
            if (result.waitingForAction) {
                // Action card - wait for completion before continuing
                eventBus.once(GameEvents.SPECIAL_ACTION_COMPLETED, () => {
                    this.currentDealIndex++;
                    setTimeout(dealNextCard, 600);
                });
            } else {
                // Normal card - continue immediately
                this.currentDealIndex++;
                setTimeout(dealNextCard, 600);
            }
        };

        dealNextCard();
    }

    /**
     * Handle a card being drawn by a player
     */
    handleCardDraw(player, card) {
        const result = { waitingForAction: false, busted: false, endTurn: false };

        if (card.type === 'number') {
            // Check for duplicate
            if (player.hasDuplicate(card.value)) {
                if (player.hasSecondChance) {
                    player.useSecondChance();
                    player.removeDuplicateCard(card.value);
                    player.addCard(card);
                    
                    eventBus.emit(GameEvents.SECOND_CHANCE_USED, {
                        playerId: player.id,
                        card: card
                    });
                } else {
                    player.bust();
                    result.busted = true;
                    result.endTurn = true;
                    
                    eventBus.emit(GameEvents.PLAYER_BUSTED, {
                        playerId: player.id,
                        card: card
                    });
                }
            } else {
                player.addCard(card);
                
                // Check for Flip 7
                if (player.hasFlip7()) {
                    player.status = 'flip7';
                    result.endTurn = true;
                    
                    eventBus.emit(GameEvents.FLIP7_ACHIEVED, {
                        playerId: player.id
                    });
                }
            }
        } else if (card.type === 'modifier') {
            player.addCard(card);
        } else if (card.type === 'action') {
            player.addCard(card);
            result.waitingForAction = true;
            
            // Handle action card logic
            this.handleActionCardLogic(player, card);
        }

        // Update score
        const score = scoringEngine.calculateRoundScore(player);
        player.roundScore = score;

        eventBus.emit(GameEvents.SCORE_UPDATED, {
            playerId: player.id,
            roundScore: score,
            totalScore: player.totalScore
        });

        return result;
    }

    /**
     * Handle action card game logic (separate from UI)
     */
    handleActionCardLogic(player, card) {
        console.log('🎴 GameEngine: Handling action card logic for', card.display);
        
        if (card.value === 'second_chance') {
            // Check if player already has Second Chance
            if (player.hasSecondChance) {
                console.log('🎯 GameEngine: Player already has Second Chance, requires targeting');
                this.requestTargetingForActionCard(player, card);
            } else {
                console.log('✅ GameEngine: Auto-applying Second Chance');
                player.giveSecondChance();
                this.completeActionCardExecution(player, card, player);
            }
        } else if (card.value === 'freeze' || card.value === 'flip3') {
            console.log('⚡ GameEngine: Action card requires immediate targeting');
            this.requestTargetingForActionCard(player, card);
        }
    }

    /**
     * Request targeting UI for action card
     */
    requestTargetingForActionCard(player, card) {
        // Get valid targets based on card type
        const validTargets = this.getValidTargetsForActionCard(card, player);
        
        if (validTargets.length === 0) {
            console.warn('⚠️ GameEngine: No valid targets for action card');
            this.completeActionCardExecution(player, card, null);
            return;
        }

        // Emit event to request targeting UI
        eventBus.emit(GameEvents.ACTION_CARD_AWAITING_TARGET, {
            card: card,
            sourcePlayerId: player.id,
            validTargetIds: validTargets.map(p => p.id)
        });
    }

    /**
     * Get valid targets for action card
     */
    getValidTargetsForActionCard(card, sourcePlayer) {
        const activePlayers = this.players.filter(p => p.status === 'active');
        
        if (card.value === 'second_chance') {
            // For Second Chance, exclude source player (they already have one)
            return activePlayers.filter(p => p.id !== sourcePlayer.id);
        } else if (card.value === 'freeze' || card.value === 'flip3') {
            // For Freeze/Flip3, all active players are valid (including self)
            return activePlayers;
        }
        
        return [];
    }

    /**
     * Complete action card execution after targeting
     */
    completeActionCardExecution(sourcePlayer, card, targetPlayer) {
        console.log('⚡ GameEngine: Completing action card execution');
        
        if (targetPlayer) {
            this.executeActionCard(card, sourcePlayer, targetPlayer);
        }
        
        // Resume game flow
        this.resumeGameFlow();
    }

    /**
     * Move to next player's turn
     */
    nextTurn() {
        console.log('🔄 GameEngine: Next turn');
        
        // Check if round should end
        if (this.checkForRoundEnd()) {
            return;
        }

        // Always advance to next player first
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let currentPlayer = this.players[this.currentPlayerIndex];
        let attempts = 0;
        
        // Find next active player from the new position
        while (currentPlayer.status !== 'active' && attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            currentPlayer = this.players[this.currentPlayerIndex];
            attempts++;
        }

        // Update global state
        window.gameState.currentPlayerIndex = this.currentPlayerIndex;
        
        if (currentPlayer.status !== 'active' || attempts >= this.players.length) {
            // No active players left
            this.endRound();
            return;
        }

        eventBus.emit(GameEvents.TURN_STARTED, {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            isHuman: currentPlayer.isHuman
        });

        // If it's AI turn, let AI module handle it
        if (!currentPlayer.isHuman) {
            eventBus.emit(GameEvents.AI_TURN_REQUESTED, {
                playerId: currentPlayer.id,
                player: currentPlayer
            });
        }
    }

    /**
     * Handle player hit action
     */
    handlePlayerHit() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer || !currentPlayer.isHuman || currentPlayer.status !== 'active') {
            return;
        }

        const card = deckManager.drawCard();
        const result = this.handleCardDraw(currentPlayer, card);

        eventBus.emit(GameEvents.CARD_DRAWN, {
            card: card,
            playerId: currentPlayer.id,
            isInitialDeal: false
        });

        // Always move to next turn unless it's an action card waiting for targeting
        if (!result.waitingForAction) {
            this.nextTurn();
        }
        // If it's an action card, turn will advance after targeting completes via resumeGameFlow()
    }

    /**
     * Handle player stay action
     */
    handlePlayerStay() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (!currentPlayer || !currentPlayer.isHuman || currentPlayer.status !== 'active') {
            return;
        }

        currentPlayer.stay();
        
        eventBus.emit(GameEvents.PLAYER_STAYED, {
            playerId: currentPlayer.id,
            roundScore: currentPlayer.roundScore
        });

        this.nextTurn();
    }

    /**
     * Handle AI action from AIPlayer module
     */
    handleAIAction(data) {
        const player = this.getPlayerById(data.playerId);
        if (!player || player.isHuman || player.status !== 'active') {
            console.warn('⚠️ GameEngine: Invalid AI action for player:', data.playerId);
            return;
        }

        console.log(`🤖 GameEngine: Executing AI action: ${data.action} for ${player.name}`);

        if (data.action === 'hit') {
            // Draw card for AI player
            const card = deckManager.drawCard();
            const result = this.handleCardDraw(player, card);

            eventBus.emit(GameEvents.CARD_DRAWN, {
                card: card,
                playerId: player.id,
                isInitialDeal: false
            });

            // Always move to next turn unless it's an action card waiting for targeting
            if (!result.waitingForAction) {
                this.nextTurn();
            }
            // If it's an action card, turn will advance after targeting completes via resumeGameFlow()
        } else if (data.action === 'stay') {
            player.stay();
            
            eventBus.emit(GameEvents.PLAYER_STAYED, {
                playerId: player.id,
                roundScore: player.roundScore
            });

            this.nextTurn();
        } else {
            console.warn('⚠️ GameEngine: Unknown AI action:', data.action);
        }
    }

    /**
     * Check if the round should end
     */
    checkForRoundEnd() {
        // Check if someone got Flip 7
        if (this.players.some(p => p.status === 'flip7')) {
            this.endRound();
            return true;
        }

        // Check if all players are done (no active players left)
        const activePlayers = this.players.filter(p => p.status === 'active');
        if (activePlayers.length === 0) {
            this.endRound();
            return true;
        }

        return false;
    }

    /**
     * End the current round
     */
    endRound() {
        console.log('🏁 GameEngine: Ending round');
        
        // Calculate final scores for all players
        this.players.forEach(player => {
            if (player.status === 'busted') {
                player.roundScore = 0;
            } else if (player.status === 'frozen' && player.numberCards.length === 0) {
                player.roundScore = 0;
            } else if (['active', 'stayed', 'flip7', 'frozen'].includes(player.status)) {
                player.roundScore = scoringEngine.calculateRoundScore(player);
            }
        });

        eventBus.emit(GameEvents.ROUND_ENDED, {
            roundNumber: this.roundNumber,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                roundScore: p.roundScore,
                totalScore: p.totalScore
            }))
        });

        // Add round scores to total scores
        this.players.forEach(player => {
            player.addToTotalScore();
        });

        this.completeRoundEnd();
    }

    /**
     * Complete round end and check for game winner
     */
    completeRoundEnd() {
        console.log('✅ GameEngine: Completing round end');
        
        eventBus.emit(GameEvents.SCOREBOARD_UPDATE, {
            players: scoringEngine.getPlayerRankings(this.players)
        });

        // Check for game winner
        const winner = scoringEngine.checkForWinner(this.players, this.winningScore);
        if (winner) {
            this.endGame(winner);
        } else {
            // Rotate dealer and start next round
            this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
            this.roundNumber++;
            window.gameState.roundNumber = this.roundNumber;
            
            setTimeout(() => this.startNewRound(), 2000);
        }
    }

    /**
     * End the game
     */
    endGame(winner) {
        console.log('🏆 GameEngine: Game ended, winner:', winner.name);
        
        this.gameActive = false;
        
        eventBus.emit(GameEvents.GAME_ENDED, {
            winner: winner,
            finalScores: scoringEngine.getPlayerRankings(this.players)
        });
    }

    /**
     * Check for game winner after score calculation
     */
    checkForGameWinner() {
        const winner = scoringEngine.checkForWinner(this.players, this.winningScore);
        if (winner && this.gameActive) {
            this.endGame(winner);
        }
    }


    /**
     * Get current player
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get all active players
     */
    getActivePlayers() {
        return this.players.filter(p => p.status === 'active');
    }

    /**
     * Check if game is currently active
     */
    isGameActive() {
        return this.gameActive;
    }

    /**
     * Get player by ID
     */
    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    /**
     * Get game state
     */
    getGameState() {
        return {
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            roundNumber: this.roundNumber,
            gameActive: this.gameActive,
            deck: deckManager.deck,
            isInitialDealing: this.isInitialDealing
        };
    }

    /**
     * Handle action card targeting start - pause game flow
     */
    handleActionCardTargeting(data) {
        console.log('🎯 GameEngine: Action card awaiting target', data.card.display);
        
        this.isWaitingForTargeting = true;
        this.pendingActionCard = {
            card: data.card,
            sourcePlayerId: data.sourcePlayerId,
            cardElement: data.cardElement
        };
    }

    /**
     * Handle target selection - execute action and resume game flow
     */
    handleTargetSelected(data) {
        console.log('🎯 GameEngine: Target selected', data.targetPlayerId, 'for', data.card.display);
        
        const sourcePlayer = this.getPlayerById(data.sourcePlayerId);
        const targetPlayer = this.getPlayerById(data.targetPlayerId);
        
        if (!sourcePlayer || !targetPlayer) {
            console.error('❌ GameEngine: Invalid player IDs for targeting');
            this.resumeGameFlow();
            return;
        }

        // Complete action card execution using the new method
        this.completeActionCardExecution(sourcePlayer, data.card, targetPlayer);
    }

    /**
     * Handle targeting cancellation - resume game flow
     */
    handleTargetingCancelled(data) {
        console.log('❌ GameEngine: Action card targeting cancelled', data.card.display);
        
        // Return the action card to player's hand if needed
        const sourcePlayer = this.getPlayerById(data.sourcePlayerId);
        if (sourcePlayer) {
            // Remove the card that was drawn but not used
            sourcePlayer.actionCards = sourcePlayer.actionCards.filter(c => c.id !== data.card.id);
        }
        
        this.resumeGameFlow();
    }

    /**
     * Execute an action card effect
     */
    executeActionCard(card, sourcePlayer, targetPlayer) {
        console.log(`🎴 GameEngine: Executing ${card.display} from ${sourcePlayer.name} on ${targetPlayer.name}`);
        
        if (card.value === 'freeze') {
            targetPlayer.freeze();
            eventBus.emit(GameEvents.PLAYER_FROZEN, {
                playerId: targetPlayer.id,
                sourcePlayerId: sourcePlayer.id
            });
        } else if (card.value === 'flip3') {
            // Draw 3 cards for target player
            for (let i = 0; i < 3; i++) {
                const drawnCard = deckManager.drawCard();
                if (drawnCard) {
                    this.handleCardDraw(targetPlayer, drawnCard);
                }
            }
            
            eventBus.emit(GameEvents.ACTION_FLIP3, {
                targetPlayerId: targetPlayer.id,
                sourcePlayerId: sourcePlayer.id
            });
        } else if (card.value === 'second_chance') {
            targetPlayer.giveSecondChance();
            eventBus.emit(GameEvents.ACTION_SECOND_CHANCE, {
                targetPlayerId: targetPlayer.id,
                sourcePlayerId: sourcePlayer.id
            });
        }
        
        // Mark action as completed
        eventBus.emit(GameEvents.SPECIAL_ACTION_COMPLETED, {
            card: card,
            sourcePlayerId: sourcePlayer.id,
            targetPlayerId: targetPlayer.id
        });
    }

    /**
     * Resume game flow after targeting is complete
     */
    resumeGameFlow() {
        console.log('▶️ GameEngine: Resuming game flow');
        
        this.isWaitingForTargeting = false;
        this.pendingActionCard = null;
        
        // If we were in the middle of initial dealing, continue
        if (this.isInitialDealing) {
            // The dealInitialCards method will continue from where it left off
            eventBus.emit(GameEvents.SPECIAL_ACTION_COMPLETED);
        } else {
            // Continue with normal turn flow
            this.nextTurn();
        }
    }

    /**
     * Check if game flow is paused for targeting
     */
    isGamePaused() {
        return this.isWaitingForTargeting;
    }
}

// Create singleton instance
const gameEngine = new GameEngine();
export default gameEngine;