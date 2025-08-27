// ActionCardHandler.js - Pure UI component for action card targeting visuals

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class ActionCardHandler {
    constructor() {
        this.isTargeting = false;
        this.pendingActionCard = null;
        this.sourcePlayerId = null;
        this.targetableElements = [];
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for UI targeting requests
     */
    setupEventListeners() {
        // Listen for GameEngine requesting targeting UI
        eventBus.on(GameEvents.ACTION_CARD_AWAITING_TARGET, (data) => this.showTargetingUI(data));
    }

    /**
     * Show targeting UI when requested by GameEngine
     */
    showTargetingUI(data) {
        console.log('🎯 ActionCardHandler: Showing targeting UI for', data.card.display);
        
        this.isTargeting = true;
        this.pendingActionCard = data.card;
        this.sourcePlayerId = data.sourcePlayerId;
        
        // Get targetable players from GameEngine's decision
        const targetablePlayers = data.validTargetIds.map(id => 
            window.gameState?.players?.find(p => p.id === id)
        ).filter(p => p);

        if (targetablePlayers.length === 0) {
            console.warn('⚠️ ActionCardHandler: No targetable players provided');
            this.cancelTargeting();
            return;
        }

        // Add visual highlighting to targetable players
        this.highlightTargetablePlayers(targetablePlayers);
    }


    /**
     * Add visual highlighting to targetable players
     */
    highlightTargetablePlayers(targetablePlayers) {
        console.log('✨ ActionCardHandler: Highlighting targetable players:', targetablePlayers.map(p => p.name));
        
        this.targetableElements = [];
        
        targetablePlayers.forEach(player => {
            // Get all containers for this player (desktop + mobile)
            const containers = this.getPlayerContainers(player.id);
            
            containers.forEach(container => {
                if (container) {
                    // Add targeting highlight class
                    container.classList.add('targetable', 'action-card-targeting');
                    
                    // Add click handler
                    const clickHandler = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.onPlayerTargeted(player);
                    };
                    
                    container.addEventListener('click', clickHandler);
                    this.targetableElements.push({
                        element: container,
                        handler: clickHandler,
                        playerId: player.id
                    });
                }
            });
        });

        // Add escape key handler to cancel targeting
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelTargeting();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Get all DOM containers for a player (desktop + mobile)
     */
    getPlayerContainers(playerId) {
        const containers = [];
        
        // Desktop container
        const desktopContainer = document.getElementById(playerId);
        if (desktopContainer) containers.push(desktopContainer);
        
        // Mobile container  
        const mobileId = playerId === 'player' ? 'mobile-player' : `mobile-${playerId}`;
        const mobileContainer = document.getElementById(mobileId);
        if (mobileContainer) containers.push(mobileContainer);
        
        return containers;
    }

    /**
     * Handle player being targeted/tapped
     */
    onPlayerTargeted(targetPlayer) {
        console.log('🎯 ActionCardHandler: Player targeted:', targetPlayer.name);
        
        // Remove highlighting
        this.clearTargeting();
        
        // Send target selection to GameEngine
        eventBus.emit(GameEvents.PLAYER_TAPPED_FOR_TARGET, {
            card: this.pendingActionCard,
            sourcePlayerId: this.sourcePlayerId,
            targetPlayerId: targetPlayer.id
        });
        
        this.resetState();
    }

    /**
     * Cancel targeting (e.g., on Escape key)
     */
    cancelTargeting() {
        console.log('❌ ActionCardHandler: Targeting cancelled');
        
        this.clearTargeting();
        
        // Emit cancellation event
        eventBus.emit(GameEvents.ACTION_CARD_TARGETING_CANCELLED, {
            card: this.pendingActionCard,
            sourcePlayerId: this.sourcePlayerId
        });
        
        this.resetState();
    }

    /**
     * Clear all targeting UI elements
     */
    clearTargeting() {
        // Remove highlighting and event listeners
        this.targetableElements.forEach(({ element, handler }) => {
            element.classList.remove('targetable', 'action-card-targeting');
            element.removeEventListener('click', handler);
        });
        
        this.targetableElements = [];
        
        // Remove escape key handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    /**
     * Reset internal state
     */
    resetState() {
        this.isTargeting = false;
        this.pendingActionCard = null;
        this.sourcePlayerId = null;
    }

    /**
     * Check if currently in targeting mode
     */
    isCurrentlyTargeting() {
        return this.isTargeting;
    }
}

// Create singleton instance
const actionCardHandler = new ActionCardHandler();
export default actionCardHandler;