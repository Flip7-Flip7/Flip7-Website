// TurnManager.js - Dedicated turn management and game flow logic

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class TurnManager {
    constructor() {
        this.currentPlayerIndex = 0;
        this.players = [];
        this.isInitialDealing = false;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for turn management
     */
    setupEventListeners() {
        // Listen for game state updates
        eventBus.on(GameEvents.GAME_STARTED, (data) => this.onGameStarted(data));
        eventBus.on(GameEvents.ROUND_STARTED, (data) => this.onRoundStarted(data));
    }

    /**
     * Handle game started event
     */
    onGameStarted(data) {
        this.players = data.players;
        this.currentPlayerIndex = 0;
        console.log('🔄 TurnManager: Game started, turn management initialized');
    }

    /**
     * Handle round started event
     */
    onRoundStarted(data) {
        // Set current player to dealer for new round
        const dealerIndex = this.players.findIndex(p => p.id === data.dealer.id);
        if (dealerIndex >= 0) {
            this.currentPlayerIndex = dealerIndex;
            console.log(`🔄 TurnManager: Round ${data.roundNumber} started, dealer is ${data.dealer.name} (index ${dealerIndex})`);
        }
        
        // Update global state
        this.updateGlobalState();
    }

    /**
     * Set initial dealing state
     */
    setInitialDealing(isDealing) {
        this.isInitialDealing = isDealing;
        console.log(`🔄 TurnManager: Initial dealing state set to ${isDealing}`);
    }

    /**
     * Get current player
     */
    getCurrentPlayer() {
        if (!this.players || this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
            return null;
        }
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get current player index
     */
    getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }

    /**
     * Set current player index (for special cases like initial dealing)
     */
    setCurrentPlayerIndex(index) {
        const oldIndex = this.currentPlayerIndex;
        this.currentPlayerIndex = index;
        this.updateGlobalState();
        console.log(`🔄 TurnManager: Player index changed from ${oldIndex} to ${index}`);
    }

    /**
     * Move to next player's turn
     */
    nextTurn() {
        if (!this.players || this.players.length === 0) {
            console.warn('⚠️ TurnManager: No players available for turn advancement');
            return false;
        }

        const oldPlayerIndex = this.currentPlayerIndex;
        const oldPlayer = this.players[oldPlayerIndex];
        
        console.log(`🔄 TurnManager: === TURN ADVANCEMENT START ===`);
        console.log(`🔄 TurnManager: Current player: ${oldPlayer?.name || 'unknown'} (index ${oldPlayerIndex})`);
        console.log(`🔄 TurnManager: Player statuses:`, this.players.map(p => `${p.name}:${p.status}`).join(', '));
        
        // Always advance to next player first
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let currentPlayer = this.players[this.currentPlayerIndex];
        let attempts = 0;
        
        console.log(`🔄 TurnManager: Initial advancement to index ${this.currentPlayerIndex} (${currentPlayer.name})`);
        
        // Find next active player from the new position
        while (currentPlayer.status !== 'active' && attempts < this.players.length) {
            console.log(`🔄 TurnManager: Player ${currentPlayer.name} is ${currentPlayer.status}, advancing...`);
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            currentPlayer = this.players[this.currentPlayerIndex];
            attempts++;
        }

        // Update global state
        this.updateGlobalState();
        
        console.log(`🔄 TurnManager: Final player: ${currentPlayer.name} (index ${this.currentPlayerIndex}), attempts: ${attempts}`);
        
        // Check if we found an active player
        if (currentPlayer.status !== 'active' || attempts >= this.players.length) {
            console.log(`🔄 TurnManager: === NO ACTIVE PLAYERS FOUND ===`);
            console.log(`🔄 TurnManager: Final status: ${currentPlayer.status}, attempts: ${attempts}/${this.players.length}`);
            return false; // No active players found - caller should check for round end
        }

        console.log(`🔄 TurnManager: === TURN ADVANCED SUCCESSFULLY ===`);
        console.log(`🔄 TurnManager: New current player: ${currentPlayer.name} (${currentPlayer.isHuman ? 'Human' : 'AI'})`);

        // Emit turn started event
        eventBus.emit(GameEvents.TURN_STARTED, {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            isHuman: currentPlayer.isHuman
        });

        // If it's AI turn, request AI action
        if (!currentPlayer.isHuman) {
            console.log(`🔄 TurnManager: Requesting AI action for ${currentPlayer.name}`);
            eventBus.emit(GameEvents.AI_TURN_REQUESTED, {
                playerId: currentPlayer.id,
                player: currentPlayer
            });
        }

        return true; // Turn successfully advanced
    }

    /**
     * Update global game state with current turn info
     */
    updateGlobalState() {
        if (typeof window !== 'undefined' && window.gameState) {
            window.gameState.currentPlayerIndex = this.currentPlayerIndex;
            console.log(`🔄 TurnManager: Updated global state - currentPlayerIndex: ${this.currentPlayerIndex}`);
        }
    }

    /**
     * Get all active players
     */
    getActivePlayers() {
        if (!this.players) return [];
        return this.players.filter(p => p.status === 'active');
    }

    /**
     * Check if any players are still active
     */
    hasActivePlayers() {
        return this.getActivePlayers().length > 0;
    }

    /**
     * Get player by ID
     */
    getPlayerById(playerId) {
        if (!this.players) return null;
        return this.players.find(p => p.id === playerId);
    }

    /**
     * Update players reference (called when players array changes)
     */
    updatePlayers(players) {
        this.players = players;
        console.log(`🔄 TurnManager: Players updated, ${players.length} players`);
    }

    /**
     * Get turn state for debugging
     */
    getState() {
        return {
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayer: this.getCurrentPlayer()?.name || 'none',
            activePlayers: this.getActivePlayers().map(p => p.name),
            isInitialDealing: this.isInitialDealing
        };
    }

    /**
     * Log current turn state for debugging
     */
    logTurnState(context = '') {
        const state = this.getState();
        console.log(`🔄 TurnManager State ${context}:`, state);
    }
}

// Create singleton instance
const turnManager = new TurnManager();
export default turnManager;