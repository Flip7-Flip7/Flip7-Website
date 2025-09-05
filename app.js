/**
 * app.js - Main application entry point
 * Initializes the modular Flip 7 game
 */

// Global namespace for the game
window.Flip7 = window.Flip7 || {};

// (Note) Script modules are loaded via index.html to preserve order.

/**
 * Initialize the game after modules are loaded
 */
function initializeGame() {
    console.log('Initializing Flip 7 game...');
    
    // Make core classes available in Flip7 namespace
    window.Flip7 = {
        // Event system
        EventBus: window.EventBus,
        GameEvents: window.GameEvents,
        eventBus: window.gameEventBus,
        
        // Configuration
        GameConstants: window.GameConstants,
        
        // Core classes
        Card: window.Card,
        Deck: window.Deck,
        Player: window.Player,
        CardManager: window.CardManager,
        GameEngine: window.GameEngine,
        DisplayManager: window.DisplayManager,
        
        // Utility function to test the modular system
        testModules: function() {
            console.log('=== Flip 7 Modules Test ===');
            console.log('EventBus:', !!this.EventBus);
            console.log('GameEvents:', !!this.GameEvents);
            console.log('Card:', !!this.Card);
            console.log('Deck:', !!this.Deck);
            console.log('Player:', !!this.Player);
            console.log('CardManager:', !!this.CardManager);
            console.log('GameEngine:', !!this.GameEngine);
            console.log('DisplayManager:', !!this.DisplayManager);
            console.log('=========================');
            
            // Test creating instances
            try {
                const testCard = new this.Card('number', 7);
                console.log('✓ Card creation works:', testCard);
                
                const testPlayer = new this.Player({ name: 'Test' });
                console.log('✓ Player creation works:', testPlayer.name);
                
                console.log('✓ All modules loaded successfully!');
            } catch (error) {
                console.error('✗ Module test failed:', error);
            }
        }
    };
    
    // Instantiate DisplayManager and GameEngine
    const displayManager = new window.DisplayManager();
    displayManager.initialize();
    
    const winningInput = document.getElementById('win-points');
    const winningScore = winningInput ? Number(winningInput.value) : window.GameConstants.WINNING_SCORE;
    const engine = new window.GameEngine({ winningScore });
    
    // Expose instances
    window.Flip7.display = displayManager;
    window.Flip7.engine = engine;
    window.Flip7.gameEngine = engine; // Also expose as gameEngine for managers
    
    // Helper function to update scoreboard modal content
    const updateScoreboardModal = () => {
        const tbody = document.getElementById('modal-scoreboard-body');
        if (!tbody) return;
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Get player data from the game engine
        if (!engine || !engine.players) return;
        
        // Add each player's score
        engine.players.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.roundScore || 0}</td>
                <td>${player.totalScore || 0}</td>
            `;
            tbody.appendChild(row);
        });
    };
    
    // Wire UI buttons to EventBus
    const bus = window.gameEventBus;
    const bind = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    };
    
    bind('new-game-btn', () => engine.startNewGame());
    bind('mobile-hit-btn', (event) => {
        event.preventDefault();
        event.stopPropagation();
        bus.emit(window.GameEvents.PLAYER_HIT);
    });
    bind('mobile-stay-btn', (event) => {
        event.preventDefault();
        event.stopPropagation();
        bus.emit(window.GameEvents.PLAYER_STAY);
    });
    bind('desktop-hit-btn', (event) => {
        event.preventDefault();
        event.stopPropagation();
        bus.emit(window.GameEvents.PLAYER_HIT);
    });
    bind('desktop-stay-btn', (event) => {
        event.preventDefault();
        event.stopPropagation();
        bus.emit(window.GameEvents.PLAYER_STAY);
    });
    
    // Rules modal wiring
    bind('rules-btn', () => {
        const modal = document.getElementById('rules-modal');
        if (modal) modal.style.display = 'block';
    });
    const closeRules = document.getElementById('close-rules');
    if (closeRules) closeRules.addEventListener('click', () => {
        const modal = document.getElementById('rules-modal');
        if (modal) modal.style.display = 'none';
    });
    
    // Scoreboard modal wiring
    bind('scoreboard-btn', () => {
        updateScoreboardModal();
        const modal = document.getElementById('scoreboard-modal');
        if (modal) modal.style.display = 'block';
    });
    const closeScoreboard = document.getElementById('close-scoreboard');
    if (closeScoreboard) closeScoreboard.addEventListener('click', () => {
        const modal = document.getElementById('scoreboard-modal');
        if (modal) modal.style.display = 'none';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const rulesModal = document.getElementById('rules-modal');
        const scoreboardModal = document.getElementById('scoreboard-modal');
        if (event.target === rulesModal) {
            rulesModal.style.display = 'none';
        }
        if (event.target === scoreboardModal) {
            scoreboardModal.style.display = 'none';
        }
    });
}

/**
 * Start the application
 */
async function startApp() {
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Initialize the game
        initializeGame();
        
        // Autostart the game (especially important for mobile)
        const isMobile = window.innerWidth <= 768;
        console.log(`🎮 Autostart: ${isMobile ? 'Mobile' : 'Desktop'} device detected`);
        
        // Start game after a brief delay
        setTimeout(() => {
            // Check if game is already in progress
            if (window.Flip7?.engine?.isGameInProgress && window.Flip7.engine.isGameInProgress()) {
                console.log('🎮 Game already in progress, skipping autostart');
                return;
            }
            
            console.log('🎮 Autostarting game...');
            if (window.Flip7?.engine?.startNewGame) {
                window.Flip7.engine.startNewGame();
                console.log('✓ Game autostart completed');
            } else {
                console.error('✗ Game engine not ready for autostart');
            }
        }, 500);
        
    } catch (error) {
        console.error('Failed to start Flip 7:', error);
        
        // Fallback to legacy game.js
        // console.log('Falling back to legacy game.js...');
        // const fallbackScript = document.createElement('script');
        // fallbackScript.src = 'game.js?v=9.0&t=20250808-center-animation';
        // document.head.appendChild(fallbackScript);
    }
}

// Start the application
startApp();
