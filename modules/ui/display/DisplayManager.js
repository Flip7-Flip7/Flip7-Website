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
        
        // Update mobile display directly
        this.updateMobilePlayerDisplay(player);
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
        
        // Update mobile cards remaining counter
        this.updateMobileCardsRemaining(data.count);
    }
    
    /**
     * Update mobile cards remaining counter
     */
    updateMobileCardsRemaining(count) {
        if (window.innerWidth > 1024) return;
        
        let counterElement = document.querySelector('.mobile-cards-remaining');
        if (!counterElement) {
            counterElement = document.createElement('div');
            counterElement.className = 'mobile-cards-remaining';
            document.body.appendChild(counterElement);
        }
        
        counterElement.textContent = `${count} cards left`;
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
     * Update mobile player display directly
     */
    updateMobilePlayerDisplay(player) {
        if (window.innerWidth > 1024) return; // Only on mobile
        
        const mobileId = player.id === 'player' ? 'mobile-player' : `mobile-${player.id}`;
        const mobileContainer = document.getElementById(mobileId);
        
        if (!mobileContainer) return;
        
        // Build mobile player HTML
        const playerHTML = this.buildMobilePlayerHTML(player);
        mobileContainer.innerHTML = playerHTML;
        
        // Apply state classes
        this.updateMobilePlayerClasses(mobileContainer, player);
    }
    
    /**
     * Build mobile player HTML structure
     */
    buildMobilePlayerHTML(player) {
        const roundScore = this.calculateDisplayScore(player);
        const statusText = this.getStatusText(player.status);
        
        return `
            <div class="mobile-player-header">
                <span class="mobile-player-name">${player.name}</span>
                <div class="mobile-player-scores">
                    <span class="mobile-round-score">${roundScore}</span>
                    <span class="mobile-total-score">${player.totalScore}</span>
                </div>
            </div>
            <div class="mobile-player-status ${player.status}">${statusText}</div>
            <div class="mobile-cards-grid">
                ${this.buildMobileCardsHTML(player)}
            </div>
            ${this.buildMobileIndicatorsHTML(player)}
        `;
    }
    
    /**
     * Build mobile cards HTML
     */
    buildMobileCardsHTML(player) {
        const allCards = [
            ...player.numberCards.sort((a, b) => a.value - b.value),
            ...player.modifierCards,
            ...player.actionCards
        ];
        
        return allCards.map(card => {
            const imageStyle = this.hasCardImage(card) ? 
                `background-image: url('./images/${this.getCardImageName(card)}'); background-size: cover;` : '';
            
            return `<div class="mobile-card ${card.type} ${this.hasCardImage(card) ? 'custom-image' : ''}" 
                         style="${imageStyle}">
                        ${this.hasCardImage(card) ? '' : card.display}
                    </div>`;
        }).join('');
    }
    
    /**
     * Build mobile indicators HTML
     */
    buildMobileIndicatorsHTML(player) {
        let indicators = '';
        
        if (player.status === 'stayed') {
            indicators += '<div class="mobile-stayed-indicator">STAYED</div>';
        }
        
        if (player.status === 'frozen') {
            indicators += '<div class="mobile-frozen-indicator">FROZEN</div>';
        }
        
        return indicators;
    }
    
    /**
     * Update mobile player state classes
     */
    updateMobilePlayerClasses(container, player) {
        // Remove all state classes
        container.classList.remove('current-turn', 'frozen', 'busted', 'stayed', 'flip7');
        
        // Add state class
        container.classList.add(player.status);
        
        // Add current turn highlight
        const currentPlayerIndex = window.gameState?.currentPlayerIndex;
        if (currentPlayerIndex >= 0 && window.gameState?.players[currentPlayerIndex]?.id === player.id) {
            container.classList.add('current-turn');
        }
    }
    
    /**
     * Get display text for player status
     */
    getStatusText(status) {
        const statusMap = {
            'waiting': 'Waiting',
            'active': 'Playing',
            'stayed': 'Stayed',
            'busted': 'BUSTED',
            'frozen': 'Frozen',
            'flip7': 'FLIP 7!'
        };
        return statusMap[status] || status;
    }

    /**
     * Clone content to mobile container (legacy method)
     */
    cloneMobileContent(desktopPlayer, mobilePlayer, preserveIndicators) {
        // This method is now deprecated - use updateMobilePlayerDisplay instead
        // Keep for backward compatibility if needed
        const playerId = desktopPlayer.id;
        const player = window.gameState?.players?.find(p => p.id === playerId);
        
        if (player && window.innerWidth <= 1024) {
            this.updateMobilePlayerDisplay(player);
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