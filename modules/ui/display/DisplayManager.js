// DisplayManager.js - Handles all DOM updates and UI synchronization

import eventBus from '../../events/EventBus.js';
import { GameEvents } from '../../events/GameEvents.js';

export class DisplayManager {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for display updates
     */
    setupEventListeners() {
        eventBus.on(GameEvents.DISPLAY_UPDATE_REQUIRED, () => this.updateDisplay());
        eventBus.on(GameEvents.SCORE_UPDATED, (data) => this.updatePlayerScore(data));
        eventBus.on(GameEvents.CARDS_REMAINING_UPDATE, (data) => this.updateCardsRemaining(data));
        eventBus.on(GameEvents.SCOREBOARD_UPDATE, (data) => this.updateScoreboard(data));
        eventBus.on(GameEvents.CARD_ADDED_TO_HAND, (data) => this.addCardToDisplay(data));
        eventBus.on(GameEvents.MOBILE_SYNC_REQUIRED, () => this.syncMobileDisplay());
    }

    /**
     * Main display update method
     */
    updateDisplay() {
        // Update all player displays
        this.updateAllPlayers();
        
        // Update game info
        this.updateGameInfo();
        
        // Sync mobile if needed
        if (window.innerWidth <= 1024) {
            this.syncMobileDisplay();
        }
    }

    /**
     * Update all player displays
     */
    updateAllPlayers() {
        const players = window.gameState?.players || [];
        
        players.forEach(player => {
            this.updatePlayerDisplay(player);
        });
    }

    /**
     * Update individual player display
     */
    updatePlayerDisplay(player) {
        const container = document.getElementById(player.id);
        if (!container) return;
        
        // Update scores
        this.updatePlayerScoreDisplay(container, player);
        
        // Update status
        this.updatePlayerStatus(container, player);
        
        // Update cards
        this.updatePlayerCards(container, player);
        
        // Update visual state classes
        this.updatePlayerClasses(container, player);
    }

    /**
     * Update player score display
     */
    updatePlayerScoreDisplay(container, player) {
        const roundScoreElement = container.querySelector('.round-value');
        const totalScoreElement = container.querySelector('.score-value');
        
        if (roundScoreElement) {
            roundScoreElement.textContent = this.calculateDisplayScore(player);
        }
        
        if (totalScoreElement) {
            totalScoreElement.textContent = player.totalScore;
        }
    }

    /**
     * Calculate display score (real-time)
     */
    calculateDisplayScore(player) {
        if (player.status === 'busted') return 0;
        
        let score = 0;
        
        // Sum number cards
        player.numberCards.forEach(card => {
            score += card.value;
        });
        
        // Apply modifiers
        let hasX2 = false;
        let bonusPoints = 0;
        
        player.modifierCards.forEach(card => {
            if (card.value === 'x2') {
                hasX2 = true;
            } else {
                bonusPoints += card.value;
            }
        });
        
        if (hasX2) score *= 2;
        score += bonusPoints;
        
        // Add Flip 7 bonus
        if (player.uniqueNumbers.size === 7) {
            score += 15;
        }
        
        return score;
    }

    /**
     * Update player status display
     */
    updatePlayerStatus(container, player) {
        const statusElement = container.querySelector('.player-status');
        if (!statusElement) return;
        
        const statusMap = {
            'waiting': 'Waiting',
            'active': 'Playing',
            'stayed': 'Stayed',
            'busted': 'BUSTED',
            'frozen': 'Frozen',
            'flip7': 'FLIP 7!'
        };
        
        statusElement.textContent = statusMap[player.status] || player.status;
        statusElement.className = `player-status ${player.status}`;
    }

    /**
     * Update player cards display
     */
    updatePlayerCards(container, player) {
        const cardContainer = player.id === 'player' 
            ? document.getElementById('player-cards')
            : container.querySelector('.player-cards');
            
        if (!cardContainer) return;
        
        // Clear and rebuild cards
        cardContainer.innerHTML = '';
        
        // Add all cards in order
        const allCards = [
            ...player.numberCards.sort((a, b) => a.value - b.value),
            ...player.modifierCards,
            ...player.actionCards
        ];
        
        allCards.forEach(card => {
            const cardElement = this.createCardElement(card);
            cardContainer.appendChild(cardElement);
        });
    }

