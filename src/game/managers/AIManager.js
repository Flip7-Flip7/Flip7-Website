/**
 * AIManager - Handles all AI decision-making and targeting logic
 */
class AIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Execute AI turn
     * @param {Player} aiPlayer - The AI player
     * @param {Function} onHit - Callback for hit decision
     * @param {Function} onStay - Callback for stay decision
     */
    async executeAITurn(aiPlayer, onHit, onStay) {
        const shouldHit = this.calculateAIShouldHit(aiPlayer);
        
        this.eventBus.emit(GameEvents.AI_DECISION_MADE, {
            player: aiPlayer,
            decision: shouldHit ? 'hit' : 'stay'
        });
        
        if (shouldHit) {
            await onHit(aiPlayer);
        } else {
            onStay(aiPlayer);
        }
    }

    /**
     * Simple AI decision logic
     * @param {Player} player - The AI player
     * @returns {boolean} Whether to hit
     */
    calculateAIShouldHit(player) {
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.calculateScore();
        
        // Priority 1: If AI has Second Chance, be aggressive and keep hitting
        if (player.hasSecondChance) {
            console.log(`AI ${player.name}: Has Second Chance protection - hitting aggressively`);
            return true;
        }
        
        // Priority 2: Get Flip 7 if close
        if (uniqueCount >= 5 && uniqueCount < 7) return true;
        
        // Conservative if high score
        if (currentScore >= 40) return false;
        
        // Aggressive if low score
        if (currentScore < 20) return true;
        
        // Random for medium scores
        return Math.random() < 0.5;
    }

    /**
     * Strategic action targeting with priority-based selection
     * @param {Player} sourcePlayer - Player using the action card
     * @param {Card} card - Action card being used
     * @param {Array<Player>} allPlayers - All players in the game
     * @returns {Player|null} Target player or null
     */
    determineActionTarget(sourcePlayer, card, allPlayers) {
        const activeOpponents = allPlayers.filter(p => p.id !== sourcePlayer.id && p.status === 'active');
        
        if (card.value === 'freeze') {
            if (activeOpponents.length === 0) return sourcePlayer;
            
            // Priority 1: Target point leader (highest total score)
            const pointLeader = activeOpponents.reduce((leader, player) => 
                player.totalScore > leader.totalScore ? player : leader
            );
            if (pointLeader.totalScore > sourcePlayer.totalScore) {
                return pointLeader;
            }
            
            // Priority 2: Target players with x2 multiplier
            const x2Players = activeOpponents.filter(p => 
                p.modifierCards.some(card => card.value === 'x2')
            );
            if (x2Players.length > 0) {
                return x2Players.reduce((best, player) => 
                    player.calculateScore() > best.calculateScore() ? player : best
                );
            }
            
            // Priority 3: Target players with Second Chance
            const secondChancePlayers = activeOpponents.filter(p => p.hasSecondChance);
            if (secondChancePlayers.length > 0) {
                return secondChancePlayers.reduce((best, player) => 
                    player.calculateScore() > best.calculateScore() ? player : best
                );
            }
            
            // Priority 4: Target highest round score
            const bestRoundPlayer = activeOpponents.reduce((best, player) => 
                player.calculateScore() > best.calculateScore() ? player : best
            );
            return bestRoundPlayer;
        }
        
        if (card.value === 'flip3') {
            // If source has few cards, use self; else random active opponent
            if (sourcePlayer.numberCards.length < 3) return sourcePlayer;
            if (activeOpponents.length > 0) {
                return activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
            }
            return sourcePlayer;
        }
        
        return sourcePlayer;
    }
}

// Make available globally
window.AIManager = AIManager;