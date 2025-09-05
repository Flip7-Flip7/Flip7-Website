/**
 * GameStateManager - Manages game lifecycle, rounds, and scoring
 */
class GameStateManager {
    constructor(eventBus, winningScore = GameConstants.WINNING_SCORE) {
        this.eventBus = eventBus;
        this.winningScore = winningScore;
        
        // Game state
        this.gameActive = false;
        this.roundNumber = 1;
        this.dealerIndex = 0;
        this.roundEnding = false;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on(GameEvents.ROUND_SHOULD_END, this.endRound.bind(this));
    }

    /**
     * Start a new game
     * @param {Array<Player>} players - All players
     * @param {Deck} deck - Game deck
     */
    async startNewGame(players, deck) {
        console.log('\n╔════════════════════════════════════╗');
        console.log('║      🎮 NEW GAME STARTING! 🎮      ║');
        console.log('╚════════════════════════════════════╝');
        
        // Reset game state
        this.roundNumber = 1;
        this.gameActive = true;
        this.dealerIndex = 3; // Start with AI Bot 3 as dealer so human gets first card in round 1
        players.forEach(player => player.totalScore = 0);
        
        // Fresh deck only at the start of a NEW GAME (not each round)
        if (deck && typeof deck.reset === 'function') {
            deck.reset();
        }
        
        // Emit game start event
        this.eventBus.emit(GameEvents.GAME_START, {
            players: players.map(p => p.getState()),
            winningScore: this.winningScore
        });
        
        // Start first round
        await this.startNewRound(players);
    }

    /**
     * Start a new round
     * @param {Array<Player>} players - All players
     */
    async startNewRound(players) {
        // Reset round ending flag for new round
        this.roundEnding = false;
        
        console.log('\n=====================================');
        console.log(`🎲 ROUND ${this.roundNumber} STARTING 🎲`);
        console.log('=====================================');
        
        // Reset players for new round
        players.forEach(player => {
            // Reset player state (this sets status to 'waiting')
            player.resetForNewRound();
            
            // Set all players to active for the new round
            player.status = 'active';
        });
        
        // Rotate dealer for each new round (except first round where dealer starts at index 3)
        if (this.roundNumber > 1) {
            this.dealerIndex = (this.dealerIndex + 1) % players.length;
        }
        
        // Emit round start event
        this.eventBus.emit(GameEvents.ROUND_START, {
            roundNumber: this.roundNumber,
            dealerIndex: this.dealerIndex
        });
        
        // Emit event to request initial card dealing
        this.eventBus.emit(GameEvents.REQUEST_INITIAL_DEAL, {
            players: players,
            dealerIndex: this.dealerIndex
        });
    }