    /**
     * Create card DOM element
     */
    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.type}`;
        
        if (this.hasCardImage(card)) {
            const imageName = this.getCardImageName(card);
            cardDiv.style.backgroundImage = `url('./images/${imageName}')`;
            cardDiv.style.backgroundSize = 'cover';
            cardDiv.classList.add('custom-image');
        } else {
            cardDiv.innerHTML = `<span>${card.display}</span>`;
        }
        
        return cardDiv;
    }

    /**
     * Update player visual state classes
     */
    updatePlayerClasses(container, player) {
        // Remove all state classes
        container.classList.remove('current-turn', 'frozen', 'busted', 'stayed', 'flip7');
        
        // Add appropriate state class
        if (player.status === 'frozen') {
            container.classList.add('frozen');
        } else if (player.status === 'busted') {
            container.classList.add('busted');
        } else if (player.status === 'stayed') {
            container.classList.add('stayed');
        } else if (player.status === 'flip7') {
            container.classList.add('flip7');
        }
        
        // Add current turn highlight
        const currentPlayerIndex = window.gameState?.currentPlayerIndex;
        if (currentPlayerIndex >= 0 && window.gameState?.players[currentPlayerIndex]?.id === player.id) {
            container.classList.add('current-turn');
        }
    }

    /**
     * Update game info displays
     */
    updateGameInfo() {
        // Update round number
        const roundElement = document.getElementById('round-number');
        if (roundElement && window.gameState) {
            roundElement.textContent = `Round ${window.gameState.roundNumber}`;
        }
        
        // Update cards remaining
        const cardsRemaining = window.gameState?.deck?.length || 0;
        this.updateCardsRemaining({ count: cardsRemaining });
    }

    /**
     * Update cards remaining display
     */
    updateCardsRemaining(data) {
        const elements = [
            document.getElementById('cards-remaining'),
            document.getElementById('mobile-cards-remaining')
        ];
        
        elements.forEach(el => {
            if (el) el.textContent = data.count;
        });
    }

    /**
     * Update scoreboard
     */
    updateScoreboard(data) {
        const scoreboards = document.querySelectorAll('#scoreboard-content');
        const players = data.players || window.gameState?.players || [];
        
        scoreboards.forEach(scoreboard => {
            scoreboard.innerHTML = '';
            
            const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
            
            sortedPlayers.forEach(player => {
                const entry = document.createElement('div');
                entry.className = 'score-entry';
                entry.innerHTML = `
                    <span class="player-name">${player.name}</span>
                    <span class="player-score">${player.totalScore}</span>
                `;
                scoreboard.appendChild(entry);
            });
        });
    }

    /**
     * Sync mobile display
     */
    syncMobileDisplay() {
        const players = [
            { desktop: 'player', mobile: 'mobile-player' },
            { desktop: 'opponent1', mobile: 'mobile-opponent1' },
            { desktop: 'opponent2', mobile: 'mobile-opponent2' },
            { desktop: 'opponent3', mobile: 'mobile-opponent3' }
        ];
        
        players.forEach(playerMap => {
            const desktopPlayer = document.getElementById(playerMap.desktop);
            const mobilePlayer = document.getElementById(playerMap.mobile);
            
            if (desktopPlayer && mobilePlayer) {
                // Preserve indicators if not starting new round
                const shouldPreserve = !window.gameState?.isStartingNewRound;
                
                // Clone content while preserving indicators
                this.cloneMobileContent(desktopPlayer, mobilePlayer, shouldPreserve);
            }
        });
    }

    /**
     * Clone content to mobile container
     */
    cloneMobileContent(desktopPlayer, mobilePlayer, preserveIndicators) {
        // Save existing indicators if needed
        let existingFreezeIndicator = null;
        let existingStayedIndicator = null;
        
        if (preserveIndicators) {
            existingFreezeIndicator = mobilePlayer.querySelector('.frozen-indicator');
            existingStayedIndicator = mobilePlayer.querySelector('.stayed-indicator');
        }
        
        // Clear and clone
        mobilePlayer.innerHTML = '';
        mobilePlayer.className = desktopPlayer.className;
        
        // Clone main elements
        const elements = ['player-header', 'player-stats', 'player-cards'];
        elements.forEach(className => {
            const element = desktopPlayer.querySelector(`.${className}`);
            if (element) {
                mobilePlayer.appendChild(element.cloneNode(true));
            }
        });
        
        // Restore indicators
        if (preserveIndicators) {
            if (existingFreezeIndicator) {
                mobilePlayer.appendChild(existingFreezeIndicator);
            }
            if (existingStayedIndicator) {
                mobilePlayer.appendChild(existingStayedIndicator);
            }
        }
    }

    /**
     * Check if card has image
     */
    hasCardImage(card) {
        return true; // All cards have images now
    }

    /**
     * Get card image filename
     */
    getCardImageName(card) {
        if (card.type === 'number') {
            return `card-${card.value}.png`;
        } else if (card.type === 'modifier') {
            if (card.value === 'x2') return 'card-*2.png';
            return `card-+${card.value}.png`;
        } else if (card.type === 'action') {
            const actionMap = {
                'freeze': 'card-Freeze.png',
                'flip3': 'card-Flip3.png',
                'second_chance': 'card-SecondChance.png'
            };
            return actionMap[card.value];
        }
    }

    /**
     * Show message to user
     */
    showMessage(message) {
        const messageElement = document.getElementById('game-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.display = 'block';
            
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 2000);
        }
    }

    /**
     * Add to game log
     */
    addToLog(message) {
        const logContents = document.querySelectorAll('#log-content');
        logContents.forEach(logContent => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            logContent.appendChild(entry);
            logContent.scrollTop = logContent.scrollHeight;
        });
    }
}

// Create singleton instance
const displayManager = new DisplayManager();
export default displayManager;