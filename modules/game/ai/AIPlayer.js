// AIPlayer.js - AI decision making and bot logic

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';
import gameEngine from '../core/GameEngine.js';

export class AIPlayer {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for AI turns
     */
    setupEventListeners() {
        eventBus.on(GameEvents.AI_TURN_REQUESTED, (data) => {
            this.takeAITurn(data.player);
        });
    }

    /**
     * Execute AI turn logic
     */
    takeAITurn(player) {
        console.log(`🤖 AIPlayer: Taking turn for ${player.name}`);
        
        // AI should be more aggressive early and cautious later
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.roundScore;
        
        // PRIORITY: If bot has Second Chance, keep hitting until they lose it
        if (player.hasSecondChance) {
            console.log(`${player.name} has Second Chance - playing aggressively!`);
            this.aiHit(player);
            return;
        }

        // PRIORITY: If bot has 6 unique numbers, be very aggressive to get Flip 7
        if (uniqueCount === 6) {
            console.log(`${player.name} has 6 unique numbers - going for Flip 7!`);
            this.aiHit(player);
            return;
        }

        // PRIORITY: If bot has 5 unique numbers, still be aggressive
        if (uniqueCount === 5 && currentScore < 35) {
            console.log(`${player.name} has 5 unique numbers - staying aggressive!`);
            this.aiHit(player);
            return;
        }

        // Calculate risk based on remaining unknown cards
        const totalCards = 13; // 0-12
        const unknownCards = totalCards - uniqueCount;
        const duplicateRisk = uniqueCount / totalCards;
        
        // Dynamic threshold based on game state
        const baseThreshold = 15;
        const riskAdjustment = duplicateRisk * 10; // Higher risk = lower threshold
        const threshold = Math.max(8, baseThreshold - riskAdjustment);

        console.log(`${player.name} analysis: score=${currentScore}, unique=${uniqueCount}, threshold=${threshold.toFixed(1)}, risk=${(duplicateRisk*100).toFixed(1)}%`);

        // Decision logic
        if (currentScore < threshold) {
            this.aiHit(player);
        } else {
            // Additional safety check for high-risk situations
            if (uniqueCount >= 8 && Math.random() > 0.7) { // 30% chance to take risk when many cards
                console.log(`${player.name} taking calculated risk with ${uniqueCount} unique cards`);
                this.aiHit(player);
            } else {
                this.aiStay(player);
            }
        }
    }

    /**
     * AI chooses to hit
     */
    aiHit(player) {
        console.log(`🎯 ${player.name} hits!`);
        
        // Emit AI action
        eventBus.emit(GameEvents.AI_ACTION_TAKEN, {
            playerId: player.id,
            action: 'hit'
        });

        // Note: GameEngine will handle turn progression automatically
    }

    /**
     * AI chooses to stay
     */
    aiStay(player) {
        console.log(`🛑 ${player.name} stays with ${player.roundScore} points!`);
        
        eventBus.emit(GameEvents.AI_ACTION_TAKEN, {
            playerId: player.id,
            action: 'stay'
        });

        // Let game engine handle the actual stay action
        gameEngine.handlePlayerStay();

        // Note: GameEngine will handle turn progression automatically
    }

    /**
     * Determine target for AI special action cards
     */
    determineAITarget(player, card) {
        console.log(`🎯 AIPlayer: Determining target for ${player.name}'s ${card.value} card`);
        
        const activePlayers = gameEngine.getActivePlayers().filter(p => p.id !== player.id);
        
        if (activePlayers.length === 0) {
            return null;
        }

        if (card.value === 'freeze') {
            return this.selectFreezeTarget(activePlayers);
        } else if (card.value === 'flip3') {
            return this.selectFlip3Target(activePlayers);
        }

        // Default: random target
        return activePlayers[Math.floor(Math.random() * activePlayers.length)];
    }

    /**
     * Select target for freeze card
     */
    selectFreezeTarget(activePlayers) {
        // Target the point leader
        const maxScore = Math.max(...activePlayers.map(p => p.roundScore));
        const pointLeaders = activePlayers.filter(p => p.roundScore === maxScore);
        
        if (pointLeaders.length > 0) {
            // If multiple leaders, prefer human player if they're leading
            const humanLeader = pointLeaders.find(p => p.isHuman);
            if (humanLeader) {
                console.log(`🎯 AI targeting human leader for freeze: ${humanLeader.name}`);
                return humanLeader;
            }
            
            // Otherwise random leader
            return pointLeaders[Math.floor(Math.random() * pointLeaders.length)];
        }
        
        // Fallback: random active player
        return activePlayers[Math.floor(Math.random() * activePlayers.length)];
    }

    /**
     * Select target for flip3 card
     */
    selectFlip3Target(activePlayers) {
        // For Flip 3, prefer targets with fewer unique numbers (more likely to get duplicates)
        const sortedByUniques = activePlayers.sort((a, b) => a.uniqueNumbers.size - b.uniqueNumbers.size);
        
        // Target player with fewest unique numbers
        const target = sortedByUniques[0];
        console.log(`🎯 AI targeting player with fewest uniques for Flip 3: ${target.name} (${target.uniqueNumbers.size} unique)`);
        
        return target;
    }

    /**
     * AI logic for second chance targeting
     */
    selectSecondChanceTarget(validRecipients) {
        if (validRecipients.length === 0) return null;
        
        // Prefer human player if available
        const humanRecipient = validRecipients.find(p => p.isHuman);
        if (humanRecipient) {
            console.log(`🎯 AI giving second chance to human player: ${humanRecipient.name}`);
            return humanRecipient;
        }
        
        // Otherwise random valid recipient
        return validRecipients[Math.floor(Math.random() * validRecipients.length)];
    }

    /**
     * Calculate AI risk tolerance based on game state
     */
    calculateRiskTolerance(player) {
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.roundScore;
        const gameState = gameEngine.getGameState();
        
        // Base risk tolerance
        let riskTolerance = 0.5;
        
        // Adjust for unique card count
        if (uniqueCount <= 3) riskTolerance += 0.3; // Be more aggressive early
        if (uniqueCount >= 8) riskTolerance -= 0.2; // Be more cautious late
        
        // Adjust for current score
        if (currentScore < 10) riskTolerance += 0.2;
        if (currentScore > 25) riskTolerance -= 0.3;
        
        // Adjust for special items
        if (player.hasSecondChance) riskTolerance += 0.4;
        
        // Adjust for round number (be more aggressive in later rounds)
        if (gameState.roundNumber > 3) riskTolerance += 0.1;
        
        return Math.max(0.1, Math.min(0.9, riskTolerance));
    }

    /**
     * Should AI use special action immediately
     */
    shouldUseSpecialActionImmediately(player, card) {
        if (card.value === 'second_chance') {
            // Always use second chance immediately if possible
            return true;
        }
        
        if (card.value === 'freeze') {
            // Use freeze if there are good targets
            const activePlayers = gameEngine.getActivePlayers().filter(p => p.id !== player.id);
            const worthwhileTargets = activePlayers.filter(p => p.roundScore > 15);
            return worthwhileTargets.length > 0;
        }
        
        if (card.value === 'flip3') {
            // Use flip3 strategically
            const activePlayers = gameEngine.getActivePlayers().filter(p => p.id !== player.id);
            const vulnerableTargets = activePlayers.filter(p => p.uniqueNumbers.size >= 6);
            return vulnerableTargets.length > 0;
        }
        
        return false;
    }
}

// Create singleton instance
const aiPlayer = new AIPlayer();
export default aiPlayer;