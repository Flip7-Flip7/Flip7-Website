/**
 * DebugUtilities.js - Centralized debugging tools for Flip 7
 * Contains reusable debug functions to avoid rewriting debug code
 */

window.DebugUtilities = {
    /**
     * Enable/disable debug mode globally
     */
    setDebugMode(enabled) {
        window.DEBUG_MODE = enabled;
        console.log(`🔧 Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    },

    /**
     * Stack specific cards to be drawn next (in the exact order provided).
     * The first item in the array will be the next card drawn.
     * Example: dbg.stackNextDraws([{ type: 'action', value: 'flip3' }, { type: 'number', value: 7 }])
     */
    stackNextDraws(draws = []) {
        const deck = window.Flip7?.gameEngine?.deck;
        if (!deck) {
            console.error('❌ Deck not initialized');
            return;
        }

        // draw() uses pop(), so push in reverse so the first input is drawn first
        const toPush = draws.slice().reverse().map(d => new window.Card(d.type, d.value));
        toPush.forEach(card => deck.cards.push(card));

        console.log(`📦 Stacked ${draws.length} card(s) on top of the deck (next up: ${draws.map(d => `${d.type}:${d.value}`).join(', ')})`);
        this.logDeckState();
    },

    /**
     * Replace the deck with a fixed draw sequence (first item will be drawn first).
     * If keepRest is true, appends the existing deck below your fixed sequence.
     */
    setFixedDeck(draws = [], keepRest = false) {
        const deck = window.Flip7?.gameEngine?.deck;
        if (!deck) {
            console.error('❌ Deck not initialized');
            return;
        }

        const fixed = draws.map(d => new window.Card(d.type, d.value));
        const rest = keepRest ? deck.cards.slice() : [];

        // Ensure first provided draw is drawn first → it must be at the end of the array
        const ordered = rest.concat(fixed.slice().reverse());
        deck.cards = ordered;
        console.log(`🧱 Fixed deck set (${draws.length} upfront${keepRest ? ' + rest' : ''}). Next up: ${draws.map(d => `${d.type}:${d.value}`).join(', ')}`);
        this.logDeckState();
    },

    /**
     * Peek at the next N draws without modifying the deck
     */
    peekNext(n = 5) {
        const deck = window.Flip7?.gameEngine?.deck;
        if (!deck) {
            console.error('❌ Deck not initialized');
            return;
        }
        const next = deck.cards.slice(Math.max(0, deck.cards.length - n)).map(c => `${c.type}:${c.value}`);
        console.log(`👀 Next ${n} (top → bottom): ${next.join(', ')}`);
        return next;
    },

    /**
     * Clear any stacked debug draws at the top of the deck by removing X cards
     */
    clearTop(count = 10) {
        const deck = window.Flip7?.gameEngine?.deck;
        if (!deck) {
            console.error('❌ Deck not initialized');
            return;
        }
        for (let i = 0; i < count && deck.cards.length > 0; i++) deck.cards.pop();
        console.log(`🧹 Cleared ${count} card(s) from top of deck`);
        this.logDeckState();
    },

    /**
     * Log game state with detailed player information
     */
    logGameState() {
        const engine = window.Flip7?.gameEngine;
        if (!engine) {
            console.error('❌ Game engine not initialized');
            return;
        }

        const state = engine.getGameState();
        console.group('🎮 GAME STATE DEBUG');
        console.log('Round:', state.round);
        console.log('Dealer Index:', state.dealerIndex);
        console.log('Game Active:', state.gameActive);
        console.log('Deck Remaining:', state.deckRemaining);
        console.log('Current Player Index:', state.currentPlayerIndex);
        
        console.group('👥 Players:');
        state.players.forEach((player, index) => {
            console.group(`${index}: ${player.name} (${player.isHuman ? 'Human' : 'AI'})`);
            console.log('Status:', player.status);
            console.log('Total Score:', player.totalScore);
            console.log('Round Score:', player.roundScore);
            console.log('Number Cards:', player.numberCards);
            console.log('Unique Numbers:', player.uniqueNumbers);
            console.log('Modifier Cards:', player.modifierCards);
            console.log('Action Cards:', player.actionCards);
            console.log('Has Second Chance:', player.hasSecondChance);
            console.groupEnd();
        });
        console.groupEnd();
        console.groupEnd();
    },

    /**
     * Log all player cards with full details
     */
    logPlayerCards(playerId = null) {
        const engine = window.Flip7?.gameEngine;
        if (!engine) {
            console.error('❌ Game engine not initialized');
            return;
        }

        const players = playerId ? 
            engine.players.filter(p => p.id === playerId) : 
            engine.players;

        console.group('🃏 PLAYER CARDS DEBUG');
        players.forEach(player => {
            console.group(`${player.name} (${player.id})`);
            console.log('Number Cards:', player.numberCards.map(c => c.value));
            console.log('Modifier Cards:', player.modifierCards.map(c => c.value));
            console.log('Action Cards:', player.actionCards.map(c => c.value));
            console.log('Unique Numbers Set:', Array.from(player.uniqueNumbers));
            console.log('Calculated Score:', player.calculateScore());
            console.groupEnd();
        });
        console.groupEnd();
    },

    /**
     * Log turn manager state
     */
    logTurnState() {
        const turnManager = window.Flip7?.gameEngine?.turnManager;
        if (!turnManager) {
            console.error('❌ Turn manager not initialized');
            return;
        }

        console.group('🔄 TURN STATE DEBUG');
        console.log('Current Player Index:', turnManager.currentPlayerIndex);
        console.log('Turn Ending:', turnManager.turnEnding);
        console.log('AI Turn In Progress:', turnManager.aiTurnInProgress);
        console.log('Action In Progress:', turnManager.actionInProgress);
        console.log('Action Display Phase:', turnManager.actionDisplayPhase);
        console.groupEnd();
    },

    /**
     * Log deck state and statistics
     */
    logDeckState() {
        const deck = window.Flip7?.gameEngine?.deck;
        if (!deck) {
            console.error('❌ Deck not initialized');
            return;
        }

        const stats = deck.getStats();
        console.group('🎴 DECK STATE DEBUG');
        console.log('Cards Remaining:', stats.cardsRemaining);
        console.log('Discard Count:', stats.discardCount);
        console.log('Shuffle Count:', stats.shuffleCount);
        
        console.group('Card Type Breakdown:');
        console.log('Number Cards:', stats.breakdown.numberCards);
        console.log('Action Cards:', stats.breakdown.actionCards);
        console.log('Modifier Cards:', stats.breakdown.modifierCards);
        console.groupEnd();
        console.groupEnd();
    },

    /**
     * Log animation manager state
     */
    logAnimationState() {
        const animManager = window.Flip7?.display?.animationManager;
        if (!animManager) {
            console.error('❌ Animation manager not initialized');
            return;
        }

        console.group('🎬 ANIMATION STATE DEBUG');
        console.log('Active Animations:', animManager.activeAnimations.size);
        console.log('Animation Queue Length:', animManager.animationQueue.length);
        console.log('Processing Queue:', animManager.processingQueue);
        
        const flip3Manager = window.Flip7?.display?.flip3AnimationManager;
        if (flip3Manager) {
            console.log('Flip3 Active:', flip3Manager.isActive);
            console.log('Flip3 Current Card Index:', flip3Manager.currentCardIndex);
        }
        
        const secondChanceManager = window.Flip7?.display?.secondChanceAnimationManager;
        if (secondChanceManager) {
            console.log('Second Chance Active:', secondChanceManager.isActive);
        }
        console.groupEnd();
    },

    /**
     * Log event bus listeners
     */
    logEventListeners(eventName = null) {
        const eventBus = window.gameEventBus;
        if (!eventBus) {
            console.error('❌ Event bus not initialized');
            return;
        }

        console.group('📡 EVENT LISTENERS DEBUG');
        if (eventName) {
            const listeners = eventBus.events[eventName] || [];
            console.log(`Event: ${eventName} - ${listeners.length} listeners`);
        } else {
            Object.keys(eventBus.events).forEach(event => {
                console.log(`${event}: ${eventBus.events[event].length} listeners`);
            });
        }
        console.groupEnd();
    },

    /**
     * Simulate player actions for testing
     */
    simulatePlayerAction(action, playerId = 'player') {
        const eventBus = window.gameEventBus;
        if (!eventBus) {
            console.error('❌ Event bus not initialized');
            return;
        }

        console.log(`🎯 Simulating ${action} for ${playerId}`);
        
        switch(action) {
            case 'hit':
                eventBus.emit(window.GameEvents.PLAYER_HIT, { playerId });
                break;
            case 'stay':
                eventBus.emit(window.GameEvents.PLAYER_STAY, { playerId });
                break;
            default:
                console.error('❌ Unknown action:', action);
        }
    },

    /**
     * Force deal specific card to current player
     */
    forceDrawCard(type, value) {
        const engine = window.Flip7?.gameEngine;
        const turnManager = engine?.turnManager;
        if (!engine || !turnManager) {
            console.error('❌ Game engine or turn manager not initialized');
            return;
        }

        const currentPlayer = engine.players[turnManager.currentPlayerIndex];
        if (!currentPlayer) {
            console.error('❌ No current player');
            return;
        }

        console.log(`🎯 Forcing ${type}:${value} for ${currentPlayer.name}`);
        
        // Create the card and add directly
        const card = new window.Card(type, value);
        const result = currentPlayer.addCard(card);
        
        // Emit events to update UI
        window.gameEventBus.emit(window.GameEvents.CARD_DRAWN, {
            player: currentPlayer,
            card: card,
            result: result
        });
        
        // Update score
        window.gameEventBus.emit(window.GameEvents.PLAYER_SCORE_UPDATE, {
            playerId: currentPlayer.id,
            roundScore: currentPlayer.calculateScore(),
            totalScore: currentPlayer.totalScore
        });
    },

    /**
     * Skip to specific player's turn
     */
    skipToPlayer(playerIndex) {
        const turnManager = window.Flip7?.gameEngine?.turnManager;
        if (!turnManager) {
            console.error('❌ Turn manager not initialized');
            return;
        }

        console.log(`⏭️ Skipping to player index ${playerIndex}`);
        turnManager.currentPlayerIndex = playerIndex;
        turnManager.endTurn();
    },

    /**
     * Log all debug functions available
     */
    help() {
        console.group('🔧 DEBUG UTILITIES HELP');
        console.log('Available functions:');
        console.log('• DebugUtilities.setDebugMode(true/false) - Enable/disable debug logging');
        console.log('• DebugUtilities.logGameState() - Log complete game state');
        console.log('• DebugUtilities.logPlayerCards(playerId?) - Log player cards');
        console.log('• DebugUtilities.logTurnState() - Log turn manager state');
        console.log('• DebugUtilities.logDeckState() - Log deck statistics');
        console.log('• DebugUtilities.logAnimationState() - Log animation states');
        console.log('• DebugUtilities.logEventListeners(eventName?) - Log event listeners');
        console.log('• DebugUtilities.simulatePlayerAction("hit"/"stay") - Simulate actions');
        console.log('• DebugUtilities.forceDrawCard(type, value) - Force specific card draw');
        console.log('• DebugUtilities.stackNextDraws([{type, value}, ...]) - Make next draws deterministic');
        console.log('• DebugUtilities.setFixedDeck([{type, value}, ...], keepRest?) - Replace deck order');
        console.log('• DebugUtilities.peekNext(n) - Preview next n draws');
        console.log('• DebugUtilities.clearTop(count) - Remove cards from the top');
        console.log('• DebugUtilities.skipToPlayer(index) - Skip to player turn');
        console.groupEnd();
    }
};

// Create shorter aliases for convenience
window.dbg = window.DebugUtilities;

// Auto-enable debug mode in development (localhost)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.DebugUtilities.setDebugMode(true);
}

console.log('🔧 Debug Utilities loaded. Type "dbg.help()" for available commands.');
