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
        console.log(`🤖 AIPlayer: Taking turn for ${player.name} (${player.playstyle} playstyle)`);
        
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

        // Use playstyle-based decision making
        this.makePlaystyleDecision(player);
    }

    /**
     * Make AI decision based on playstyle
     */
    makePlaystyleDecision(player) {
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.roundScore;
        const playstyle = player.playstyle;
        
        // Calculate risk based on remaining unknown cards
        const totalCards = 13; // 0-12
        const duplicateRisk = uniqueCount / totalCards;
        
        let baseThreshold = 15;
        let riskMultiplier = 1.0;
        
        // Adjust base behavior by playstyle
        if (playstyle === 'aggressive') {
            baseThreshold = 20;  // Higher threshold = hit more often
            riskMultiplier = 1.3; // Take more risks
            console.log(`${player.name} (aggressive) willing to take more risks`);
        } else if (playstyle === 'conservative') {
            baseThreshold = 12;   // Lower threshold = stay more often  
            riskMultiplier = 0.7; // Take fewer risks
            console.log(`${player.name} (conservative) playing it safe`);
        } else if (playstyle === 'middle') {
            baseThreshold = 15;   // Default threshold
            riskMultiplier = 1.0; // Default risk level
            console.log(`${player.name} (middle) using balanced approach`);
        }
        
        // Apply risk adjustment
        const riskAdjustment = duplicateRisk * 10 * riskMultiplier;
        const threshold = Math.max(8, baseThreshold - riskAdjustment);
        
        console.log(`${player.name} analysis: score=${currentScore}, unique=${uniqueCount}, threshold=${threshold.toFixed(1)}, risk=${(duplicateRisk*100).toFixed(1)}%`);

        // Decision logic
        if (currentScore < threshold) {
            this.aiHit(player);
        } else {
            // High-risk decision varies by playstyle
            let riskTakeChance = 0.3; // Default 30% chance
            if (playstyle === 'aggressive') riskTakeChance = 0.5; // 50% chance
            if (playstyle === 'conservative') riskTakeChance = 0.1; // 10% chance
            if (playstyle === 'middle') riskTakeChance = 0.3; // 30% chance
            
            if (uniqueCount >= 8 && Math.random() < riskTakeChance) {
                console.log(`${player.name} (${playstyle}) taking calculated risk with ${uniqueCount} unique cards`);
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

        // Note: GameEngine will handle the actual stay action and turn progression automatically
    }

    /**
     * Determine target for AI special action cards
     */
    determineAITarget(player, card) {
        console.log(`🎯 AIPlayer: Determining target for ${player.name}'s ${card.value} card`);
        
        // Get all active players including self for targeting consideration
        const allActivePlayers = gameEngine.getActivePlayers();
        const otherActivePlayers = allActivePlayers.filter(p => p.id !== player.id);
        
        if (allActivePlayers.length === 0) {
            return null;
        }

        if (card.value === 'freeze') {
            // Freeze card can't target self - use other players only
            return this.selectFreezeTarget(otherActivePlayers, player);
        } else if (card.value === 'flip3') {
            // Flip3 can target self or others - pass all active players
            return this.selectFlip3Target(allActivePlayers, player);
        }

        // Default: random target from others
        return otherActivePlayers[Math.floor(Math.random() * otherActivePlayers.length)];
    }

    /**
     * Select target for freeze card
     */
    selectFreezeTarget(activePlayers, sourcePlayer) {
        // Use playstyle-specific targeting logic
        return this.selectTargetByPlaystyle(activePlayers, sourcePlayer, 'freeze');
    }

    /**
     * Select target for flip3 card
     */
    selectFlip3Target(allActivePlayers, sourcePlayer) {
        // Calculate total cards for each player
        const playersWithCardCounts = allActivePlayers.map(player => {
            const totalCards = player.numberCards.length + player.modifierCards.length + player.actionCards.length;
            return { player, totalCards };
        });
        
        // Check if AI should target themselves (if they have ≤2 cards)
        const sourceCardCount = sourcePlayer.numberCards.length + sourcePlayer.modifierCards.length + sourcePlayer.actionCards.length;
        if (sourceCardCount <= 2) {
            console.log(`🎯 AI targeting self for Flip 3: ${sourcePlayer.name} has only ${sourceCardCount} cards`);
            return sourcePlayer;
        }
        
        // Find players with 4+ cards (excluding self)
        const viableTargets = playersWithCardCounts.filter(({ player, totalCards }) => 
            totalCards >= 4 && player.id !== sourcePlayer.id
        );
        
        if (viableTargets.length > 0) {
            // Sort by most cards descending - target the player with most cards
            viableTargets.sort((a, b) => b.totalCards - a.totalCards);
            const target = viableTargets[0];
            console.log(`🎯 AI targeting player with most cards for Flip 3: ${target.player.name} (${target.totalCards} cards)`);
            return target.player;
        }
        
        // Fallback: target any other player if no one has 4+ cards
        const otherPlayers = playersWithCardCounts.filter(({ player }) => player.id !== sourcePlayer.id);
        if (otherPlayers.length > 0) {
            const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            console.log(`🎯 AI targeting random player for Flip 3 (no 4+ card targets): ${randomTarget.player.name} (${randomTarget.totalCards} cards)`);
            return randomTarget.player;
        }
        
        // Last resort: target self
        console.log(`🎯 AI targeting self for Flip 3 (no other targets): ${sourcePlayer.name}`);
        return sourcePlayer;
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
     * Select target based on AI playstyle
     */
    selectTargetByPlaystyle(activePlayers, sourcePlayer, cardType) {
        const playstyle = sourcePlayer.playstyle;
        
        if (cardType === 'freeze') {
            return this.selectFreezeTargetByPlaystyle(activePlayers, sourcePlayer, playstyle);
        }
        
        // Fallback to basic targeting
        return activePlayers[Math.floor(Math.random() * activePlayers.length)];
    }

    /**
     * Freeze targeting logic based on playstyle
     */
    selectFreezeTargetByPlaystyle(activePlayers, sourcePlayer, playstyle) {
        // Get point leaders
        const maxScore = Math.max(...activePlayers.map(p => p.roundScore));
        const pointLeaders = activePlayers.filter(p => p.roundScore === maxScore);
        
        if (playstyle === 'aggressive') {
            // Aggressive: Always target the highest scorer, prefer human
            if (pointLeaders.length > 0) {
                const humanLeader = pointLeaders.find(p => p.isHuman);
                if (humanLeader) {
                    console.log(`🎯 Aggressive AI targeting human leader for freeze: ${humanLeader.name}`);
                    return humanLeader;
                }
                const target = pointLeaders[0];
                console.log(`🎯 Aggressive AI targeting point leader for freeze: ${target.name} (${target.roundScore} pts)`);
                return target;
            }
        } else if (playstyle === 'conservative') {
            // Conservative: Only freeze if there's a significant point lead (>15 points)
            if (pointLeaders.length > 0 && maxScore > 15) {
                const target = pointLeaders[Math.floor(Math.random() * pointLeaders.length)];
                console.log(`🎯 Conservative AI targeting point leader for freeze: ${target.name} (${target.roundScore} pts)`);
                return target;
            } else {
                // Don't waste freeze card, target randomly
                const target = activePlayers[Math.floor(Math.random() * activePlayers.length)];
                console.log(`🎯 Conservative AI reluctantly using freeze on: ${target.name} (scores not high enough)`);
                return target;
            }
        } else if (playstyle === 'middle') {
            // Middle: Target point leaders if they have >10 points
            if (pointLeaders.length > 0 && maxScore > 10) {
                const humanLeader = pointLeaders.find(p => p.isHuman);
                if (humanLeader && Math.random() < 0.7) { // 70% chance to prefer human
                    console.log(`🎯 Middle AI targeting human leader for freeze: ${humanLeader.name}`);
                    return humanLeader;
                }
                const target = pointLeaders[Math.floor(Math.random() * pointLeaders.length)];
                console.log(`🎯 Middle AI targeting point leader for freeze: ${target.name} (${target.roundScore} pts)`);
                return target;
            }
        }
        
        // Fallback: random target
        const target = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        console.log(`🎯 AI using fallback freeze targeting: ${target.name}`);
        return target;
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