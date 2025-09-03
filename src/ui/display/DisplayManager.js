/**
 * DisplayManager - Central coordinator for all display sub-modules
 * Manages AnimationManager, TargetingManager, and UIUpdateManager
 */
class DisplayManager {
    constructor() {
        this.eventBus = window.Flip7.eventBus || window.gameEventBus;
        this.initialized = false;
        
        // Initialize sub-managers
        this.animationManager = new AnimationManager(this.eventBus);
        this.targetingManager = new TargetingManager(this.eventBus);
        this.uiUpdateManager = new UIUpdateManager(this.eventBus);
        this.flip3AnimationManager = new Flip3AnimationManager(this.eventBus, this.animationManager);
        this.secondChanceAnimationManager = new SecondChanceAnimationManager(this.eventBus, this.animationManager);
        this.scoreAnimationManager = new ScoreAnimationManager(this.eventBus, this.animationManager);
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for core game events
     */
    setupEventListeners() {
        // Game state events
        this.eventBus.on(GameEvents.GAME_START, this.onGameStart.bind(this));
        this.eventBus.on(GameEvents.GAME_END, this.onGameEnd.bind(this));
        this.eventBus.on(GameEvents.ROUND_START, this.onRoundStart.bind(this));
        
        // Player state events
        this.eventBus.on(GameEvents.PLAYER_BUST, this.onPlayerBust.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FLIP7, this.onPlayerFlip7.bind(this));
        this.eventBus.on(GameEvents.FREEZE_CARD_USED, this.onFreezeUsed.bind(this));
        this.eventBus.on(GameEvents.PLAYER_FROZEN, this.onPlayerFrozen.bind(this));
    }

    /**
     * Initialize the display manager
     */
    initialize() {
        if (this.initialized) return;
        
        console.log('DisplayManager initialized with sub-modules');
        this.initialized = true;
        
        // Initial UI setup
        this.setupInitialUI();
    }

    /**
     * Setup initial UI state
     */
    setupInitialUI() {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.opacity = '1';
        }
    }

    /**
     * Handle game start event
     */
    onGameStart(data) {
        console.log('Display: Game started', data);
        this.uiUpdateManager.updateGameStatus('Game Started');
        
        // Hide any endgame overlay
        const celebration = document.getElementById('winning-celebration');
        if (celebration) celebration.style.display = 'none';
    }

    /**
     * Handle game end event
     */
    onGameEnd(data) {
        const winner = data?.winner;
        const winnerName = winner?.name || 'Winner';
        const isHumanWin = winner?.isHuman;
        
        console.log(`DisplayManager: Game ended - Winner: ${winnerName}, isHuman: ${isHumanWin}`);
        
        // Show celebration overlay
        this.showWinnerCelebration(winner, isHumanWin);
        
        // Update mobile banner
        this.updateMobileEndGame(winnerName, isHumanWin);
        
        // Disable action buttons
        this.disableAllActionButtons();
    }

    /**
     * Handle round start event
     */
    onRoundStart(data) {
        console.log('Display: Round started', data);
        
        // Clear any targeting state from previous round
        if (this.targetingManager.isTargeting()) {
            this.targetingManager.exitTargetingMode();
        }
    }

    /**
     * Handle player bust event
     */
    onPlayerBust(data) {
        const { player } = data;
        const container = document.getElementById(player.id);
        if (container) {
            container.classList.add('busted');
        }
    }

    /**
     * Handle player Flip 7 event
     */
    onPlayerFlip7(data) {
        const { player } = data;
        console.log(`Display: ${player.name} got Flip 7!`);
        
        // The animation manager will handle the visual celebration
        // We just need to ensure the game state is reflected
        const container = document.getElementById(player.id);
        if (container) {
            container.classList.add('flip7-winner');
        }
    }

    /**
     * Handle freeze card used
     */
    onFreezeUsed(data) {
        const { targetPlayer } = data;
        if (!targetPlayer) return;
        this.addFrozenState(targetPlayer.id);
    }

