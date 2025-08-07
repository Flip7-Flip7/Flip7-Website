// Flip 7 Game Logic

class Flip7Game {
    constructor() {
        this.deck = [];
        this.discardPile = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.roundNumber = 1;
        this.gameActive = false;
        this.winningScore = 200;
        this.isInitialDealing = false;
        this.actionQueue = [];
        this.isProcessingFlip3 = false;
        
        // Flag to prevent mobile sync during bust animations
        this.isBustAnimating = false;
        
        // Flag to prevent multiple rapid button clicks
        this.isProcessingPlayerAction = false;
        
        // Store custom player name (defaults to "You")
        this.playerName = "You";
        
        this.initializePlayers();
        this.initializeEventListeners();
        this.updateDisplay();
        
        // Auto-start game immediately on page load
        setTimeout(() => {
            console.log('Auto-starting game...');
            this.playerName = "Player";
            this.players[0].name = "Player";
            this.startNewGame();
        }, 100);
    }

    initializePlayers() {
        this.players = [
            {
                id: 'player',
                name: this.playerName,
                totalScore: 0,
                roundScore: 0,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                status: 'waiting',
                isHuman: true,
                hasSecondChance: false
            },
            {
                id: 'opponent1',
                name: 'AI Bot 1',
                totalScore: 0,
                roundScore: 0,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                status: 'waiting',
                isHuman: false,
                hasSecondChance: false
            },
            {
                id: 'opponent2',
                name: 'AI Bot 2',
                totalScore: 0,
                roundScore: 0,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                status: 'waiting',
                isHuman: false,
                hasSecondChance: false
            },
            {
                id: 'opponent3',
                name: 'AI Bot 3',
                totalScore: 0,
                roundScore: 0,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                status: 'waiting',
                isHuman: false,
                hasSecondChance: false
            }
        ];
    }

    initializeEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('hit-btn').addEventListener('click', () => this.playerHit());
        document.getElementById('stay-btn').addEventListener('click', () => this.playerStay());
        
        // Add mobile button event listeners
        document.getElementById('mobile-hit-btn').addEventListener('click', () => this.playerHit());
        document.getElementById('mobile-stay-btn').addEventListener('click', () => this.playerStay());
        document.getElementById('rules-btn').addEventListener('click', () => this.showRules());
        document.getElementById('close-rules').addEventListener('click', () => this.hideRules());
        
        // Mobile action buttons in controls section
        const mobileHitBtn = document.getElementById('mobile-hit-btn');
        const mobileStayBtn = document.getElementById('mobile-stay-btn');
        if (mobileHitBtn) {
            mobileHitBtn.addEventListener('click', () => this.playerHit());
        }
        if (mobileStayBtn) {
            mobileStayBtn.addEventListener('click', () => this.playerStay());
        }
        
        // Mobile rules button
        const mobileRulesBtn = document.getElementById('mobile-rules-btn');
        if (mobileRulesBtn) {
            mobileRulesBtn.addEventListener('click', () => this.showRules());
        }
        
        // Mobile start button removed - game auto-starts
        
        // Popup no longer used - game auto-starts
        
        // Desktop game message button (start game directly)
        const gameMessageBtn = document.getElementById('game-message');
        if (gameMessageBtn) {
            gameMessageBtn.addEventListener('click', () => {
                this.playerName = "Player";
                this.players[0].name = "Player";
                this.startNewGame();
            });
        }
        
        document.getElementById('win-points').addEventListener('change', (e) => {
            if (!this.gameActive) {
                this.winningScore = parseInt(e.target.value);
            } else {
                // Reset to current winning score if game is active
                e.target.value = this.winningScore;
            }
        });
        
