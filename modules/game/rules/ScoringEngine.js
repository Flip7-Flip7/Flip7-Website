// ScoringEngine.js - Handles all scoring calculations

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class ScoringEngine {
    constructor() {
        this.FLIP7_BONUS = 15;
        this.WINNING_SCORE_DEFAULT = 200;
    }

    /**
     * Calculate round score for a player
     */
    calculateRoundScore(player) {
        if (player.status === 'busted') {
            return 0;
        }

        let score = 0;
        
        // Step 1: Sum all number cards
        score = this.sumNumberCards(player.numberCards);
        
        // Step 2: Apply modifiers
        score = this.applyModifiers(score, player.modifierCards);
        
        // Step 3: Add Flip 7 bonus if applicable
        if (player.uniqueNumbers.size === 7) {
            score += this.FLIP7_BONUS;
        }
        
        return score;
    }

    /**
     * Sum number cards
     */
    sumNumberCards(numberCards) {
        return numberCards.reduce((sum, card) => sum + card.value, 0);
    }

    /**
     * Apply modifier cards to score
     */
    applyModifiers(baseScore, modifierCards) {
        let score = baseScore;
        let hasX2 = false;
        let bonusPoints = 0;
        
        modifierCards.forEach(card => {
            if (card.value === 'x2') {
                hasX2 = true;
            } else {
                bonusPoints += card.value;
            }
        });
        
        // Apply x2 multiplier first (to base score only)
        if (hasX2) {
            score *= 2;
        }
        
        // Then add bonus points
        score += bonusPoints;
        
        return score;
    }

    /**
     * Calculate real-time score for display
     */
    calculateCurrentScore(player) {
        // Real-time calculation includes everything
        return this.calculateRoundScore(player);
    }

    /**
     * Check if player has won the game
     */
    checkForWinner(players, winningScore = this.WINNING_SCORE_DEFAULT) {
        const winner = players.find(player => player.totalScore >= winningScore);
        
        if (winner) {
            // Find actual highest score in case of tie
            const highestScore = Math.max(...players.map(p => p.totalScore));
            const winners = players.filter(p => p.totalScore === highestScore);
            
            // Return the first winner if multiple tied
            return winners[0];
        }
        
        return null;
    }

    /**
     * Get current leader
     */
    getLeader(players) {
        if (!players || players.length === 0) return null;
        
        const maxScore = Math.max(...players.map(p => p.totalScore));
        return players.find(p => p.totalScore === maxScore);
    }

    /**
     * Get players sorted by score
     */
    getPlayerRankings(players) {
        return [...players].sort((a, b) => b.totalScore - a.totalScore);
    }

    /**
     * Calculate points needed to win
     */
    getPointsToWin(player, winningScore = this.WINNING_SCORE_DEFAULT) {
        return Math.max(0, winningScore - player.totalScore);
    }

    /**
     * Emit score update event
     */
    emitScoreUpdate(player) {
        eventBus.emit(GameEvents.SCORE_UPDATED, {
            playerId: player.id,
            roundScore: player.roundScore,
            totalScore: player.totalScore,
            hasFlip7: player.uniqueNumbers.size === 7
        });
    }

    /**
     * Calculate round scores for all players
     */
    calculateAllRoundScores(players) {
        players.forEach(player => {
            if (player.status !== 'busted') {
                player.roundScore = this.calculateRoundScore(player);
                this.emitScoreUpdate(player);
            }
        });
        
        eventBus.emit(GameEvents.ROUND_SCORE_CALCULATED, {
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                roundScore: p.roundScore
            }))
        });
    }

    /**
     * Apply round scores to total scores
     */
    applyRoundScoresToTotals(players) {
        players.forEach(player => {
            player.totalScore += player.roundScore;
        });
        
        // Update scoreboard
        eventBus.emit(GameEvents.SCOREBOARD_UPDATE, {
            players: this.getPlayerRankings(players)
        });
    }

    /**
     * Get score breakdown for display
     */
    getScoreBreakdown(player) {
        const breakdown = {
            numberCards: this.sumNumberCards(player.numberCards),
            hasX2: false,
            bonusPoints: 0,
            flip7Bonus: 0,
            total: 0
        };
        
        // Check modifiers
        player.modifierCards.forEach(card => {
            if (card.value === 'x2') {
                breakdown.hasX2 = true;
            } else {
                breakdown.bonusPoints += card.value;
            }
        });
        
        // Calculate total
        breakdown.total = breakdown.numberCards;
        if (breakdown.hasX2) {
            breakdown.total *= 2;
        }
        breakdown.total += breakdown.bonusPoints;
        
        // Add Flip 7 bonus
        if (player.uniqueNumbers.size === 7) {
            breakdown.flip7Bonus = this.FLIP7_BONUS;
            breakdown.total += breakdown.flip7Bonus;
        }
        
        return breakdown;
    }
}

// Create singleton instance
const scoringEngine = new ScoringEngine();
export default scoringEngine;