    /**
     * Handle player frozen event
     */
    onPlayerFrozen(data) {
        const { player } = data;
        if (!player) return;
        this.addFrozenState(player.id);
    }

    /**
     * Add frozen state to player
     */
    addFrozenState(playerId) {
        const container = document.getElementById(playerId);
        if (!container) return;

        container.classList.add('frozen');
        
        // Update status text
        const statusEl = container.querySelector('.player-status');
        if (statusEl) statusEl.textContent = 'Frozen ❄️';

        // Disable action buttons if human player
        if (playerId === 'player') {
            this.disableAllActionButtons();
        }
    }

    /**
     * Show winner celebration overlay
     */
    showWinnerCelebration(winner, isHumanWin) {
        const celebration = document.getElementById('winning-celebration');
        if (celebration) {
            celebration.style.display = 'flex';
        }
        
        // Update celebration text
        const celebrationText = document.getElementById('celebration-text');
        const celebrationSubtext = document.getElementById('celebration-subtext');
        
        if (isHumanWin) {
            if (celebrationText) celebrationText.textContent = '🎉 Congratulations You Won! 🎉';
            if (celebrationSubtext) celebrationSubtext.textContent = 'Amazing job! Click anywhere to continue.';
        } else {
            if (celebrationText) celebrationText.textContent = `🎯 ${winner.name} Wins!`;
            if (celebrationSubtext) celebrationSubtext.textContent = 'Better luck next time! Click anywhere to continue.';
        }
        
        // Setup dismissal handlers
        this.setupCelebrationDismissal();
    }

    /**
     * Setup celebration overlay dismissal
     */
    setupCelebrationDismissal() {
        const celebration = document.getElementById('winning-celebration');
        const closeBtn = document.getElementById('close-celebration');
        
        const dismissCelebration = () => {
            if (celebration) {
                celebration.style.display = 'none';
            }
        };
        
        if (closeBtn) {
            closeBtn.onclick = dismissCelebration;
        }
        
        if (celebration) {
            celebration.onclick = (e) => {
                if (e.target === celebration) {
                    dismissCelebration();
                }
            };
        }
    }

    /**
     * Update mobile UI for game end
     */
    updateMobileEndGame(winnerName, isHumanWin) {
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        const mobileGameInfo = document.getElementById('mobile-game-info');
        
        if (mobileTurnIndicator) {
            mobileTurnIndicator.textContent = isHumanWin ? 
                '🎉 You Won!' : 
                `🎯 ${winnerName} Wins!`;
        }
        
        if (mobileGameInfo) {
            mobileGameInfo.textContent = 'Click "Start Game" to play again';
        }
    }

    /**
     * Disable all action buttons
     */
    disableAllActionButtons() {
        ['hit-btn', 'stay-btn', 'mobile-hit-btn', 'mobile-stay-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
    }

    /**
     * Get sub-manager instances (for debugging/testing)
     */
    getManagers() {
        return {
            animation: this.animationManager,
            targeting: this.targetingManager,
            uiUpdate: this.uiUpdateManager,
            flip3Animation: this.flip3AnimationManager,
            secondChanceAnimation: this.secondChanceAnimationManager
        };
    }

    /**
     * Check if any animations are active
     */
    hasActiveAnimations() {
        return this.animationManager.activeAnimations.size > 0;
    }

    /**
     * Check if targeting mode is active
     */
    isTargetingActive() {
        return this.targetingManager.isTargeting();
    }

    /**
     * Check if Flip3 animation is active
     */
    isFlip3Active() {
        return this.flip3AnimationManager.isActive;
    }

    /**
     * Check if Second Chance animation is currently active
     */
    isSecondChanceActive() {
        return this.secondChanceAnimationManager.isActive;
    }
}

// Create singleton instance
window.DisplayManager = DisplayManager;