        // Handle mobile layout
        this.handleMobileLayout();
        window.addEventListener('resize', () => this.handleMobileLayout());
    }

    handleMobileLayout() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            this.setupMobilePlayerAreas();
            this.syncMobileCardCount();
        }
    }
    
    setupMobilePlayerAreas() {
        // Skip if we're in the middle of a bust animation to prevent duplicate cards
        if (this.isBustAnimating) {
            return;
        }
        
        // Clone player content to mobile areas
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
                // Clear mobile container first to prevent duplication artifacts
                mobilePlayer.innerHTML = '';
                // Then copy content from desktop
                mobilePlayer.innerHTML = desktopPlayer.innerHTML;
                mobilePlayer.className = desktopPlayer.className;
                
                // Apply dynamic height classes based on card content
                this.applyMobilePlayerHeightClass(mobilePlayer, playerMap.desktop);
                
                // Reorganize mobile layout with horizontal card arrangement
                const h3 = mobilePlayer.querySelector('h3');
                const playerStats = mobilePlayer.querySelector('.player-stats');
                const modifierCards = mobilePlayer.querySelector('.modifier-cards');
                const numberCards = mobilePlayer.querySelector('.number-cards');
                const uniqueCounter = mobilePlayer.querySelector('.unique-counter');
                const actionButtons = mobilePlayer.querySelector('.action-buttons');
                
                if (h3 && numberCards && modifierCards && uniqueCounter) {
                    // Create new horizontal layout structure
                    mobilePlayer.innerHTML = '';
                    
                    // Add player name
                    mobilePlayer.appendChild(h3);
                    
                    // Create horizontal cards container
                    const cardsContainer = document.createElement('div');
                    cardsContainer.className = 'mobile-cards-container';
                    
                    // Number cards section (left)
                    const numberSection = document.createElement('div');
                    numberSection.className = 'mobile-number-cards-section';
                    numberSection.appendChild(numberCards);
                    
                    // Modifier cards section (right)
                    const modifierSection = document.createElement('div');
                    modifierSection.className = 'mobile-modifier-cards-section';
                    modifierSection.appendChild(modifierCards);
                    if (actionButtons) {
                        modifierSection.appendChild(actionButtons);
                    }
                    
                    cardsContainer.appendChild(numberSection);
                    cardsContainer.appendChild(modifierSection);
                    mobilePlayer.appendChild(cardsContainer);
                    
                    // Add unique counter with scores
                    const scoreValue = playerStats?.querySelector('.score-value');
                    const roundValue = playerStats?.querySelector('.round-value');
                    const uniqueCount = uniqueCounter.querySelector('.unique-count');
                    
                    if (scoreValue && roundValue && uniqueCount) {
                        const totalScore = scoreValue.textContent;
                        const roundScore = roundValue.textContent;
                        const uniqueText = uniqueCount.innerHTML;
                        
                        uniqueCounter.innerHTML = `
                            <span class="mobile-total-score">Total: ${totalScore}</span>
                            <span class="unique-count">${uniqueText}</span>
                            <span class="mobile-round-score">Round: ${roundScore}</span>
                        `;
                    }
                    
                    mobilePlayer.appendChild(uniqueCounter);
                }
            }
        });
        
        // Mobile buttons are now in the controls section
        // Event listeners are attached once in setupEventListeners()
        
        // Update mobile cards remaining counter
        const desktopCardsRemaining = document.getElementById('cards-remaining');
        const mobileCardsRemaining = document.getElementById('mobile-cards-remaining');
        if (desktopCardsRemaining && mobileCardsRemaining) {
            mobileCardsRemaining.textContent = desktopCardsRemaining.textContent;
        }
    }

    applyMobilePlayerHeightClass(mobilePlayerElement, desktopPlayerId) {
        // Find the corresponding player data
        const player = this.players.find(p => p.id === desktopPlayerId);
        if (!player) return;

        // Remove all existing height classes
        mobilePlayerElement.classList.remove('mobile-player-empty', 'mobile-player-small', 'mobile-player-medium', 'mobile-player-large', 'mobile-player-with-buttons');

        // Count cards to determine height class
        const cardCount = player.numberCards.length;
        const isHumanPlayer = player.isHuman;
        const isCurrentTurn = this.currentPlayerIndex >= 0 && this.players[this.currentPlayerIndex].id === desktopPlayerId;
        const showButtons = isHumanPlayer && isCurrentTurn && player.status === 'active';

        // Apply height class based on card count and button visibility
        if (showButtons) {
            mobilePlayerElement.classList.add('mobile-player-with-buttons');
        } else if (cardCount === 0) {
            mobilePlayerElement.classList.add('mobile-player-empty');
        } else if (cardCount <= 2) {
            mobilePlayerElement.classList.add('mobile-player-small');
        } else if (cardCount <= 5) {
            mobilePlayerElement.classList.add('mobile-player-medium');
        } else {
            mobilePlayerElement.classList.add('mobile-player-large');
        }
    }
    
    syncMobileCardCount() {
        // Keep mobile card count in sync
        const desktopCardsRemaining = document.getElementById('cards-remaining');
        const mobileCardsRemaining = document.getElementById('mobile-cards-remaining');
        if (desktopCardsRemaining && mobileCardsRemaining) {
            mobileCardsRemaining.textContent = desktopCardsRemaining.textContent;
        }
    }

    createDeck() {
        this.deck = [];
        
        // Add number cards (0-12 with varying quantities)
        const numberCardCounts = {
            0: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
            7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12
        };
        
        for (let number in numberCardCounts) {
            for (let i = 0; i < numberCardCounts[number]; i++) {
                this.deck.push({
                    type: 'number',
                    value: parseInt(number),
                    display: number
                });
            }
        }
        
        // Add action cards
        for (let i = 0; i < 3; i++) {
            this.deck.push({ type: 'action', value: 'freeze', display: 'Freeze' });
            this.deck.push({ type: 'action', value: 'flip3', display: 'Flip Three' });
            this.deck.push({ type: 'action', value: 'second_chance', display: 'Second Chance' });
        }
        
        // Add modifier cards
        this.deck.push({ type: 'modifier', value: 2, display: '+2' });
        this.deck.push({ type: 'modifier', value: 4, display: '+4' });
        this.deck.push({ type: 'modifier', value: 6, display: '+6' });
        this.deck.push({ type: 'modifier', value: 8, display: '+8' });
        this.deck.push({ type: 'modifier', value: 10, display: '+10' });
        this.deck.push({ type: 'modifier', value: 'x2', display: 'x2' });
        
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    startNewGame() {
        console.log('Starting new game...');
        this.gameActive = true;
        this.roundNumber = 1;
        this.players.forEach(player => {
            player.totalScore = 0;
            player.status = 'waiting';
        });
        
        // Hide welcome message and pre-game controls
        this.hideStartPopups();
        const preGameControls = document.getElementById('pre-game-controls');
        if (preGameControls) preGameControls.style.display = 'none';
        
        // Update mobile status banner
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        const mobileGameInfo = document.getElementById('mobile-game-info');
        if (mobileTurnIndicator) {
            mobileTurnIndicator.textContent = 'Game Starting...';
            mobileGameInfo.textContent = `Round 1 • Target: ${this.winningScore} pts`;
        }
        
        // Disable points setting during game
        const winPoints = document.getElementById('win-points');
        if (winPoints) winPoints.disabled = true;
        
        // On mobile, always start with Bot 3 as dealer so human player goes first
        // On desktop, randomly assign dealer
        if (window.innerWidth <= 768) {
            this.dealerIndex = 3; // Bot 3 (opponent3) is index 3
        } else {
            this.dealerIndex = Math.floor(Math.random() * this.players.length);
        }
        this.addToLog(`${this.players[this.dealerIndex].name} is the dealer`);
        
        // Create a fresh deck for new game
        this.createDeck();
        this.discardPile = [];
        
        console.log('Deck created, starting round...');
        this.startNewRound();
        this.addToLog('New game started!');
    }

    startNewRound() {
        // Reset round-specific data
        this.players.forEach(player => {
            player.roundScore = 0;
            player.numberCards = [];
            player.modifierCards = [];
            player.actionCards = [];
            player.uniqueNumbers.clear();
            player.status = 'active';
            player.hasSecondChance = false;
            
            // Clear frozen and busted effects
            const container = document.getElementById(player.id);
            container.classList.remove('frozen', 'busted');
            const frozenIndicator = container.querySelector('.frozen-indicator');
            if (frozenIndicator) {
                frozenIndicator.remove();
            }
            
            // Clear all visual cards from DOM
            const isMainPlayer = player.id === 'player';
            const numberContainer = isMainPlayer 
                ? document.getElementById('player-numbers')
                : container.querySelector('.number-cards');
            const modifierContainer = isMainPlayer
                ? document.getElementById('player-modifiers')
                : container.querySelector('.modifier-cards');
                
            if (numberContainer) {
                numberContainer.innerHTML = '';
            }
            if (modifierContainer) {
                modifierContainer.innerHTML = '';
            }
        });
        
        // Create new deck if needed
        if (this.deck.length < 20) {
            this.deck = [...this.deck, ...this.discardPile];
            this.discardPile = [];
            this.shuffleDeck();
        } else if (this.deck.length === 0) {
            this.createDeck();
        }
        
        // Human player always goes first
        this.currentPlayerIndex = 0;
        
        this.updateDisplay();
        
        // Start round and deal initial cards
        this.addToLog(`Round ${this.roundNumber} started!`);
        this.addToLog(`${this.players[this.dealerIndex].name} is dealing`);
        
        // Always deal initial cards
        this.isInitialDealing = true;
        setTimeout(() => this.dealInitialCards(), 500);
    }

    dealInitialCards() {
        console.log('Starting initial card dealing...');
        console.log('Deck length:', this.deck.length);
        console.log('Players:', this.players.map(p => p.name));
        
        // Always start dealing with human player (index 0)
        let dealIndex = 0;
        
        const dealNextCard = () => {
            if (dealIndex >= this.players.length) {
                // All cards dealt, start the game with proper turn highlighting
                this.isInitialDealing = false;
                setTimeout(() => {
                    // Find the first active player for the first turn
                    let attempts = 0;
                    while (this.players[this.currentPlayerIndex].status !== 'active' && attempts < this.players.length) {
                        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                        attempts++;
                    }
                    
                    // Check if there are any active players left
                    const activePlayers = this.players.filter(p => p.status === 'active');
                    if (activePlayers.length === 0) {
                        this.endRound();
                        return;
                    }
                    
                    this.showMessage(`${this.players[this.currentPlayerIndex].name}'s turn!`);
                    this.highlightCurrentPlayer();
                    if (this.players[this.currentPlayerIndex].isHuman) {
                        this.enablePlayerActions();
                    } else {
                        setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 1200); // Standardized timing
                    }
                }, 1000);
                return;
            }
            
            const player = this.players[dealIndex];
            
            // Skip frozen or busted players during initial deal
            if (player.status === 'frozen' || player.status === 'busted') {
                this.addToLog(`${player.name} is ${player.status} and skipped during initial deal.`);
                dealIndex++;
                // Continue to next player
                if (dealIndex < this.players.length && this.gameActive) {
                    setTimeout(dealNextCard, 300);
                } else if (dealIndex >= this.players.length && this.gameActive) {
                    // All cards dealt, start normal gameplay
                    this.isInitialDealing = false;
                    setTimeout(() => {
                        // Find the first active player for the first turn
                        let attempts = 0;
                        while (this.players[this.currentPlayerIndex].status !== 'active' && attempts < this.players.length) {
                            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                            attempts++;
                        }
                        
                        // Check if there are any active players left
                        const activePlayers = this.players.filter(p => p.status === 'active');
                        if (activePlayers.length === 0) {
                            this.endRound();
                            return;
                        }
                        
                        this.showMessage(`${this.players[this.currentPlayerIndex].name}'s turn!`);
                        this.highlightCurrentPlayer();
                        if (this.players[this.currentPlayerIndex].isHuman) {
                            this.enablePlayerActions();
                        } else {
                            setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 1200); // Standardized timing
                        }
                    }, 1000);
                }
                return;
            }
            
            const card = this.drawCard();
            
            // Show card animation
            this.displayCard(card, player.id);
            
            // Handle the card draw
            setTimeout(() => {
                const continueDealing = () => {
                    console.log(`Continuing dealing, dealIndex: ${dealIndex}, players.length: ${this.players.length}`);
                    dealIndex++;
                    // Check if we need to continue dealing or if the round ended
                    if (dealIndex < this.players.length && this.gameActive) {
                        console.log(`Dealing to next player: ${this.players[dealIndex].name}`);
                        setTimeout(dealNextCard, 1200);
                    } else if (dealIndex >= this.players.length && this.gameActive) {
                        // All cards dealt, start normal gameplay
                        console.log('All initial cards dealt, starting gameplay');
                        this.isInitialDealing = false;
                        setTimeout(() => {
                            // Find the first active player for the first turn
                            let attempts = 0;
                            while (this.players[this.currentPlayerIndex].status !== 'active' && attempts < this.players.length) {
                                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                                attempts++;
                            }
                            
                            // Check if there are any active players left
                            const activePlayers = this.players.filter(p => p.status === 'active');
                            if (activePlayers.length === 0) {
                                this.endRound();
                                return;
                            }
                            
                            this.showMessage(`${this.players[this.currentPlayerIndex].name}'s turn!`);
                            this.highlightCurrentPlayer();
                            if (this.players[this.currentPlayerIndex].isHuman) {
                                this.enablePlayerActions();
                            } else {
                                setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 1200); // Standardized timing
                            }
                        }, 1000);
                    }
                };
                
                const wasActionCard = this.handleInitialCardDraw(player, card, continueDealing);
                this.updateDisplay();
                
                // If it was not an action card, continue immediately
                if (!wasActionCard) {
                    continueDealing();
                }
                // If it was an action card, the action will call continueDealing when complete
            }, 1800);
        };
        
        dealNextCard();
    }
    
    handleInitialCardDraw(player, card, onActionComplete = null) {
        console.log(`INITIAL CARD DEAL: ${player.name} drew initial card:`, card);
        if (player.isHuman) {
            console.log('HUMAN PLAYER received initial card - should wait for Hit/Stay decision');
        }
        if (card.type === 'number') {
            player.numberCards.push(card);
            player.uniqueNumbers.add(card.value);
            player.roundScore += card.value;
            console.log(`${player.name} now has ${player.numberCards.length} number cards`);
            return false;
        } else if (card.type === 'modifier') {
            player.modifierCards.push(card);
            return false;
        } else if (card.type === 'action') {
            // Handle action cards immediately on initial deal
            if (card.value === 'freeze') {
                this.handleActionCard(player, card);
                return true;
            } else if (card.value === 'flip3') {
                // Pass the callback for Flip Three to ensure it completes before continuing
                // For initial deal, bots always target themselves
                this.handleFlipThree(player, onActionComplete, true);
                return true;
            } else if (card.value === 'second_chance') {
                if (!player.hasSecondChance) {
                    player.hasSecondChance = true;
                    player.actionCards.push(card);
                    this.addToLog(`${player.name} gained a Second Chance!`);
                } else {
                    this.handleDuplicateSecondChance(player, card);
                }
                return false;
            }
        }
        return false;
    }

    drawCard() {
        if (this.deck.length === 0) {
            console.log('Deck empty, recreating...');
            if (this.discardPile.length > 0) {
                this.deck = [...this.discardPile];
                this.discardPile = [];
                this.shuffleDeck();
            } else {
                this.createDeck();
                this.shuffleDeck();
            }
        }
        const card = this.deck.pop();
        console.log('Drew card:', card);
        return card;
    }

    handleCardDraw(player, card, isInitialDeal = false, duringFlip3 = false) {
        if (card.type === 'number') {
            // Check for bust
            if (player.uniqueNumbers.has(card.value) && !isInitialDeal) {
                if (player.hasSecondChance) {
                    // Add the duplicate card temporarily for Second Chance processing
                    player.numberCards.push(card);
                    player.numberCards.sort((a, b) => a.value - b.value);
                    this.activateSecondChance(player, card);
                    return { endTurn: false, busted: false };
                } else {
                    // DON'T add the duplicate card to the permanent hand
                    // Just store it temporarily for bust animation
                    const bustCard = card;
                    
                    // Set bust status BEFORE updating display
                    player.status = 'busted';
                    player.roundScore = 0;
                    
                    // Set bust animation flag to prevent mobile sync during entire bust sequence
                    this.isBustAnimating = true;
                    
                    // Temporarily add the card just for display purposes during bust animation
                    player.numberCards.push(bustCard);
                    player.numberCards.sort((a, b) => a.value - b.value);
                    
                    // Update display to show duplicate card in hand with highlighting
                    this.updateDisplay();
                    
                    // Brief pause to let player see the duplicates, then animate bust
                    setTimeout(() => {
                        this.addToLog(`${player.name} busted with duplicate ${card.value}!`);
                        // Remove the temporary bust card before animating
                        const bustCardIndex = player.numberCards.findIndex(c => c === bustCard);
                        if (bustCardIndex !== -1) {
                            player.numberCards.splice(bustCardIndex, 1);
                        }
                        this.animateBust(player);
                    }, 300);
                    
                    return { endTurn: true, busted: true };
                }
            }
            
            player.numberCards.push(card);
            player.uniqueNumbers.add(card.value);
            player.roundScore += card.value;
            
            // Check for Flip 7 bonus
            if (player.uniqueNumbers.size === 7) {
                player.roundScore += 15;
                player.status = 'flip7';
                this.addToLog(`${player.name} achieved Flip 7! +15 bonus points!`);
                
                // Trigger epic celebration for human players
                if (player.isHuman) {
                    this.animateFlip7Celebration(player);
                } else {
                    this.endRound();
                }
                return { endTurn: true, busted: false };
            }
        } else if (card.type === 'modifier') {
            player.modifierCards.push(card);
        } else if (card.type === 'action') {
            // During Flip 3, defer action cards to be processed later
            if (duringFlip3 && (card.value === 'flip3' || card.value === 'freeze')) {
                return { 
                    endTurn: false, 
                    busted: false, 
                    actionToQueue: {
                        type: card.value,
                        owner: player,
                        target: player // Default to self, will be handled by action logic
                    }
                };
            } else {
                // Handle action cards normally and return whether turn should end
                const actionEndsTurn = this.handleActionCard(player, card);
                return { endTurn: actionEndsTurn, busted: false };
            }
        }
        
        return { endTurn: false, busted: false };
    }

    handleActionCard(player, card) {
        switch (card.value) {
            case 'freeze':
                this.handleFreeze(player);
                // Turn always ends - Freeze logic will handle nextTurn() call
                return true;
                
            case 'flip3':
                this.handleFlipThree(player);
                // Turn always ends - Flip3 logic will handle nextTurn() call
                return true;
                
            case 'second_chance':
                if (!player.hasSecondChance) {
                    player.hasSecondChance = true;
                    player.actionCards.push(card);
                    this.addToLog(`${player.name} gained a Second Chance!`);
                } else {
                    this.handleDuplicateSecondChance(player, card);
                }
                return false; // Turn continues after getting Second Chance
        }
        return false;
    }

    handleFreeze(cardOwner, onComplete = null) {
        // Default callback to move to next turn if none provided
        const defaultCallback = () => this.nextTurn();
        const callback = onComplete || defaultCallback;
        
        if (cardOwner.isHuman) {
            // Show player selection UI for human player
            this.showPlayerSelection(cardOwner, 'freeze', callback);
        } else {
            // AI chooses target - NEVER freeze themselves unless they're the only active player
            const activeOpponents = this.players.filter(p => p.status === 'active' && p.id !== cardOwner.id);
            let targetPlayer;
            
            if (activeOpponents.length === 0) {
                // Only freeze self if they're the only active player left
                targetPlayer = cardOwner;
                this.addToLog(`${cardOwner.name} must freeze themselves - no other active players!`);
            } else {
                // Always choose a random opponent
                targetPlayer = activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
            }
            
            this.executeFreeze(cardOwner, targetPlayer, callback);
        }
    }

    handleFlipThree(cardOwner, onComplete = null, isInitialDeal = false) {
        // Default callback to move to next turn if none provided
        const defaultCallback = () => this.nextTurn();
        const callback = onComplete || defaultCallback;
        
        if (cardOwner.isHuman) {
            // Show player selection UI for human player
            this.showPlayerSelection(cardOwner, 'flip3', callback);
        } else {
            let targetPlayer;
            
            if (isInitialDeal) {
                // During initial deal, bots ALWAYS target themselves
                targetPlayer = cardOwner;
                this.addToLog(`${cardOwner.name} uses Flip Three on themselves during initial deal.`);
            } else {
                // Regular gameplay: AI chooses target (80% chance self, 20% chance random other active player)
                const activePlayersExcludingSelf = this.players.filter(p => p.status === 'active' && p.id !== cardOwner.id);
                
                if (Math.random() < 0.8 || activePlayersExcludingSelf.length === 0) {
                    // Choose self
                    targetPlayer = cardOwner;
                } else {
                    // Choose random other active player
                    targetPlayer = activePlayersExcludingSelf[Math.floor(Math.random() * activePlayersExcludingSelf.length)];
                }
            }
            
            this.executeFlipThree(cardOwner, targetPlayer, callback);
        }
    }
    
    handleDuplicateSecondChance(player, card) {
        // Find all active players who don't have Second Chance
        const validRecipients = this.players.filter(p => 
            p.status === 'active' && 
            !p.hasSecondChance && 
            p.id !== player.id
        );
        
        if (validRecipients.length === 0) {
            // No valid recipients - discard the card
            this.addToLog(`${player.name} already has a Second Chance! No other players need it - discarded.`);
            this.discardPile.push(card);
            return;
        }
        
        if (player.isHuman) {
            // Show player selection UI for human player
            this.showSecondChanceSelection(player, card, validRecipients);
        } else {
            // AI automatically gives to random valid recipient
            const recipient = validRecipients[Math.floor(Math.random() * validRecipients.length)];
            this.executeSecondChanceTransfer(player, recipient, card);
        }
    }
    
    showSecondChanceSelection(player, card, validRecipients) {
        const promptElement = document.getElementById('action-prompt');
        const titleElement = document.getElementById('action-title');
        const descriptionElement = document.getElementById('action-description');
        const buttonsElement = document.getElementById('action-buttons');
        
        titleElement.textContent = 'Second Chance Duplicate';
        descriptionElement.textContent = 'You already have a Second Chance! Choose a player to give this one to:';
        buttonsElement.innerHTML = '';
        
        validRecipients.forEach(recipient => {
            const button = document.createElement('button');
            button.textContent = `Give to ${recipient.name}`;
            button.className = 'btn primary';
            button.onclick = () => {
                promptElement.style.display = 'none';
                this.executeSecondChanceTransfer(player, recipient, card);
            };
            buttonsElement.appendChild(button);
        });
        
        promptElement.style.display = 'block';
    }
    
    executeSecondChanceTransfer(giver, recipient, card) {
        this.addToLog(`${giver.name} gives their duplicate Second Chance to ${recipient.name}!`);
        
        // Animate card transfer (similar to freeze transfer)
        this.animateSecondChanceTransfer(giver, recipient, () => {
            // Give Second Chance to recipient
            recipient.hasSecondChance = true;
            recipient.actionCards.push(card);
            
            this.addToLog(`${recipient.name} now has a Second Chance!`);
            this.updateDisplay();
        });
    }
    
    animateSecondChanceTransfer(fromPlayer, toPlayer, onComplete) {
        // Create animated card element
        const animatedCard = document.createElement('div');
        animatedCard.className = 'card back transfer-card';
        animatedCard.style.position = 'absolute';
        animatedCard.style.zIndex = '1000';
        animatedCard.style.pointerEvents = 'none';
        
        // Get positions
        const fromElement = document.getElementById(fromPlayer.isHuman ? 'player' : fromPlayer.id);
        const toElement = document.getElementById(toPlayer.isHuman ? 'player' : toPlayer.id);
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        // Start position (center of from player)
        animatedCard.style.left = (fromRect.left + fromRect.width / 2 - 30) + 'px';
        animatedCard.style.top = (fromRect.top + fromRect.height / 2 - 42) + 'px';
        
        document.body.appendChild(animatedCard);
        
        // Animate to target position
        setTimeout(() => {
            animatedCard.style.transition = 'all 0.8s ease-in-out';
            animatedCard.style.left = (toRect.left + toRect.width / 2 - 30) + 'px';
            animatedCard.style.top = (toRect.top + toRect.height / 2 - 42) + 'px';
            animatedCard.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                document.body.removeChild(animatedCard);
                if (onComplete) onComplete();
            }, 800);
        }, 100);
    }

    showPlayerSelection(cardOwner, actionType, onComplete = null) {
        // For mobile, use drag and drop instead of popup
        if (window.innerWidth <= 768 && (actionType === 'flip3' || actionType === 'freeze')) {
            this.startActionCardDrag(cardOwner, actionType, onComplete);
            return;
        }
        
        // Desktop keeps the popup
        const promptElement = document.getElementById('action-prompt');
        const titleElement = document.getElementById('action-title');
        const descriptionElement = document.getElementById('action-description');
        const buttonsElement = document.getElementById('action-buttons');
        
        if (actionType === 'flip3') {
            titleElement.textContent = 'Flip Three';
            descriptionElement.textContent = 'Choose a player to flip 3 cards:';
        } else if (actionType === 'freeze') {
            titleElement.textContent = 'Freeze';
            descriptionElement.textContent = 'Choose a player to freeze (they must stay):';
        }
        
        // Clear previous buttons
        buttonsElement.innerHTML = '';
        
        // Create buttons for each active player
        this.players.filter(p => p.status === 'active').forEach(player => {
            const button = document.createElement('button');
            button.className = 'btn secondary';
            button.textContent = player.name;
            button.onclick = () => {
                promptElement.style.display = 'none';
                if (actionType === 'flip3') {
                    this.executeFlipThree(cardOwner, player, onComplete);
                } else if (actionType === 'freeze') {
                    this.executeFreeze(cardOwner, player, onComplete);
                }
            };
            buttonsElement.appendChild(button);
        });
        
        promptElement.style.display = 'block';
    }

    executeFreeze(cardOwner, targetPlayer, onComplete = null) {
        this.addToLog(`${cardOwner.name} plays Freeze on ${targetPlayer.name}!`);
        
        // Animate freeze card transfer
        this.animateFreezeTransfer(cardOwner, targetPlayer, () => {
            // Apply freeze effect after animation
            targetPlayer.status = 'frozen';
            this.calculateRoundScore(targetPlayer);
            
            if (targetPlayer.isHuman) {
                this.addToLog(`You are frozen and must stay! Other players continue.`);
                this.showMessage(`You are frozen! Watch the other players finish the round.`);
                this.disablePlayerActions();
            } else {
                this.addToLog(`${targetPlayer.name} is frozen and must stay!`);
            }
            
            // Add visual freeze indicator
            this.addFrozenIndicator(targetPlayer);
            this.updateDisplay();
            
            // Call the completion callback (which will move to next turn)
            if (onComplete) {
                setTimeout(onComplete, 1200); // Standardized timing
            } else {
                setTimeout(() => this.nextTurn(), 1200); // Standardized timing
            }
        });
    }

    executeFlipThree(cardOwner, targetPlayer, onComplete = null) {
        this.addToLog(`${cardOwner.name} plays Flip Three on ${targetPlayer.name}!`);
        console.log(`Starting Flip Three: ${cardOwner.name} -> ${targetPlayer.name}, hasCallback: ${!!onComplete}`);
        this.isProcessingFlip3 = true;
        let cardsFlipped = 0;
        let pendingActions = [];
        
        const processNextCard = () => {
            // Check if we need to process pending actions first
            if (pendingActions.length > 0) {
                const action = pendingActions.shift();
                console.log('Processing pending action during Flip 3:', action);
                this.processQueuedAction(action, () => {
                    // After processing the action, continue with the next card or action
                    processNextCard();
                });
                return;
            }
            
            if (cardsFlipped >= 3 || targetPlayer.status !== 'active') {
                // Flip Three sequence completed
                console.log(`Flip Three completed, cardsFlipped: ${cardsFlipped}, calling callback: ${!!onComplete}`);
                this.isProcessingFlip3 = false;
                if (onComplete) {
                    setTimeout(onComplete, 1200); // Standardized timing
                } else {
                    this.checkForRoundEnd();
                }
                return;
            }
            
            const nextCard = this.drawCard();
            this.displayCard(nextCard, targetPlayer.id);
            
            setTimeout(() => {
                const result = this.handleCardDraw(targetPlayer, nextCard, false, true);
                this.updateDisplay();
                cardsFlipped++;
                
                // Check if we got an action card to queue
                if (result.actionToQueue) {
                    console.log('Queueing action during Flip 3:', result.actionToQueue);
                    pendingActions.push(result.actionToQueue);
                }
                
                if (result.busted || targetPlayer.status !== 'active') {
                    // Player busted or got Flip 7, end the sequence
                    console.log('Player busted or achieved Flip 7, ending sequence');
                    this.isProcessingFlip3 = false;
                    if (onComplete) {
                        setTimeout(onComplete, 1200); // Standardized timing
                    } else {
                        this.checkForRoundEnd();
                    }
                } else if (cardsFlipped < 3) {
                    // Continue flipping cards - wait for full animation cycle
                    setTimeout(processNextCard, 2000);
                } else {
                    // All 3 cards flipped successfully, now process any queued actions
                    if (pendingActions.length > 0) {
                        setTimeout(processNextCard, 1200); // Standardized timing
                    } else {
                        this.isProcessingFlip3 = false;
                        if (onComplete) {
                            setTimeout(onComplete, 1200); // Standardized timing
                        } else {
                            this.checkForRoundEnd();
                        }
                    }
                }
            }, 1800);
        };
        
        setTimeout(processNextCard, 500);
    }

    activateSecondChance(player, duplicateCard) {
        this.addToLog(`${player.name} used Second Chance to avoid busting!`);
        
        // Apply animation for all players (human and AI)
        this.animateSecondChanceActivation(player, duplicateCard);
    }

    animateFreezeTransfer(cardOwner, targetPlayer, onComplete) {
        // Find the freeze card in the card owner's hand
        const ownerContainer = document.getElementById(cardOwner.id);
        const ownerModifierContainer = cardOwner.isHuman 
            ? document.getElementById('player-modifiers')
            : ownerContainer.querySelector('.modifier-cards');
        
        const freezeCard = Array.from(ownerModifierContainer.children).find(card => 
            card.dataset.cardValue === 'freeze'
        );
        
        if (!freezeCard) {
            // Fallback if freeze card not found
            if (onComplete) onComplete();
            return;
        }
        
        // Get target player container position
        const targetContainer = document.getElementById(targetPlayer.id);
        const freezeRect = freezeCard.getBoundingClientRect();
        const targetRect = targetContainer.getBoundingClientRect();
        
        // Calculate transfer distance
        const transferX = targetRect.left - freezeRect.left + (targetRect.width / 2);
        const transferY = targetRect.top - freezeRect.top + (targetRect.height / 2);
        
        // Set CSS variables for animation
        freezeCard.style.setProperty('--transfer-x', `${transferX}px`);
        freezeCard.style.setProperty('--transfer-y', `${transferY}px`);
        
        // Start animation
        freezeCard.classList.add('freeze-transfer');
        
        // Remove freeze card and complete after animation
        setTimeout(() => {
            if (freezeCard.parentNode) {
                freezeCard.parentNode.removeChild(freezeCard);
            }
            
            // Remove freeze card from owner's hand
            cardOwner.actionCards = cardOwner.actionCards.filter(card => card.value !== 'freeze');
            
            // Add freeze card to discard pile
            this.discardPile.push({ type: 'action', value: 'freeze', display: 'Freeze' });
            
            if (onComplete) onComplete();
        }, 1200);
    }

    addFrozenIndicator(player) {
        const container = document.getElementById(player.id);
        
        // Remove existing indicator if present
        const existingIndicator = container.querySelector('.frozen-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add frozen visual effect to container
        container.classList.add('frozen');
        
        // Create frozen indicator
        const indicator = document.createElement('div');
        indicator.className = 'frozen-indicator';
        indicator.textContent = '❄️ FROZEN';
        container.appendChild(indicator);
    }

    animateSecondChanceActivation(player, duplicateCard) {
        // Get the correct containers for this player
        const playerContainer = document.getElementById(player.id);
        const modifierContainer = player.isHuman 
            ? document.getElementById('player-modifiers')
            : playerContainer.querySelector('.modifier-cards');
        const numberContainer = player.isHuman
            ? document.getElementById('player-numbers')
            : playerContainer.querySelector('.number-cards');
            
        if (!modifierContainer || !numberContainer) {
            // Fallback if containers not found
            this.removeSecondChanceCards(player, duplicateCard);
            return;
        }
        
        // Find the Second Chance card element
        const secondChanceCard = Array.from(modifierContainer.children).find(card => 
            card.dataset.cardValue === 'second_chance'
        );
        
        // Find the duplicate number card element (it should be the last one added)
        const duplicateCardElements = Array.from(numberContainer.children).filter(card =>
            card.dataset.cardValue == duplicateCard.value.toString()
        );
        // Get the last one (the duplicate that was just added)
        const duplicateCardElement = duplicateCardElements[duplicateCardElements.length - 1];
        
        if (secondChanceCard && duplicateCardElement) {
            // Add combination effect
            secondChanceCard.classList.add('card-combine-effect');
            duplicateCardElement.classList.add('card-combine-effect');
            
            // Start the animation
            setTimeout(() => {
                secondChanceCard.classList.add('second-chance-activation');
                duplicateCardElement.classList.add('second-chance-activation');
                
                // Remove cards after animation
                setTimeout(() => {
                    this.removeSecondChanceCards(player, duplicateCard);
                    if (secondChanceCard.parentNode) {
                        secondChanceCard.parentNode.removeChild(secondChanceCard);
                    }
                    if (duplicateCardElement.parentNode) {
                        duplicateCardElement.parentNode.removeChild(duplicateCardElement);
                    }
                }, 1500);
            }, 100);
        } else {
            // Fallback if cards not found
            this.removeSecondChanceCards(player, duplicateCard);
        }
    }

    removeSecondChanceCards(player, duplicateCard) {
        // Remove Second Chance from player
        player.hasSecondChance = false;
        player.actionCards = player.actionCards.filter(card => card.value !== 'second_chance');
        
        // Remove the duplicate card from player's number cards array
        const duplicateIndex = player.numberCards.findIndex(card => 
            card.value === duplicateCard.value && card === duplicateCard
        );
        if (duplicateIndex !== -1) {
            player.numberCards.splice(duplicateIndex, 1);
        }
        
        // Also remove from unique numbers since the duplicate is being discarded
        // (Keep the original card in uniqueNumbers set)
        
        // Discard both cards
        this.discardPile.push(duplicateCard);
        this.discardPile.push({ type: 'action', value: 'second_chance', display: 'Second Chance' });
    }

    animateBust(player) {
        const playerArea = document.getElementById(player.id);
        const gameContainer = document.querySelector('.game-container');
        
        // Add bust animation class to trigger card animations
        playerArea.classList.add('bust-animation');
        
        // Add screen shake
        gameContainer.classList.add('bust-shake');
        
        // Create and add red flash effect
        const flashDiv = document.createElement('div');
        flashDiv.className = 'bust-flash';
        playerArea.appendChild(flashDiv);
        
        // Set random rotation angles for cards
        const cards = playerArea.querySelectorAll('.card');
        cards.forEach((card, index) => {
            const angle = (Math.random() - 0.5) * 60; // Random angle between -30 and 30
            card.style.setProperty('--rotate-angle', `${angle}deg`);
        });
        
        // Remove animation classes after animation completes
        setTimeout(() => {
            playerArea.classList.remove('bust-animation');
            gameContainer.classList.remove('bust-shake');
            flashDiv.remove();
            
            // Add persistent busted class
            playerArea.classList.add('busted');
            
            // Clear bust animation flag and sync mobile layout after a brief delay
            this.isBustAnimating = false;
            if (window.innerWidth <= 768) {
                // Small delay to ensure desktop DOM is fully settled before mobile sync
                setTimeout(() => {
                    this.setupMobilePlayerAreas();
                }, 50);
            }
            
            // Continue game flow - check if round should end or move to next player
            this.checkForRoundEnd();
        }, 1200);
    }

    checkForRoundEnd() {
        // Check if someone got Flip 7
        if (this.players.some(p => p.status === 'flip7')) {
            this.endRound();
            return;
        }
        
        // Check if all players are done (no active players left)
        const activePlayers = this.players.filter(p => p.status === 'active');
        if (activePlayers.length === 0) {
            this.endRound();
            return;
        }
        
        // If we're still in initial dealing phase, don't start next turn
        // The dealing sequence will handle continuation
        if (this.gameActive && !this.isInitialDealing) {
            setTimeout(() => this.nextTurn(), 1200); // Standardized timing
        }
    }

    playerHit() {
        const player = this.players[0];
        if (player.status !== 'active') {
            console.log('PlayerHit blocked: player status is', player.status);
            return;
        }
        
        // Prevent multiple rapid clicks
        if (this.isProcessingPlayerAction) {
            console.log('PlayerHit blocked: already processing player action');
            return;
        }
        
        this.isProcessingPlayerAction = true;
        console.log('HUMAN PLAYER HIT - dealing additional card');
        const card = this.drawCard();
        this.displayCard(card, 'player');
        
        this.disablePlayerActions();
        
        // Wait for card animation to complete before handling card logic (standardized timing)
        setTimeout(() => {
            const result = this.handleCardDraw(player, card, false, false);
            
            // If busted, handleCardDraw already handled everything - exit early
            if (result.busted) {
                this.isProcessingPlayerAction = false; // Reset flag
                return; // Don't call updateDisplay() again or nextTurn()
            }
            
            // If turn ended due to action card (not bust), the action will handle nextTurn
            if (result.endTurn && !result.busted) {
                // Action card will handle the turn flow
                setTimeout(() => {
                    this.updateDisplay();
                    this.isProcessingPlayerAction = false; // Reset flag
                }, 1200); // Standardized timing
            } else {
                // Normal flow: move to next turn after animation
                setTimeout(() => {
                    this.updateDisplay();
                    this.nextTurn();
                    this.isProcessingPlayerAction = false; // Reset flag
                }, 1200); // Standardized timing
            }
        }, 1200); // Standardized card animation duration
    }

    playerStay() {
        const player = this.players[0];
        if (player.status !== 'active' || player.numberCards.length === 0) return;
        
        // Prevent multiple rapid clicks
        if (this.isProcessingPlayerAction) {
            console.log('PlayerStay blocked: already processing player action');
            return;
        }
        
        this.isProcessingPlayerAction = true;
        console.log('HUMAN PLAYER STAY - ending turn');
        
        player.status = 'stayed';
        this.calculateRoundScore(player);
        this.addToLog(`${player.name} stayed with ${player.roundScore} points!`);
        
        this.updateDisplay();
        this.disablePlayerActions();
        
        // Move to next player immediately
        setTimeout(() => {
            this.nextTurn();
            this.isProcessingPlayerAction = false; // Reset flag
        }, 500); // Brief delay for visual feedback
    }

    calculateRoundScore(player) {
        let score = 0;
        
        // Step 1: Sum all number cards
        player.numberCards.forEach(card => {
            score += card.value;
        });
        
        // Step 2: Apply x2 multiplier to number card total (if present)
        let hasX2 = false;
        let bonusPoints = 0;
        
        player.modifierCards.forEach(card => {
            if (card.value === 'x2') {
                hasX2 = true;
            } else {
                bonusPoints += card.value;
            }
        });
        
        if (hasX2) {
            score *= 2;
        }
        
        // Step 3: Add other modifier bonuses (+2, +4, +6, +8, +10)
        score += bonusPoints;
        
        // Step 4: Add Flip 7 bonus if applicable (after all other calculations)
        if (player.uniqueNumbers.size === 7) {
            score += 15;
        }
        
        player.roundScore = score;
    }

    nextTurn() {
        // Check if someone got Flip 7
        if (this.players.some(p => p.status === 'flip7')) {
            this.endRound();
            return;
        }
        
        // Move to next player
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Skip players who have stayed, busted, or are frozen
        let attempts = 0;
        while (this.players[this.currentPlayerIndex].status !== 'active' && attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
        
        // Check if all players are done (no active players left)
        const activePlayers = this.players.filter(p => p.status === 'active');
        if (activePlayers.length === 0) {
            this.endRound();
            return;
        }
        
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Highlight the current player immediately when their turn starts
        this.highlightCurrentPlayer();
        
        // Then handle the actual turn logic with a brief delay
        setTimeout(() => {
            if (currentPlayer.isHuman) {
                // Enable actions for human player
                this.enablePlayerActions();
                this.showMessage(`Your turn!`);
            } else {
                // AI turn
                this.showMessage(`${currentPlayer.name}'s turn...`);
                setTimeout(() => this.takeAITurn(currentPlayer), 1200); // Standardized timing
            }
        }, 100); // Much shorter delay - just to ensure UI updates properly
    }

    takeAITurn(player) {
        // AI should be more aggressive early and cautious later
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.roundScore;
        
        // Always hit if round score is less than 20 points
        if (currentScore < 20) {
            this.aiHit(player);
            return;
        }
        
        // Always hit if we have very few cards
        if (player.numberCards.length <= 1) {
            this.aiHit(player);
            return;
        }
        
        // Calculate risk based on unique cards already collected
        let hitProbability = 0.8; // Start aggressive
        
        if (uniqueCount >= 5) {
            hitProbability = 0.3; // Very cautious with 5+ unique cards
        } else if (uniqueCount >= 3) {
            hitProbability = 0.5; // Moderate caution
        } else if (uniqueCount >= 2) {
            hitProbability = 0.7; // Still fairly aggressive
        }
        
        // Adjust based on current score
        if (currentScore >= 25) {
            hitProbability -= 0.2; // More cautious with high scores
        } else if (currentScore <= 5) {
            hitProbability += 0.1; // More aggressive with low scores
        }
        
        // Make decision
        if (Math.random() < hitProbability) {
            this.aiHit(player);
        } else {
            this.aiStay(player);
        }
    }

    aiHit(player) {
        const card = this.drawCard();
        this.displayCard(card, player.id);
        
        this.addToLog(`${player.name} hits and gets ${card.display}`);
        
        // Wait for card animation to complete before handling card logic (standardized timing)
        setTimeout(() => {
            const result = this.handleCardDraw(player, card, false, false);
            
            // If busted, handleCardDraw already handled everything - exit early
            if (result.busted) {
                return; // Don't call updateDisplay() again or nextTurn()
            }
            
            // If turn ended due to action card (not bust), the action will handle nextTurn
            if (result.endTurn && !result.busted) {
                // Action card will handle the turn flow
                setTimeout(() => {
                    this.updateDisplay();
                }, 1200); // Standardized timing
            } else {
                // Normal flow: move to next turn after animation
                setTimeout(() => {
                    this.updateDisplay();
                    this.nextTurn();
                }, 1200); // Standardized timing
            }
        }, 1200); // Standardized card animation duration
    }

    aiStay(player) {
        player.status = 'stayed';
        this.calculateRoundScore(player);
        this.addToLog(`${player.name} stayed with ${player.roundScore} points!`);
        this.updateDisplay();
        
        // Move to next player immediately
        this.nextTurn();
    }

    endRound() {
        // Calculate final scores
        this.players.forEach(player => {
            if (player.status === 'busted') {
                player.roundScore = 0;
            } else if (player.status === 'active' || player.status === 'stayed' || player.status === 'flip7' || player.status === 'frozen') {
                this.calculateRoundScore(player);
            }
            player.totalScore += player.roundScore;
        });
        
        this.updateDisplay();
        this.addToLog(`Round ${this.roundNumber} ended!`);
        
        // Check for game winner
        const winner = this.players.find(p => p.totalScore >= this.winningScore);
        if (winner) {
            this.endGame(winner);
        } else {
            // Rotate dealer clockwise for next round
            this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
            this.roundNumber++;
            setTimeout(() => this.startNewRound(), 2000);
        }
    }

    endGame(winner) {
        this.gameActive = false;
        
        // Re-enable points setting after game ends
        document.getElementById('win-points').disabled = false;
        
        // Show start button for new game
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            gameMessage.textContent = 'Start New Game';
            gameMessage.style.display = 'block';
        }
        document.getElementById('pre-game-controls').style.display = 'flex';
        
        this.addToLog(`🎉 ${winner.name} wins with ${winner.totalScore} points!`);
        this.disablePlayerActions();
        
        // Update mobile status banner
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        const mobileGameInfo = document.getElementById('mobile-game-info');
        if (mobileTurnIndicator) {
            mobileTurnIndicator.textContent = `🎉 ${winner.name} Wins!`;
            mobileGameInfo.textContent = 'Click "Start Game" to play again';
        }
        
        // Show celebration if human player wins
        if (winner.isHuman) {
            this.showWinningCelebration();
        }
    }

    showWinningCelebration() {
        const celebration = document.getElementById('winning-celebration');
        celebration.style.display = 'flex';
        
        // Generate confetti
        this.createConfetti();
        
        // Hide celebration after 5 seconds
        setTimeout(() => {
            celebration.style.display = 'none';
        }, 5000);
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        container.innerHTML = ''; // Clear existing confetti
        
        // Create 50 confetti pieces
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random horizontal position
            confetti.style.left = Math.random() * 100 + '%';
            
            // Random animation delay
            confetti.style.animationDelay = Math.random() * 3 + 's';
            
            // Random animation duration (2-4 seconds)
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            container.appendChild(confetti);
        }
    }

    displayCard(card, playerId) {
        // Try animation first, with fallback to direct addition
        console.log(`Displaying card ${card.display} to ${playerId}`);
        
        try {
            this.animateCardFlip(card, playerId);
        } catch (error) {
            console.error('Animation failed, adding card directly:', error);
            this.addCardToPlayerHand(card, playerId);
        }
    }

    animateCardFlip(card, playerId) {
        // Use mobile animation area if on mobile, desktop otherwise
        const isMobile = window.innerWidth <= 768;
        const animationArea = isMobile 
            ? document.getElementById('mobile-card-animation-area')
            : document.getElementById('card-animation-area');
        
        // Fallback if animation area doesn't exist - add card directly
        if (!animationArea) {
            console.log('Animation area not found, adding card directly');
            this.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Check if target container exists before starting animation
        const targetElement = this.getTargetCardContainer(playerId, card.type);
        if (!targetElement) {
            console.log('Target container not found, adding card directly');
            this.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Declare animatedCard outside the if/else blocks
        let animatedCard;
        
        // Use simplified animation for mobile
        if (isMobile) {
            // Simple fade animation for mobile
            animatedCard = this.createCardElement(card);
            animatedCard.classList.add('animated-card', 'mobile-reveal');
            
            // Clear any existing animation
            animationArea.innerHTML = '';
            animationArea.appendChild(animatedCard);
        } else {
            // Desktop: Use enhanced two-element flip animation
            animatedCard = document.createElement('div');
            animatedCard.classList.add('animated-card');
            
            // Create card back element
            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');
            
            // Create card front element with actual card content
            const cardFront = this.createCardElement(card);
            cardFront.classList.add('card-front');
            
            // Assemble the animated card
            animatedCard.appendChild(cardBack);
            animatedCard.appendChild(cardFront);
            
            // Clear any existing animation
            animationArea.innerHTML = '';
            animationArea.appendChild(animatedCard);
            
            // Start flip reveal animation
            animatedCard.classList.add('flip-reveal');
        }
        
        // After reveal, slide to player's hand
        const revealDuration = isMobile ? 800 : 1000; // Mobile animation is shorter
        setTimeout(() => {
            try {
                const animRect = animatedCard.getBoundingClientRect();
                const targetRect = targetElement.getBoundingClientRect();
                
                const slideX = targetRect.left - animRect.left;
                const slideY = targetRect.top - animRect.top;
                
                animatedCard.style.setProperty('--slide-x', `${slideX}px`);
                animatedCard.style.setProperty('--slide-y', `${slideY}px`);
                
                // Remove the reveal animation class (both desktop and mobile)
                animatedCard.classList.remove('flip-reveal', 'mobile-reveal');
                animatedCard.classList.add('slide-to-hand');
                
                // Add the actual card to the player's hand
                setTimeout(() => {
                    this.addCardToPlayerHand(card, playerId);
                    if (animationArea && animationArea.parentNode) {
                        animationArea.innerHTML = '';
                    }
                }, 500);
            } catch (error) {
                console.error('Animation calculation failed:', error);
                this.addCardToPlayerHand(card, playerId);
                if (animationArea && animationArea.parentNode) {
                    animationArea.innerHTML = '';
                }
            }
        }, revealDuration);
    }

    getTargetCardContainer(playerId, cardType) {
        if (playerId === 'player') {
            return document.getElementById(cardType === 'number' ? 'player-numbers' : 'player-modifiers');
        } else {
            const container = document.getElementById(playerId);
            return container ? container.querySelector(`.${cardType === 'number' ? 'number-cards' : 'modifier-cards'}`) : null;
        }
    }

    addCardToPlayerHand(card, playerId) {
        console.log(`Adding card to ${playerId} hand:`, card);
        const cardsContainer = this.getTargetCardContainer(playerId, card.type);
        console.log('Cards container found:', cardsContainer);
        
        if (cardsContainer) {
            const cardElement = this.createCardElement(card);
            cardElement.dataset.cardValue = card.value;
            cardElement.dataset.cardType = card.type;
            cardsContainer.appendChild(cardElement);
            console.log(`Card added to ${playerId} hand successfully`);
        } else {
            console.error(`No card container found for ${playerId}, card type: ${card.type}`);
        }
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.type}`;
        
        // Check if we have a custom image for this card
        const hasCustomImage = this.hasCustomCardImage(card);
        
        if (hasCustomImage) {
            // Use custom card image
            const imageName = this.getCardImageName(card);
            console.log(`Using custom image for card ${card.value}: ${imageName}`);
            cardDiv.classList.add('custom-image');
            cardDiv.style.backgroundImage = `url('./images/${imageName}')`;
            cardDiv.innerHTML = ''; // No text needed
        } else {
            // Use text fallback for cards we don't have images for yet
            cardDiv.innerHTML = `<span>${card.display}</span>`;
        }
        
        return cardDiv;
    }
    
    hasCustomCardImage(card) {
        // Check if we have custom images for this card
        if (card.type === 'number') {
            // We have images for all number cards: 0-12
            const availableNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            return availableNumbers.includes(card.value);
        }
        if (card.type === 'modifier') {
            // We have images for all modifier cards
            return [2, 4, 6, 8, 10, 'x2'].includes(card.value);
        }
        if (card.type === 'action') {
            // We have images for all action cards
            return ['freeze', 'flip3', 'second_chance'].includes(card.value);
        }
        return false;
    }
    
    getCardImageName(card) {
        if (card.type === 'number') {
            return `card-${card.value}.png`;
        }
        if (card.type === 'modifier') {
            if (card.value === 'x2') {
                return 'card-*2.png'; // Special case for multiply
            }
            return `card-+${card.value}.png`;
        }
        if (card.type === 'action') {
            if (card.value === 'flip3') {
                return 'card-Flip3.png';
            }
            if (card.value === 'freeze') {
                return 'card-Freeze.png';
            }
            if (card.value === 'second_chance') {
                return 'card-SecondChance.png';
            }
        }
        return null;
    }

    enablePlayerActions() {
        const player = this.players[0];
        if (player.status === 'active' && !this.isProcessingPlayerAction) {
            console.log('ENABLING player actions - human player can now Hit/Stay');
            // Enable desktop buttons
            document.getElementById('hit-btn').disabled = false;
            document.getElementById('stay-btn').disabled = player.numberCards.length === 0;
            
            // Show and enable mobile buttons
            const mobilePlayer = document.getElementById('mobile-player');
            const mobileHitBtn = document.getElementById('mobile-hit-btn');
            const mobileStayBtn = document.getElementById('mobile-stay-btn');
            if (mobilePlayer) mobilePlayer.classList.add('show-buttons');
            if (mobileHitBtn) mobileHitBtn.disabled = false;
            if (mobileStayBtn) mobileStayBtn.disabled = player.numberCards.length === 0;
        } else if (player.status === 'frozen') {
            // Player is frozen, can't take actions - buttons stay disabled
            document.getElementById('hit-btn').disabled = true;
            document.getElementById('stay-btn').disabled = true;
            
            const mobilePlayer = document.getElementById('mobile-player');
            const mobileHitBtn = document.getElementById('mobile-hit-btn');
            const mobileStayBtn = document.getElementById('mobile-stay-btn');
            if (mobilePlayer) mobilePlayer.classList.remove('show-buttons');
            if (mobileHitBtn) mobileHitBtn.disabled = true;
            if (mobileStayBtn) mobileStayBtn.disabled = true;
        }
    }

    disablePlayerActions() {
        console.log('DISABLING player actions - preventing clicks during animation');
        // Disable desktop buttons
        document.getElementById('hit-btn').disabled = true;
        document.getElementById('stay-btn').disabled = true;
        
        // Hide and disable mobile buttons
        const mobilePlayer = document.getElementById('mobile-player');
        const mobileHitBtn = document.getElementById('mobile-hit-btn');
        const mobileStayBtn = document.getElementById('mobile-stay-btn');
        if (mobilePlayer) mobilePlayer.classList.remove('show-buttons');
        if (mobileHitBtn) mobileHitBtn.disabled = true;
        if (mobileStayBtn) mobileStayBtn.disabled = true;
    }

    updateDisplay() {
        // Update deck count for both desktop and mobile
        const cardsRemainingElement = document.getElementById('cards-remaining');
        const mobileCardsRemainingElement = document.getElementById('mobile-cards-remaining');
        if (cardsRemainingElement) {
            cardsRemainingElement.textContent = this.deck.length;
        }
        if (mobileCardsRemainingElement) {
            mobileCardsRemainingElement.textContent = this.deck.length;
        }
        
        // Update mobile button states
        const mobileHitBtn = document.getElementById('mobile-hit-btn');
        const mobileStayBtn = document.getElementById('mobile-stay-btn');
        const humanPlayer = this.players[0];
        const isHumanTurn = this.gameActive && this.currentPlayerIndex === 0 && humanPlayer.status === 'active';
        
        if (mobileHitBtn && mobileStayBtn) {
            if (isHumanTurn) {
                mobileHitBtn.classList.remove('inactive');
                mobileStayBtn.classList.remove('inactive');
                mobileHitBtn.disabled = false;
                mobileStayBtn.disabled = false;
            } else {
                mobileHitBtn.classList.add('inactive');
                mobileStayBtn.classList.add('inactive');
                mobileHitBtn.disabled = true;
                mobileStayBtn.disabled = true;
            }
        }
        
        // Update each player's display
        this.players.forEach(player => {
            this.updatePlayerDisplay(player);
        });
        
        // Sync mobile layout if on mobile
        if (window.innerWidth <= 768) {
            this.setupMobilePlayerAreas();
        }
        
        // Update scoreboard
        this.updateScoreboard();
    }

    updatePlayerDisplay(player) {
        const isMainPlayer = player.id === 'player';
        const container = document.getElementById(player.id);
        const playerIndex = this.players.findIndex(p => p.id === player.id);
        
        // Add dealer indicator
        if (playerIndex === this.dealerIndex && this.gameActive) {
            container.classList.add('dealer');
        } else {
            container.classList.remove('dealer');
        }
        
        // Update player name with total score
        const nameElement = container.querySelector('h3');
        if (nameElement) {
            // Calculate display score: for busted players show only totalScore, for others show totalScore + roundScore
            const displayScore = player.status === 'busted' ? player.totalScore : (player.totalScore + player.roundScore);
            nameElement.textContent = `${player.name} - ${displayScore} pts`;
        }
        
        // Update scores
        const scoreElements = container.querySelectorAll('.score-value');
        if (scoreElements[0]) scoreElements[0].textContent = player.totalScore;
        
        const roundElements = container.querySelectorAll('.round-value');
        if (roundElements[0]) roundElements[0].textContent = player.roundScore;
        
        // Update status
        const statusElement = container.querySelector('.player-status');
        if (statusElement) {
            statusElement.textContent = this.getStatusText(player.status);
            statusElement.className = `player-status ${player.status}`;
        }
        
        // Maintain busted visual state
        if (player.status === 'busted') {
            container.classList.add('busted');
        }
        
        // Update unique count with visual dots only
        const uniqueElement = container.querySelector('.unique-count');
        if (uniqueElement) {
            const count = player.uniqueNumbers.size;
            uniqueElement.innerHTML = `<span class="card-dots">${this.createCardDots(count)}</span>`;
        }
        
        // Clear and redraw cards only when starting a new round
        const numberContainer = isMainPlayer 
            ? document.getElementById('player-numbers')
            : container.querySelector('.number-cards');
        const modifierContainer = isMainPlayer
            ? document.getElementById('player-modifiers')
            : container.querySelector('.modifier-cards');
            
        // Only redraw if we're resetting (new round) and not during initial dealing
        if (player.numberCards.length === 0 && numberContainer && !this.isInitialDealing) {
            numberContainer.innerHTML = '';
        }
        if (player.modifierCards.length === 0 && player.actionCards.length === 0 && modifierContainer && !this.isInitialDealing) {
            modifierContainer.innerHTML = '';
        }
        
        // Ensure all cards from player data are displayed in DOM
        if (numberContainer) {
            const existingCards = Array.from(numberContainer.children);
            
            // Always sort and redraw cards if the counts don't match or if we need to sort
            if (existingCards.length !== player.numberCards.length || player.numberCards.length > 0) {
                // Clear and redraw all cards in sorted order
                numberContainer.innerHTML = '';
                
                // For busted players, preserve card order to keep duplicates together
                // For active players, sort numerically
                let cardsToDisplay;
                if (player.status === 'busted') {
                    // Keep original order to show duplicates next to each other
                    cardsToDisplay = [...player.numberCards];
                } else {
                    // Sort number cards in numerical order (0-12) - smaller numbers on left, bigger on right
                    cardsToDisplay = [...player.numberCards].sort((a, b) => a.value - b.value);
                }
                
                cardsToDisplay.forEach((card, index) => {
                    const cardElement = this.createCardElement(card);
                    cardElement.dataset.cardValue = card.value;
                    cardElement.dataset.cardType = card.type;
                    
                    // Add special styling for duplicate cards in busted hands
                    if (player.status === 'busted') {
                        // Find if this card value appears elsewhere in the hand
                        const duplicateIndices = cardsToDisplay
                            .map((c, i) => c.value === card.value ? i : -1)
                            .filter(i => i !== -1);
                        
                        if (duplicateIndices.length > 1) {
                            cardElement.classList.add('duplicate-card');
                        }
                    }
                    
                    numberContainer.appendChild(cardElement);
                });
                
                // Update card count class for dynamic sizing (both mobile and desktop)
                const cardCount = player.numberCards.length;
                const mobileSizeClass = `cards-${Math.min(cardCount, 7)}`;
                const desktopSizeClass = `desktop-cards-${Math.min(cardCount, 7)}`;
                numberContainer.className = `number-cards ${mobileSizeClass} ${desktopSizeClass}`;
            }
        }
        
        if (modifierContainer) {
            const existingCards = Array.from(modifierContainer.children);
            const totalPlayerCards = [...player.modifierCards, ...player.actionCards];
            
            // Only add cards if we have fewer DOM elements than player cards
            if (existingCards.length < totalPlayerCards.length) {
                // Clear and redraw all cards to avoid duplicates
                modifierContainer.innerHTML = '';
                totalPlayerCards.forEach(card => {
                    const cardElement = this.createCardElement(card);
                    cardElement.dataset.cardValue = card.value;
                    cardElement.dataset.cardType = card.type;
                    modifierContainer.appendChild(cardElement);
                });
            }
        }

        // Show Flip 7 indicator
        if (isMainPlayer && player.uniqueNumbers.size === 7) {
            document.getElementById('flip7-indicator').style.display = 'inline';
        } else if (isMainPlayer) {
            document.getElementById('flip7-indicator').style.display = 'none';
        }
    }

    getStatusText(status) {
        const statusTexts = {
            'waiting': 'Waiting',
            'active': 'Active',
            'stayed': 'Stayed',
            'busted': 'Busted!',
            'flip7': 'Flip 7!',
            'frozen': 'Frozen ❄️'
        };
        return statusTexts[status] || status;
    }
    
    createCardDots(count) {
        let dots = '';
        for (let i = 0; i < 7; i++) {
            if (i < count) {
                dots += '<span class="filled">●</span>';
            } else {
                dots += '<span class="empty">○</span>';
            }
        }
        return dots;
    }

    processQueuedAction(actionData, onComplete) {
        console.log('Processing queued action:', actionData);
        switch (actionData.type) {
            case 'flip3':
                // Execute the queued Flip 3
                this.executeFlipThree(actionData.owner, actionData.target, onComplete);
                break;
            case 'freeze':
                this.executeFreeze(actionData.owner, actionData.target, onComplete);
                break;
            default:
                if (onComplete) onComplete();
        }
    }

    updateScoreboard() {
        // Update both desktop and mobile scoreboards
        const scoreboards = document.querySelectorAll('#scoreboard-content');
        scoreboards.forEach(scoreboard => {
            scoreboard.innerHTML = '';
            
            const sortedPlayers = [...this.players].sort((a, b) => b.totalScore - a.totalScore);
            sortedPlayers.forEach(player => {
                const entry = document.createElement('div');
                entry.className = 'score-entry';
                entry.innerHTML = `
                    <span>${player.name}</span>
                    <span>${player.totalScore} pts</span>
                `;
                scoreboard.appendChild(entry);
            });
        });
    }

    addToLog(message) {
        // Update both desktop and mobile log elements
        const logs = document.querySelectorAll('#log-content');
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            log.insertBefore(entry, log.firstChild);
            
            // Keep only last 10 entries
            while (log.children.length > 10) {
                log.removeChild(log.lastChild);
            }
        });
        
        // Update mobile status banner with recent action
        const mobileGameInfo = document.getElementById('mobile-game-info');
        if (mobileGameInfo && this.gameActive && !message.includes('turn')) {
            // Show recent game actions briefly
            mobileGameInfo.textContent = message;
        }
    }

    showMessage(message) {
        // Game message is now a button, so we don't update its text with random messages
        // Only update mobile status banner
        const mobileTurnIndicator = document.getElementById('mobile-turn-indicator');
        const mobileGameInfo = document.getElementById('mobile-game-info');
        if (mobileTurnIndicator && this.gameActive) {
            // Extract turn information
            if (message.includes('turn')) {
                mobileTurnIndicator.textContent = message;
                mobileGameInfo.textContent = `Round ${this.roundNumber} • Target: ${this.winningScore} pts`;
            } else {
                // Show other important messages in the info line
                mobileGameInfo.textContent = message;
            }
        }
    }

    highlightCurrentPlayer() {
        // Remove highlight from all players
        this.players.forEach((player, index) => {
            const container = document.getElementById(player.id);
            container.classList.remove('current-turn');
        });
        
        // Add highlight to current player
        if (this.gameActive && this.currentPlayerIndex >= 0) {
            const currentPlayer = this.players[this.currentPlayerIndex];
            const container = document.getElementById(currentPlayer.id);
            container.classList.add('current-turn');
        }
    }

    showRules() {
        document.getElementById('rules-modal').style.display = 'block';
    }

    hideRules() {
        document.getElementById('rules-modal').style.display = 'none';
    }
    
    showStartPopup() {
        const gameMessage = document.getElementById('game-message');
        const namePopup = document.getElementById('mobile-name-popup');
        
        // Hide any fallback start buttons
        if (gameMessage) gameMessage.style.display = 'none';
        
        // Show name input popup on all devices
        if (namePopup) {
            console.log('Showing name popup');
            namePopup.style.display = 'flex';
            namePopup.style.position = 'fixed';
            namePopup.style.top = '0';
            namePopup.style.left = '0';
            namePopup.style.width = '100vw';
            namePopup.style.height = '100vh';
            namePopup.style.zIndex = '99999';
            namePopup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            
            console.log('Popup styles set:', {
                display: namePopup.style.display,
                zIndex: namePopup.style.zIndex,
                position: namePopup.style.position
            });
            
            // Focus the input field for better UX
            setTimeout(() => {
                const nameInput = document.getElementById('player-name-input');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select(); // Select any existing text
                }
            }, 200); // Slightly longer delay to ensure popup is visible
        } else {
            console.error('Name popup not found in DOM');
            // Try again after a short delay in case DOM isn't ready
            setTimeout(() => {
                const retryPopup = document.getElementById('mobile-name-popup');
                if (retryPopup) {
                    console.log('Retry successful - showing name popup');
                    retryPopup.style.display = 'flex';
                    setTimeout(() => {
                        const nameInput = document.getElementById('player-name-input');
                        if (nameInput) {
                            nameInput.focus();
                            nameInput.select();
                        }
                    }, 200);
                } else {
                    console.error('Name popup still not found after retry');
                }
            }, 500);
        }
    }
    
    hideStartPopups() {
        const gameMessage = document.getElementById('game-message');
        const namePopup = document.getElementById('mobile-name-popup');
        
        if (gameMessage) gameMessage.style.display = 'none';
        if (namePopup) namePopup.style.display = 'none';
    }
    
    animateFlip7Celebration(player) {
        console.log('🎉 Starting Flip 7 celebration for', player.name);
        
        // Show celebration overlay
        const celebrationEl = document.getElementById('flip7-celebration');
        celebrationEl.style.display = 'block';
        
        // Stage 1: Card wave animation (2.5s)
        this.animateCardWave(player);
        
        setTimeout(() => {
            // Stage 2: Piñata appears (0.5s)
            this.showPinata();
            
            setTimeout(() => {
                // Stage 3: Piñata shake & smash (1s)
                this.smashPinata();
                
                setTimeout(() => {
                    // Stage 4: Glitter explosion (3s)
                    this.explodeGlitter();
                    
                    setTimeout(() => {
                        // Stage 5: Clean up and end round (7s total)
                        this.cleanupFlip7Celebration();
                        this.endRound();
                    }, 3000);
                }, 1000);
            }, 500);
        }, 2500);
    }
    
    animateCardWave(player) {
        const playerContainer = document.getElementById(player.id);
        const numberCards = playerContainer.querySelectorAll('.number-cards .card');
        
        // Clone and animate each card
        numberCards.forEach((card, index) => {
            // Create animated clone
            const cardClone = card.cloneNode(true);
            cardClone.classList.add('card-wave-up');
            
            // Position at original card location
            const rect = card.getBoundingClientRect();
            cardClone.style.left = rect.left + 'px';
            cardClone.style.top = rect.top + 'px';
            cardClone.style.width = rect.width + 'px';
            cardClone.style.height = rect.height + 'px';
            
            // Add to document
            document.body.appendChild(cardClone);
            
            // Stagger animation start (200ms delay between cards)
            setTimeout(() => {
                cardClone.style.animationDelay = '0s';
            }, index * 200);
            
            // Remove clone after animation
            setTimeout(() => {
                if (cardClone.parentNode) {
                    cardClone.parentNode.removeChild(cardClone);
                }
            }, 2500 + (index * 200));
        });
        
        // Hide original cards during animation
        setTimeout(() => {
            const numberContainer = playerContainer.querySelector('.number-cards');
            if (numberContainer) {
                numberContainer.style.opacity = '0.3';
            }
        }, 200);
    }
    
    showPinata() {
        const pinata = document.getElementById('pinata');
        pinata.classList.add('show');
    }
    
    smashPinata() {
        const pinata = document.getElementById('pinata');
        
        // Shake first
        pinata.classList.remove('show');
        pinata.classList.add('shake');
        
        // Then explode
        setTimeout(() => {
            pinata.classList.remove('shake');
            pinata.classList.add('explode');
        }, 500);
    }
    
    explodeGlitter() {
        const glitterContainer = document.getElementById('glitter-explosion');
        const isMobile = window.innerWidth <= 768;
        const particleCount = isMobile ? 75 : 150;
        
        // Create glitter particles
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('glitter-particle');
            
            // Random particle type
            const types = ['glitter-star', 'glitter-circle', 'glitter-diamond'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            particle.classList.add(randomType);
            
            // Random colors for different types
            if (randomType === 'glitter-star') {
                const colors = ['#ffd700', '#ffed4e', '#fff700'];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            } else if (randomType === 'glitter-circle') {
                const colors = ['#c0c0c0', '#e6e6fa', '#f0f8ff'];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            } else {
                const colors = ['#ff69b4', '#ff1493', '#ffc0cb', '#9370db'];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            }
            
            // Random starting position (spread from pinata location)
            const startX = 50 + (Math.random() - 0.5) * 30; // Center ± 15%
            const startY = 5 + Math.random() * 10; // Top area
            particle.style.left = startX + '%';
            particle.style.top = startY + '%';
            
            // Random animation duration and delay
            const duration = 2.5 + Math.random() * 1; // 2.5-3.5s
            const delay = Math.random() * 0.5; // 0-0.5s delay
            particle.style.animationDuration = duration + 's';
            particle.style.animationDelay = delay + 's';
            
            glitterContainer.appendChild(particle);
        }
        
        // Clean up particles
        setTimeout(() => {
            glitterContainer.innerHTML = '';
        }, 4000);
    }
    
    cleanupFlip7Celebration() {
        // Hide celebration overlay
        const celebrationEl = document.getElementById('flip7-celebration');
        celebrationEl.style.display = 'none';
        
        // Reset piñata classes
        const pinata = document.getElementById('pinata');
        pinata.classList.remove('show', 'shake', 'explode');
        
        // Clear any remaining particles
        const glitterContainer = document.getElementById('glitter-explosion');
        glitterContainer.innerHTML = '';
        
        // Restore original cards opacity
        const playerContainer = document.getElementById('player');
        const numberContainer = playerContainer.querySelector('.number-cards');
        if (numberContainer) {
            numberContainer.style.opacity = '1';
        }
        
        console.log('🎉 Flip 7 celebration complete!');
    }

    startActionCardDrag(cardOwner, actionType, onComplete) {
        const isMobile = window.innerWidth <= 768;
        const animationArea = document.getElementById(isMobile ? 'mobile-card-animation-area' : 'card-animation-area');
        const animatedCard = animationArea.querySelector('.animated-card');
        
        if (!animatedCard) return;
        
        // Add draggable attribute and styling
        animatedCard.style.cursor = 'grab';
        animatedCard.classList.add('draggable-action-card');
        
        // Store action data
        animatedCard.dataset.actionType = actionType;
        animatedCard.dataset.ownerId = cardOwner.id;
        
        // Add instruction text
        const instruction = document.createElement('div');
        instruction.className = 'drag-instruction';
        instruction.textContent = actionType === 'flip3' ? 
            'Drag to a player to make them flip 3 cards' : 
            'Drag to a player to freeze them';
        animationArea.appendChild(instruction);
        
        // Enable drag on the card
        this.enableActionCardDrag(animatedCard, cardOwner, actionType, onComplete, instruction);
        
        // Highlight valid drop zones
        this.highlightValidDropZones(cardOwner, actionType);
    }
    
    enableActionCardDrag(card, cardOwner, actionType, onComplete, instruction) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        const self = this;
        
        // Touch events for mobile
        card.addEventListener('touchstart', startDrag, { passive: false });
        card.addEventListener('touchmove', drag, { passive: false });
        card.addEventListener('touchend', endDrag, { passive: false });
        
        // Mouse events for testing
        card.addEventListener('mousedown', startDrag);
        card.addEventListener('mousemove', drag);
        card.addEventListener('mouseup', endDrag);
        
        function startDrag(e) {
            e.preventDefault();
            isDragging = true;
            card.style.cursor = 'grabbing';
            
            const touch = e.touches ? e.touches[0] : e;
            initialX = touch.clientX - currentX;
            initialY = touch.clientY - currentY;
            
            card.style.zIndex = '1000';
            card.style.position = 'fixed';
        }
        
        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches ? e.touches[0] : e;
            currentX = touch.clientX - initialX;
            currentY = touch.clientY - initialY;
            
            card.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.1)`;
        }
        
        function endDrag(e) {
            if (!isDragging) return;
            isDragging = false;
            card.style.cursor = 'grab';
            
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Find if dropped on a valid player area
            const playerArea = elementBelow?.closest('.mobile-game-board > div[id^="mobile-"]') || 
                               elementBelow?.closest('.player-area');
            
            if (playerArea && playerArea.classList.contains('valid-drop-zone')) {
                // Get player from the area
                const playerId = playerArea.id.replace('mobile-', '');
                const targetPlayer = self.players.find(p => p.id === playerId);
                
                if (targetPlayer) {
                    // Execute the action
                    self.executeActionCardDrop(cardOwner, targetPlayer, actionType, onComplete);
                    
                    // Clean up
                    card.remove();
                    instruction?.remove();
                    self.clearDropZoneHighlights();
                    return;
                }
            }
            
            // If not dropped on valid zone, animate back
            card.style.transform = 'translate(0, 0) scale(1)';
            setTimeout(() => {
                card.style.position = '';
                card.style.zIndex = '';
            }, 300);
        }
    }
    
    highlightValidDropZones(cardOwner, actionType) {
        const isMobile = window.innerWidth <= 768;
        const validPlayers = this.players.filter(p => p.status === 'active');
        
        validPlayers.forEach(player => {
            const playerArea = document.getElementById(isMobile ? `mobile-${player.id}` : player.id);
            if (playerArea) {
                playerArea.classList.add('valid-drop-zone');
                playerArea.classList.add(`drop-zone-${actionType}`);
            }
        });
    }
    
    clearDropZoneHighlights() {
        document.querySelectorAll('.valid-drop-zone').forEach(el => {
            el.classList.remove('valid-drop-zone', 'drop-zone-flip3', 'drop-zone-freeze');
        });
    }
    
    executeActionCardDrop(cardOwner, targetPlayer, actionType, onComplete) {
        if (actionType === 'flip3') {
            this.addToLog(`${cardOwner.name} forces ${targetPlayer.name} to flip 3 cards!`);
            this.executeFlipThree(targetPlayer, onComplete);
        } else if (actionType === 'freeze') {
            this.addToLog(`${cardOwner.name} freezes ${targetPlayer.name}!`);
            this.playerStay(targetPlayer);
            
            if (cardOwner === this.players[this.currentPlayerIndex]) {
                this.endTurn();
            }
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new Flip7Game();
});