    /**
     * End the current round
     * @param {Object} data - Round end data
     */
    endRound(data = {}) {
        // Get players from GameEngine
        const gameEngine = window.Flip7?.gameEngine;
        const players = gameEngine?.players || [];
        const cardManager = gameEngine?.cardManager;
        
        // Prevent multiple calls to endRound for the same round
        if (this.roundEnding) {
            console.log(`GameStateManager: Round ${this.roundNumber} already ending - ignoring duplicate endRound call`);
            return;
        }
        this.roundEnding = true;
        
        console.log('\n-------------------------------------');
        console.log(`📊 ROUND ${this.roundNumber} ENDING 📊`);
        console.log('-------------------------------------');
        
        // Calculate scores
        console.log(`GameStateManager: Calculating scores for round ${this.roundNumber}`);
        players.forEach(player => {
            const previousTotal = player.totalScore;
            if (player.status !== 'busted') {
                player.calculateScore();
                player.totalScore += player.roundScore;
                console.log(`GameStateManager: ${player.name} scored ${player.roundScore} this round (${previousTotal} -> ${player.totalScore})`);
            } else {
                console.log(`GameStateManager: ${player.name} busted, no points added (total remains ${player.totalScore})`);
            }
        });
        
        // Move all players' cards to discard pile so deck persists across rounds
        try {
            const allCards = [];
            players.forEach(player => {
                if (player.numberCards && player.numberCards.length) {
                    allCards.push(...player.numberCards);
                }
                if (player.modifierCards && player.modifierCards.length) {
                    allCards.push(...player.modifierCards);
                }
                if (player.actionCards && player.actionCards.length) {
                    allCards.push(...player.actionCards);
                }
            });
            if (allCards.length > 0 && cardManager) {
                cardManager.discardCards(allCards);
            }
        } catch (e) {
            console.warn('Failed to discard round cards:', e);
        }
        
        // Emit round end event
        this.eventBus.emit(GameEvents.ROUND_END, {
            roundNumber: this.roundNumber,
            scores: players.map(p => ({
                player: p.getState(),
                roundScore: p.roundScore,
                totalScore: p.totalScore
            }))
        });
        
        // Check for game end - highest score >= winning score wins
        console.log(`GameStateManager: Checking for game end (winning score: ${this.winningScore})`);
        console.log('GameStateManager: Current total scores:', players.map(p => `${p.name}: ${p.totalScore}`).join(', '));
        
        const qualifyingPlayers = players.filter(p => p.totalScore >= this.winningScore);
        console.log(`GameStateManager: ${qualifyingPlayers.length} players qualify for win:`, qualifyingPlayers.map(p => `${p.name} (${p.totalScore})`).join(', '));
        
        if (qualifyingPlayers.length > 0) {
            // Find highest score among qualifying players
            const highestScore = Math.max(...qualifyingPlayers.map(p => p.totalScore));
            const winners = qualifyingPlayers.filter(p => p.totalScore === highestScore);
            console.log(`GameStateManager: Highest qualifying score: ${highestScore}, ${winners.length} winner(s): ${winners.map(w => w.name).join(', ')}`);
            
            if (winners.length === 1) {
                // Clear winner
                console.log(`GameStateManager: Game ending with winner: ${winners[0].name} (${winners[0].totalScore} points)`);
                this.endGame(winners[0], players);
            } else {
                // Tie - continue to next round
                console.log(`GameStateManager: Tie detected with ${winners.length} players at ${highestScore} points - continuing to next round`);
                this.roundNumber++;
                setTimeout(async () => await this.startNewRound(players), 5000);
            }
        } else {
            // No one reached winning score - continue
            console.log('GameStateManager: No qualifying players - continuing to next round');
            this.roundNumber++;
            setTimeout(async () => await this.startNewRound(players), 5000);
        }
    }

    /**
     * End the game
     * @param {Player} winner - The winning player
     * @param {Array<Player>} players - All players
     */
    endGame(winner, players) {
        this.gameActive = false;
        
        console.log('\n╔════════════════════════════════════╗');
        console.log(`║    🏆 GAME OVER - ${winner.name.toUpperCase()} WINS! 🏆`);
        console.log('╚════════════════════════════════════╝');
        console.log('Final Scores:');
        players.forEach(p => {
            console.log(`  ${p.name}: ${p.totalScore} points${p.id === winner.id ? ' 👑' : ''}`);
        });
        console.log('=====================================\n');
        
        this.eventBus.emit(GameEvents.GAME_END, {
            winner: winner.getState(),
            finalScores: players.map(p => ({
                player: p.getState(),
                totalScore: p.totalScore
            }))
        });
    }

    /**
     * Get current game state
     * @returns {Object}
     */
    getState() {
        return {
            gameActive: this.gameActive,
            roundNumber: this.roundNumber,
            dealerIndex: this.dealerIndex,
            roundEnding: this.roundEnding,
            winningScore: this.winningScore
        };
    }

    /**
     * Reset game state
     */
    reset() {
        this.gameActive = false;
        this.roundNumber = 1;
        this.dealerIndex = 0;
        this.roundEnding = false;
    }
}

// Make available globally
window.GameStateManager = GameStateManager;