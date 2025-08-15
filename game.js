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
        this.currentDealIndex = 0; // Track current dealing position
        this.dealNextCardFunction = null; // Store deal function for continuation
        this.pendingInitialDealContinuation = null; // Store continuation for human action cards
        this.initialDealSafetyTimeout = null; // Safety timeout for initial deal
        this.backdropAutoHideTimeout = null; // Backdrop auto-hide timeout
        this.actionQueue = [];
        this.isProcessingFlip3 = false;
        this.flip3CompletionPending = false; // Flag to prevent race conditions during completion
        this.pendingFlip3Queue = []; // Queue for nested Flip 3 cards
        this.flip3EndRoundAfterCompletion = false; // Flag to end round after Flip 3 if self-freeze
        
        // Flag to prevent mobile sync during bust animations
        this.isBustAnimating = false;
        
        // Flag to prevent multiple rapid button clicks
        this.isProcessingPlayerAction = false;
        
        // Store custom player name (defaults to "You")
        this.playerName = "Player";
        
        this.initializePlayers();
        this.initializeEventListeners();
        
        // Enhanced auto-start with multiple fallback triggers
        console.log('Flip7Game constructor - setting up autostart...');
        this.autoStartAttempted = false;
        
        // Primary autostart trigger
        setTimeout(() => {
            this.attemptAutoStart('primary-timeout');
        }, 500); // Increased from 200ms for better reliability
        
        // Secondary fallback trigger
        setTimeout(() => {
            this.attemptAutoStart('secondary-timeout');
        }, 1500);
        
        // Ultimate fallback trigger
        setTimeout(() => {
            this.attemptAutoStart('ultimate-fallback');
        }, 3000);
        
        // Add visual confirmation game started
        setTimeout(() => {
            const statusElements = document.querySelectorAll('.player-status');
            statusElements.forEach(el => {
                if (el.textContent === 'Waiting') {
                    el.textContent = 'Playing';
                }
            });
        }, 1000);
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
        // Add event listeners with null checks to prevent errors
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.startNewGame());
        
        const hitBtn = document.getElementById('hit-btn');
        if (hitBtn) hitBtn.addEventListener('click', () => this.playerHit());
        
        const stayBtn = document.getElementById('stay-btn');
        if (stayBtn) stayBtn.addEventListener('click', () => this.playerStay());
        
        // Add mobile button event listeners
        const mobileHitBtn = document.getElementById('mobile-hit-btn');
        if (mobileHitBtn) mobileHitBtn.addEventListener('click', () => this.playerHit());
        
        const mobileStayBtn = document.getElementById('mobile-stay-btn');
        if (mobileStayBtn) mobileStayBtn.addEventListener('click', () => this.playerStay());
        
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) rulesBtn.addEventListener('click', () => this.showRules());
        
        const closeRulesBtn = document.getElementById('close-rules');
        if (closeRulesBtn) closeRulesBtn.addEventListener('click', () => this.hideRules());
        
        // Mobile rules button
        const mobileRulesBtn = document.getElementById('mobile-rules-btn');
        if (mobileRulesBtn) mobileRulesBtn.addEventListener('click', () => this.showRules());
        
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

    attemptAutoStart(trigger) {
        if (this.autoStartAttempted) {
            console.log(`Autostart already attempted, skipping ${trigger}`);
            return;
        }
        
        console.log(`🎮 Attempting autostart from: ${trigger}`);
        this.autoStartAttempted = true;
        
        // Set player name
        this.players[0].name = "Player";
        
        // Update display first
        this.updateDisplay();
        
        // Ensure mobile layout is set up if on mobile
        if (window.innerWidth <= 1024) {
            console.log('Setting up mobile layout for autostart');
            this.setupMobilePlayerAreas();
        }
        
        // Start the game
        this.startNewGame();
        
        // Force visual indication that game started
        const statusElements = document.querySelectorAll('.player-status');
        statusElements.forEach(el => {
            el.textContent = 'Game Active';
            el.style.color = 'lime';
        });
        
        console.log('✓ Game autostart completed successfully');
    }

    handleMobileLayout() {
        const isMobile = window.innerWidth <= 1024;
        
        if (isMobile) {
            this.setupMobilePlayerAreas();
            this.syncMobileCardCount();
        }
    }
    
    setupMobilePlayerAreas() {
        // Skip if we're in the middle of a bust animation to prevent duplicate cards
        if (this.isBustAnimating) {
            console.log('Mobile sync skipped - bust animation in progress');
            return;
        }
        
        // Debug mobile detection
        const windowWidth = window.innerWidth;
        const isMobile = windowWidth <= 1024;
        console.log(`Mobile sync: width=${windowWidth}px, isMobile=${isMobile}, bustAnimating=${this.isBustAnimating}`);
        
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
                // Get elements from desktop player BEFORE clearing mobile
                const playerHeader = desktopPlayer.querySelector('.player-header');
                const playerStats = desktopPlayer.querySelector('.player-stats');
                const playerCards = desktopPlayer.querySelector('.player-cards');
                const actionButtons = desktopPlayer.querySelector('.action-buttons');
                
                // Preserve any existing freeze indicators before clearing
                const existingFreezeIndicator = mobilePlayer.querySelector('.frozen-indicator');
                const hasFrozenClass = mobilePlayer.classList.contains('enhanced-frozen');
                
                // Clear mobile container
                mobilePlayer.innerHTML = '';
                mobilePlayer.className = desktopPlayer.className;
                
                // Restore freeze effects if they existed
                if (existingFreezeIndicator || hasFrozenClass) {
                    console.log(`🧊 Preserving freeze effects for ${playerMap.mobile}`);
                    if (hasFrozenClass) {
                        mobilePlayer.classList.add('enhanced-frozen');
                    }
                }
                
                // Apply dynamic height classes based on card content
                this.applyMobilePlayerHeightClass(mobilePlayer, playerMap.desktop);
                
                // Rebuild mobile layout with cloned elements
                if (playerHeader && playerCards) {
                    // Clone elements to avoid moving them from desktop
                    const headerClone = playerHeader.cloneNode(true);
                    const cardsClone = playerCards.cloneNode(true);
                    
                    console.log(`Cloning ${playerMap.desktop}: cards=${cardsClone.children.length}, header text="${headerClone.textContent.trim()}"`);
                    
                    // Add score labels for mobile only
                    const roundScoreElement = headerClone.querySelector('.round-score');
                    const totalScoreElement = headerClone.querySelector('.total-score');
                    
                    if (roundScoreElement) {
                        const roundValue = roundScoreElement.querySelector('.round-value');
                        if (roundValue) {
                            roundScoreElement.innerHTML = `Round Score: <span class="round-value">${roundValue.textContent}</span>`;
                        }
                    }
                    
                    if (totalScoreElement) {
                        const scoreValue = totalScoreElement.querySelector('.score-value');
                        if (scoreValue) {
                            totalScoreElement.innerHTML = `Total Score: <span class="score-value">${scoreValue.textContent}</span>`;
                        }
                    }
                    
                    // Add player header (contains name and scores)
                    mobilePlayer.appendChild(headerClone);
                    
                    // Add player stats if exists
                    if (playerStats) {
                        const statsClone = playerStats.cloneNode(true);
                        mobilePlayer.appendChild(statsClone);
                    }
                    
                    // Add the unified cards container
                    mobilePlayer.appendChild(cardsClone);
                    
                    // Add action buttons for human player
                    if (actionButtons && playerMap.desktop === 'player') {
                        const buttonsClone = actionButtons.cloneNode(true);
                        mobilePlayer.appendChild(buttonsClone);
                    }
                    
                    // Re-add freeze indicator if it existed
                    if (existingFreezeIndicator) {
                        console.log(`🧊 Re-adding freeze indicator to ${playerMap.mobile}`);
                        mobilePlayer.style.position = 'relative';
                        mobilePlayer.appendChild(existingFreezeIndicator.cloneNode(true));
                    }
                } else {
                    console.warn(`Missing elements for ${playerMap.desktop}: header=${!!playerHeader}, cards=${!!playerCards}`);
                    // Fallback: Just copy innerHTML if structure is missing
                    mobilePlayer.innerHTML = desktopPlayer.innerHTML;
                    
                    // Re-add freeze indicator to fallback content as well
                    if (existingFreezeIndicator) {
                        console.log(`🧊 Re-adding freeze indicator to ${playerMap.mobile} (fallback)`);
                        mobilePlayer.style.position = 'relative';
                        mobilePlayer.appendChild(existingFreezeIndicator.cloneNode(true));
                    }
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
        if (window.innerWidth <= 1024) {
            this.dealerIndex = 3; // Bot 3 (opponent3) is index 3
        } else {
            this.dealerIndex = Math.floor(Math.random() * this.players.length);
        }
        this.addToLog(`${this.players[this.dealerIndex].name} is the dealer`);
        
        // Create a fresh deck for new game
        this.createDeck();
        this.discardPile = [];
        
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
            
            // Clear all freeze visual effects from both desktop and mobile
            this.clearAllFreezeEffects(player);
            
            // Clear all visual cards from DOM
            const isMainPlayer = player.id === 'player';
            const cardContainer = isMainPlayer 
                ? document.getElementById('player-cards')
                : document.getElementById(player.id).querySelector('.player-cards');
                
            if (cardContainer) {
                cardContainer.innerHTML = '';
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
        
        // Clear all state flags
        this.clearFlip3State();
        this.pendingFlip3Queue = [];
        this.dealNextCardFunction = null;
        this.pendingInitialDealContinuation = null;
        this.isProcessingFreeze = false; // Clear freeze processing flag
        this.flip3EndRoundAfterCompletion = false; // Clear self-freeze flag
        
        // Always deal initial cards
        this.isInitialDealing = true;
        setTimeout(() => this.dealInitialCards(), 500);
    }

    dealInitialCards() {
        console.log('🎰 Starting initial deal...');
        
        // Always start dealing with human player (index 0)
        this.currentDealIndex = 0;
        console.log('  Initial currentDealIndex set to:', this.currentDealIndex);
        
        // Store the deal function for continuation after special actions
        const dealNextCard = () => {
            console.log('🎴 dealNextCard called - currentDealIndex:', this.currentDealIndex);
            console.log('  Players length:', this.players.length);
            
            // Safety timeout to prevent permanent stuck state during initial deal
            this.initialDealSafetyTimeout = setTimeout(() => {
                if (this.isInitialDealing && this.pendingInitialDealContinuation) {
                    console.warn('⚠️ Initial deal stuck - forcing continuation');
                    const continuation = this.pendingInitialDealContinuation;
                    this.pendingInitialDealContinuation = null;
                    continuation();
                }
            }, 10000); // 10 second safety
            
            if (this.currentDealIndex >= this.players.length) {
                // All cards dealt, start the game with proper turn highlighting
                this.isInitialDealing = false;
                clearTimeout(this.initialDealSafetyTimeout); // Clear safety timeout
                this.initialDealSafetyTimeout = null;
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
                        setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 800); // Speed optimized timing
                    }
                }, 600);
                return;
            }
            
            const player = this.players[this.currentDealIndex];
            
            // Skip frozen or busted players during initial deal
            if (player.status === 'frozen' || player.status === 'busted') {
                if (player.status === 'frozen') {
                    this.addToLog(`${player.name} is frozen (${player.numberCards.length} cards) and skipped.`);
                } else {
                    this.addToLog(`${player.name} is busted and skipped.`);
                }
                this.currentDealIndex++;
                // Continue to next player
                if (this.currentDealIndex < this.players.length && this.gameActive) {
                    setTimeout(dealNextCard, 300);
                } else if (this.currentDealIndex >= this.players.length && this.gameActive) {
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
                            setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 800); // Speed optimized timing
                        }
                    }, 600);
                }
                return;
            }
            
            const card = this.drawCard();
            
            // Show card animation
            this.displayCard(card, player.id);
            
            // Handle the card draw
            setTimeout(() => {
                const continueDealing = () => {
                    this.currentDealIndex++;
                    // Check if we need to continue dealing or if the round ended
                    if (this.currentDealIndex < this.players.length && this.gameActive) {
                        setTimeout(dealNextCard, 800);
                    } else if (this.currentDealIndex >= this.players.length && this.gameActive) {
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
                                setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 800); // Speed optimized timing
                            }
                        }, 600);
                    }
                };
                
                const wasActionCard = this.handleInitialCardDraw(player, card, continueDealing);
                this.updateDisplay();
                
                // If it was not an action card, continue immediately
                if (!wasActionCard) {
                    console.log('  📦 Not an action card, continuing dealing immediately');
                    continueDealing();
                } else {
                    console.log('  ⏸️ Action card detected! Pausing dealing sequence for player action');
                }
                // If it was an action card, the action will call continueDealing when complete
            }, 1800);
        };
        
        // Store the function for continuation after special actions
        this.dealNextCardFunction = dealNextCard;
        console.log('  💾 Stored dealNextCardFunction for continuation');
        
        dealNextCard();
    }
    
    handleInitialCardDraw(player, card, onActionComplete = null) {
        if (card.type === 'number') {
            player.numberCards.push(card);
            player.uniqueNumbers.add(card.value);
            player.roundScore += card.value;
            return false;
        } else if (card.type === 'modifier') {
            player.modifierCards.push(card);
            return false;
        } else if (card.type === 'action') {
            // Special handling for Flip3 and Freeze - show correct interface based on player type
            if (card.value === 'flip3' || card.value === 'freeze') {
                console.log('🃏 Special action card during initial deal:', card.value, 'for player:', player.name);
                this.addToLog(`${player.name} drew ${card.display} during initial deal! Must use immediately.`);
                
                if (player.isHuman) {
                    // For human players during initial deal, store the continuation callback
                    // The drag & drop system will call continueAfterSpecialAction when done
                    console.log('  💾 Storing initial deal continuation for human action card');
                    this.pendingInitialDealContinuation = onActionComplete;
                    
                    // The displayCard call in dealInitialCards will handle the animation
                    // and transition to interactive mode automatically
                } else {
                    // For AI players, use the modal system
                    this.showSpecialActionModal(card, player);
                }
                return true; // Action card interrupts dealing flow
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


    showSpecialActionModal(card, player) {
        // Prevent opening modal if freeze is already being processed
        if (card.value === 'freeze' && this.isProcessingFreeze) {
            console.log('⏸️ Freeze already being processed - blocking modal');
            return;
        }
        
        // For bots, execute AI logic immediately
        if (!player.isHuman) {
            this.executeBotSpecialAction(card, player);
            return;
        }
        
        // For human players, show modal with drag & drop
        const modal = document.getElementById('special-action-modal');
        const titleElement = document.getElementById('special-action-title');
        const descriptionElement = document.getElementById('special-action-description');
        const cardElement = document.getElementById('special-action-card');
        const playerGrid = document.getElementById('special-action-player-grid');
        
        // Set modal content
        if (card.value === 'flip3') {
            titleElement.textContent = 'Flip Three Card';
            descriptionElement.textContent = 'Drag the card to any player to make them draw 3 cards';
        } else if (card.value === 'freeze') {
            titleElement.textContent = 'Freeze Card';
            descriptionElement.textContent = 'Drag the card to any player to freeze them';
        }
        
        // Setup the draggable card
        this.setupModalCard(cardElement, card, player);
        
        // Setup player drop zones
        this.setupModalPlayerGrid(playerGrid, card);
        
        // Show modal
        modal.style.display = 'flex';
    }
    
    executeBotSpecialAction(card, player) {
        let targetPlayer;
        
        if (card.value === 'freeze') {
            // Safety check: prevent multiple freeze processing
            if (this.isProcessingFreeze) {
                console.log('⏸️ Freeze already being processed - skipping bot action');
                return;
            }
            // Bot AI for Freeze: Target the point leader, but if bot is the leader, target next closest
            const pointLeader = this.getPointLeader();
            if (pointLeader === player) {
                // Bot is the leader, target the next closest player instead
                targetPlayer = this.getNextClosestPlayer(player);
                this.addToLog(`${player.name} uses Freeze on ${targetPlayer.name} (next closest player)!`);
            } else {
                // Target the point leader
                targetPlayer = pointLeader;
                this.addToLog(`${player.name} uses Freeze on ${targetPlayer.name} (point leader)!`);
            }
        } else if (card.value === 'flip3') {
            // Bot AI for Flip3: Target self if < 3 cards, otherwise random other player
            const botCardCount = player.numberCards.length;
            if (botCardCount < 3) {
                targetPlayer = player; // Target self
                this.addToLog(`${player.name} uses Flip3 on themselves (has ${botCardCount} cards)!`);
            } else {
                // Target random other active player
                const otherActivePlayers = this.players.filter(p => 
                    p.status === 'active' && p.id !== player.id
                );
                if (otherActivePlayers.length > 0) {
                    targetPlayer = otherActivePlayers[Math.floor(Math.random() * otherActivePlayers.length)];
                    this.addToLog(`${player.name} uses Flip3 on ${targetPlayer.name}!`);
                } else {
                    targetPlayer = player; // Fallback to self
                    this.addToLog(`${player.name} uses Flip3 on themselves (no other active players)!`);
                }
            }
        }
        
        // Execute the action
        this.executeSpecialAction(card, player, targetPlayer);
    }
    
    getPointLeader() {
        // Find player(s) with highest total score
        const maxScore = Math.max(...this.players.map(p => p.totalScore));
        const leaders = this.players.filter(p => p.totalScore === maxScore && p.status === 'active');
        
        // If multiple leaders, choose randomly among them
        return leaders[Math.floor(Math.random() * leaders.length)];
    }
    
    getNextClosestPlayer(excludePlayer) {
        // Get all active players except the one to exclude
        const otherPlayers = this.players.filter(p => p.status === 'active' && p !== excludePlayer);
        
        if (otherPlayers.length === 0) {
            return excludePlayer; // Fallback if no other active players
        }
        
        // Sort by total score (highest first)
        otherPlayers.sort((a, b) => b.totalScore - a.totalScore);
        
        // Return the highest scoring active player (excluding the bot itself)
        return otherPlayers[0];
    }
    
    setupModalCard(cardElement, card, player) {
        // Clear previous card
        cardElement.innerHTML = '';
        cardElement.className = 'card special-action-card';
        
        // Set card appearance
        if (card.value === 'flip3') {
            cardElement.classList.add('action');
            cardElement.textContent = 'Flip 3';
        } else if (card.value === 'freeze') {
            cardElement.classList.add('action');
            cardElement.textContent = 'Freeze';
        }
        
        // Use card image if available
        if (this.hasCardImage(card)) {
            const imageName = this.getCardImageName(card);
            cardElement.style.backgroundImage = `url('images/cards/${imageName}')`;
            cardElement.style.backgroundSize = 'cover';
            cardElement.style.backgroundPosition = 'center';
            cardElement.classList.add('custom-image');
            cardElement.textContent = ''; // Remove text when using image
        }
        
        // Setup drag functionality
        this.setupModalCardDrag(cardElement, card, player);
    }
    
    setupModalCardDrag(cardElement, card, player) {
        // Remove HTML5 drag API - use touch events instead
        cardElement.draggable = false;
        
        // Touch-based drag variables
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentDropTarget = null;
        let animationFrameId = null;
        
        // Touch start - begin drag operation
        cardElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            
            // Get the card's current position relative to the viewport
            const rect = cardElement.getBoundingClientRect();
            
            // Center the card under the finger for better control
            const cardWidth = rect.width;
            const cardHeight = rect.height;
            startX = cardWidth / 2;
            startY = cardHeight / 2;
            
            // Enable dragging positioning with improved setup
            cardElement.classList.add('dragging');
            cardElement.style.cursor = 'grabbing';
            cardElement.style.position = 'fixed';
            cardElement.style.left = (touch.clientX - startX) + 'px';
            cardElement.style.top = (touch.clientY - startY) + 'px';
            cardElement.style.zIndex = '15000';
            cardElement.style.pointerEvents = 'none'; // Prevent touch conflicts
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            currentDropTarget = null;
            
            // Highlight modal drop zones
            this.highlightModalDropZones(card.value);
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Touch move - follow finger
        cardElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            
            // Use requestAnimationFrame for smoother movement
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                // Position card centered under finger
                const newLeft = touch.clientX - startX;
                const newTop = touch.clientY - startY;
                
                cardElement.style.left = newLeft + 'px';
                cardElement.style.top = newTop + 'px';
                cardElement.style.transform = 'scale(1.3) rotate(-5deg)'; // Add visual feedback
                
                // Enhanced drop target detection
                const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                let newDropTarget = elementUnder?.closest('.special-action-player, .valid-drop-target');
                
                // Mobile forgiveness - search for nearby drop targets
                if (!newDropTarget && window.innerWidth <= 1024) {
                    const tolerance = 80; // Larger tolerance for modal
                    const dropTargets = document.querySelectorAll('.special-action-player');
                    
                    let closestTarget = null;
                    let closestDistance = tolerance;
                    
                    dropTargets.forEach(target => {
                        const rect = target.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        const distance = Math.sqrt(
                            Math.pow(touch.clientX - centerX, 2) + 
                            Math.pow(touch.clientY - centerY, 2)
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestTarget = target;
                        }
                    });
                    
                    newDropTarget = closestTarget;
                }
                
                // Update drop target highlighting
                if (newDropTarget !== currentDropTarget) {
                    // Remove highlight from previous target
                    if (currentDropTarget) {
                        currentDropTarget.classList.remove('drag-hover');
                    }
                    
                    // Add highlight to new target
                    if (newDropTarget) {
                        newDropTarget.classList.add('drag-hover');
                        // Add subtle vibration when hovering over valid target
                        if (navigator.vibrate) {
                            navigator.vibrate(25);
                        }
                    }
                    
                    currentDropTarget = newDropTarget;
                }
            });
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Touch end - handle drop
        cardElement.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            // Cancel any pending animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Find final drop target
            const touch = e.changedTouches[0];
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            let dropTarget = elementUnder?.closest('.special-action-player');
            
            // Enhanced drop detection for mobile - try nearby targets if no direct hit
            if (!dropTarget && window.innerWidth <= 1024) {
                const tolerance = 100; // Even larger tolerance on release
                const dropTargets = document.querySelectorAll('.special-action-player');
                
                let closestTarget = null;
                let closestDistance = tolerance;
                
                dropTargets.forEach(target => {
                    const rect = target.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const distance = Math.sqrt(
                        Math.pow(touch.clientX - centerX, 2) + 
                        Math.pow(touch.clientY - centerY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTarget = target;
                    }
                });
                
                dropTarget = closestTarget;
            }
            
            // Clean up drag state
            cardElement.classList.remove('dragging');
            cardElement.style.position = '';
            cardElement.style.left = '';
            cardElement.style.top = '';
            cardElement.style.transform = '';
            cardElement.style.zIndex = '';
            cardElement.style.pointerEvents = '';
            cardElement.style.cursor = '';
            
            // Clear all drop target highlights
            this.clearModalDropZoneHighlights();
            document.querySelectorAll('.special-action-player').forEach(el => {
                el.classList.remove('drag-hover');
            });
            
            // Handle successful drop
            if (dropTarget) {
                const targetPlayerId = dropTarget.dataset.playerId;
                const targetPlayer = this.players.find(p => p.id === targetPlayerId);
                
                if (targetPlayer) {
                    // Success haptic feedback
                    if (navigator.vibrate) {
                        navigator.vibrate([50, 100, 50]);
                    }
                    
                    // Close modal and execute action
                    const modal = document.getElementById('special-action-modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Execute the special action
                    this.executeSpecialAction(card, player, targetPlayer);
                    return;
                }
            }
            
            // No valid drop - provide feedback
            if (navigator.vibrate) {
                navigator.vibrate(200); // Error vibration
            }
            
            // Reset card position if no valid drop
            console.log('No valid drop target found');
            
            e.preventDefault();
            e.stopPropagation();
        });
    }
    
    setupModalPlayerGrid(playerGrid, card) {
        playerGrid.innerHTML = '';
        
        // Add all active players as drop zones
        this.players.forEach(player => {
            if (player.status === 'active') {
                const playerElement = document.createElement('div');
                playerElement.className = 'special-action-player';
                playerElement.dataset.playerId = player.id;
                
                // Player info
                const nameElement = document.createElement('div');
                nameElement.className = 'special-action-player-name';
                nameElement.textContent = player.name;
                
                const scoreElement = document.createElement('div');
                scoreElement.className = 'special-action-player-score';
                scoreElement.textContent = `Total: ${player.totalScore} | Round: ${player.roundScore}`;
                
                playerElement.appendChild(nameElement);
                playerElement.appendChild(scoreElement);
                
                // Add drop target class and setup drop functionality
                playerElement.classList.add('valid-drop-target');
                this.setupModalPlayerDrop(playerElement, player, card);
                
                playerGrid.appendChild(playerElement);
            }
        });
    }
    
    setupModalPlayerDrop(playerElement, targetPlayer, card) {
        playerElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        playerElement.addEventListener('drop', (e) => {
            e.preventDefault();
            
            try {
                const dropData = JSON.parse(e.dataTransfer.getData('text/plain'));
                const drawnByPlayer = this.players.find(p => p.id === dropData.drawnBy);
                
                // Hide modal
                document.getElementById('special-action-modal').style.display = 'none';
                
                // Execute the action
                this.executeSpecialAction(card, drawnByPlayer, targetPlayer);
                
            } catch (error) {
                console.error('Error processing modal drop:', error);
            }
            
            this.clearModalDropZoneHighlights();
        });
    }
    
    highlightModalDropZones(actionType) {
        document.querySelectorAll('.special-action-player').forEach(playerElement => {
            playerElement.classList.add('valid-drop-target');
            if (actionType === 'flip3') {
                playerElement.classList.add('drop-target-flip3');
            } else if (actionType === 'freeze') {
                playerElement.classList.add('drop-target-freeze');
            }
        });
    }
    
    clearModalDropZoneHighlights() {
        document.querySelectorAll('.special-action-player').forEach(playerElement => {
            playerElement.classList.remove('valid-drop-target', 'drop-target-flip3', 'drop-target-freeze');
        });
    }
    
    executeSpecialAction(card, drawnByPlayer, targetPlayer) {
        // Show visual drag animation for AI players
        if (!drawnByPlayer.isHuman) {
            this.animateAICardDrag(card, drawnByPlayer, targetPlayer, () => {
                this.executeSpecialActionEffect(card, drawnByPlayer, targetPlayer);
            });
        } else {
            // Human players use the interactive drag system, so execute directly
            this.executeSpecialActionEffect(card, drawnByPlayer, targetPlayer);
        }
    }

    executeSpecialActionEffect(card, drawnByPlayer, targetPlayer) {
        if (card.value === 'flip3') {
            this.executeFlipThree(drawnByPlayer, targetPlayer, () => {
                // After Flip3 completes, discard the card
                this.discardPile.push({
                    type: 'action',
                    value: card.value,
                    display: 'Flip Three'
                });
                this.updateDisplay();
                
                // Check if there are pending Flip 3s to process
                if (this.pendingFlip3Queue.length > 0) {
                    // Process next Flip 3 in queue
                    this.processPendingFlip3Queue();
                } else if (!this.isProcessingFlip3) {
                    // All Flip 3s complete - safe to continue turn
                    console.log('🎴 Flip 3 complete - calling continueAfterSpecialAction');
                    this.continueAfterSpecialAction();
                }
                // If still processing a Flip 3, don't continue yet
            });
        } else if (card.value === 'freeze') {
            // Set processing flag to prevent modal blocking
            this.isProcessingFreeze = true;
            
            // Safety check: validate target player is still active
            if (targetPlayer.status !== 'active') {
                this.isProcessingFreeze = false;
                this.addToLog(`${drawnByPlayer.name} tried to freeze ${targetPlayer.name}, but they were already inactive!`);
                this.continueAfterSpecialAction();
                return;
            }
            
            // Freeze card logic
            targetPlayer.isFrozen = true;
            
            // Check if player has any cards
            if (targetPlayer.numberCards.length === 0) {
                // Player frozen before getting any cards - they get 0 points
                targetPlayer.status = 'frozen';
                targetPlayer.roundScore = 0;
                this.addToLog(`${targetPlayer.name} was frozen before receiving any cards! 0 points.`);
            } else {
                // Normal freeze - bank their current points
                targetPlayer.status = 'stayed';
                this.calculateRoundScore(targetPlayer);
            }
            
            // Add enhanced freeze visual effects
            this.addFreezeVisualEffects(targetPlayer);
            
            // For Freeze cards, discard immediately since effect is instant
            this.discardPile.push({
                type: 'action',
                value: card.value,
                display: 'Freeze'
            });
            
            // Update display to show frozen status
            this.updateDisplay();
            
            // Clear freeze processing flag after a brief delay to allow visual effects
            setTimeout(() => {
                this.isProcessingFreeze = false;
            }, 500);
            
            // Check if this was a self-freeze during Flip 3
            if (this.isProcessingFlip3 && drawnByPlayer === targetPlayer) {
                this.addToLog(`${drawnByPlayer.name} froze themselves during Flip 3! Round ends!`);
                // Set flag to end round after Flip 3 completes
                this.flip3EndRoundAfterCompletion = true;
            }
            
            // For AI players, ensure turn continuation after freeze
            if (!drawnByPlayer.isHuman) {
                // Small delay to allow animation to complete
                setTimeout(() => {
                    this.continueAfterSpecialAction();
                }, 100);
            } else {
                // Human players handle continuation differently
                this.continueAfterSpecialAction();
            }
        }
    }
    
    continueAfterSpecialAction() {
        console.log('🔄 continueAfterSpecialAction called');
        console.log('  isInitialDealing:', this.isInitialDealing);
        console.log('  currentDealIndex:', this.currentDealIndex);
        console.log('  players.length:', this.players.length);
        console.log('  dealNextCardFunction exists:', !!this.dealNextCardFunction);
        console.log('  pendingInitialDealContinuation exists:', !!this.pendingInitialDealContinuation);
        
        // Continue the game flow after special action is completed
        // This handles resuming turns or continuing initial deal
        if (this.isInitialDealing) {
            console.log('  📋 Continuing initial deal sequence...');
            
            // Check if we have a stored continuation callback (for human action cards)
            if (this.pendingInitialDealContinuation) {
                console.log('  ✅ Using stored continuation callback for human action card');
                const continuation = this.pendingInitialDealContinuation;
                this.pendingInitialDealContinuation = null; // Clear it
                // Clear safety timeout since we're continuing
                if (this.initialDealSafetyTimeout) {
                    clearTimeout(this.initialDealSafetyTimeout);
                    this.initialDealSafetyTimeout = null;
                }
                continuation(); // Call the stored continuation
                return;
            }
            
            // Continue initial dealing from where it left off
            // Simulate what continueDealing() would do: increment and then call dealNextCard
            setTimeout(() => {
                console.log('  ⏭️ Before increment - currentDealIndex:', this.currentDealIndex);
                this.currentDealIndex++; // Move to next player (same as continueDealing does)
                console.log('  ⏭️ After increment - currentDealIndex:', this.currentDealIndex);
                
                // Check if we need to continue dealing or if all players are dealt
                if (this.currentDealIndex < this.players.length && this.gameActive) {
                    console.log('  ✅ Continuing dealing to player', this.currentDealIndex, '(' + this.players[this.currentDealIndex].name + ')');
                    // Call dealNextCard with the same delay as continueDealing uses
                    setTimeout(() => this.dealNextCardFunction(), 800);
                } else if (this.currentDealIndex >= this.players.length && this.gameActive) {
                    console.log('  🏁 Initial dealing complete - transitioning to normal gameplay');
                    // All players dealt, finish initial dealing (same as continueDealing does)
                    this.isInitialDealing = false;
                    
                    // Start normal gameplay
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
                            setTimeout(() => this.takeAITurn(this.players[this.currentPlayerIndex]), 800);
                        }
                    }, 600);
                }
            }, 600);
        } else {
            console.log('  🎯 Normal gameplay - calling nextTurn()');
            // Move to next turn after special action completes
            this.nextTurn();
        }
    }


    drawCard() {
        if (this.deck.length === 0) {
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
                    
                    // Safety timeout to clear bust animation flag in case it gets stuck
                    setTimeout(() => {
                        if (this.isBustAnimating) {
                            console.log('Clearing stuck bust animation flag');
                            this.isBustAnimating = false;
                            this.setupMobilePlayerAreas(); // Force mobile sync
                        }
                    }, 5000); // 5 second safety timeout
                    
                    // Temporarily add the card just for display purposes during bust animation
                    player.numberCards.push(bustCard);
                    player.numberCards.sort((a, b) => a.value - b.value);
                    
                    // Update display to show duplicate card in hand with highlighting
                    this.updateDisplay();
                    
                    // Longer pause to let player clearly see the duplicate card that caused bust
                    setTimeout(() => {
                        this.addToLog(`${player.name} busted with duplicate ${card.value}!`);
                        // Keep both duplicate cards in hand until round ends
                        // (They will be cleared in startNewRound())
                        this.animateBust(player);
                    }, 1500);
                    
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
            // Special handling for Flip3 and Freeze
            if (card.value === 'flip3' || card.value === 'freeze') {
                // During Flip 3, defer to queue as before
                if (duringFlip3) {
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
                    // For AI bots, use modal system
                    if (!player.isHuman) {
                        this.addToLog(`${player.name} drew ${card.display}! Must use immediately.`);
                        this.showSpecialActionModal(card, player);
                        return { endTurn: false, busted: false, waitingForModal: true };
                    } else {
                        // For human players, let the animation system handle it via transitionToInteractiveCard
                        this.addToLog(`${player.name} drew ${card.display}! Must use immediately.`);
                        return { endTurn: false, busted: false, waitingForAnimation: true };
                    }
                }
            } else {
                // Handle other action cards (like Second Chance) normally
                const actionEndsTurn = this.handleActionCard(player, card);
                return { endTurn: actionEndsTurn, busted: false };
            }
        }
        
        return { endTurn: false, busted: false };
    }

    handleActionCard(player, card) {
        // This function now only handles Second Chance cards
        // Flip3 and Freeze are handled by the modal system in handleCardDraw
        switch (card.value) {
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



    executeFlipThree(cardOwner, targetPlayer, onComplete = null) {
        this.addToLog(`${cardOwner.name} plays Flip Three on ${targetPlayer.name}!`);
        this.isProcessingFlip3 = true;
        let cardsFlipped = 0;
        let pendingActions = [];
        const drawnCards = [];
        const deferredActionCards = []; // Action cards drawn during Flip 3 that will be processed after completion
        
        // Show Flip3 sequence indicator
        this.showFlip3SequenceIndicator(cardOwner, targetPlayer, cardsFlipped);
        
        const processNextCard = () => {
            console.log(`🔄 processNextCard called - cardsFlipped: ${cardsFlipped}, pendingActions: ${pendingActions.length}, targetPlayer.status: ${targetPlayer.status}`);
            
            // Check if we need to process pending actions first
            if (pendingActions.length > 0) {
                console.log(`⏳ Processing pending action: ${pendingActions[0].card?.display}`);
                const action = pendingActions.shift();
                this.processQueuedAction(action, () => {
                    console.log(`✅ Pending action processed, continuing Flip3`);
                    // After processing the action, continue with the next card or action
                    processNextCard();
                });
                return;
            }
            
            // Safety check: verify target player is still valid
            if (targetPlayer.status !== 'active' && targetPlayer.status !== 'flip7') {
                console.log(`⚠️ Target player ${targetPlayer.name} is no longer active (${targetPlayer.status}) - ending Flip 3 early`);
                // Force end the Flip 3 sequence
                cardsFlipped = 3;
            }
            
            if (cardsFlipped >= 3 || targetPlayer.status !== 'active') {
                console.log(`🎯 Flip3 sequence ending - cardsFlipped: ${cardsFlipped}, targetPlayer.status: ${targetPlayer.status}, drawnCards: ${drawnCards.length}`);
                
                // All cards drawn successfully - now add them to the player's hand
                if (drawnCards.length > 0 && targetPlayer.status === 'active') {
                    drawnCards.forEach(card => {
                        if (card.type === 'number') {
                            targetPlayer.numberCards.push(card);
                            targetPlayer.uniqueNumbers.add(card.value);
                            targetPlayer.numberCards.sort((a, b) => a.value - b.value);
                        } else if (card.type === 'modifier') {
                            targetPlayer.modifierCards.push(card);
                        } else if (card.type === 'action') {
                            // Action cards were already queued
                        }
                    });
                    
                    // Animate success
                    this.animateFlip3Success();
                    this.updateDisplay();
                }
                
                // Flip Three sequence completed - cleanup
                this.isProcessingFlip3 = false;
                this.flip3CompletionPending = true; // Set completion pending flag
                // Don't clear other state yet - will be done after completion handler
                
                // Process deferred action cards before completion
                this.processDeferredActionCards(deferredActionCards, targetPlayer, drawnCards);
                
                // Check what to do after Flip 3 completes
                const checkPendingFlip3 = () => {
                    console.log(`🏁 Flip3 completion handler - onComplete: ${!!onComplete}, pendingQueue: ${this.pendingFlip3Queue.length}`);
                    
                    if (onComplete) {
                        console.log(`📞 Calling onComplete callback`);
                        this.clearFlip3State(); // Clear all state before callback
                        // Let the completion callback handle next steps
                        onComplete();
                    } else {
                        console.log(`🔍 No onComplete callback - checking queue`);
                        // No callback provided - check for pending Flip 3s
                        if (this.pendingFlip3Queue.length > 0) {
                            console.log(`🔄 Processing pending Flip3 queue`);
                            this.clearFlip3State(); // Clear state before processing next
                            this.processPendingFlip3Queue();
                        } else {
                            console.log(`✅ Flip3 complete - checking for round end`);
                            this.clearFlip3State(); // Clear all state before checking round end
                            
                            // Check if we need to end round due to self-freeze
                            if (this.flip3EndRoundAfterCompletion) {
                                console.log(`🧊 Ending round due to self-freeze during Flip 3`);
                                this.flip3EndRoundAfterCompletion = false;
                                this.endRound();
                            } else {
                                this.checkForRoundEnd();
                            }
                        }
                    }
                };
                
                console.log(`⏰ Setting 2-second timeout for Flip3 completion`);
                setTimeout(checkPendingFlip3, 2000); // Wait for animations
                return;
            }
            
            // Safety check: ensure deck has cards
            if (this.deck.length === 0) {
                console.log('⚠️ Deck empty during Flip 3 - reshuffling');
                this.reshuffleDeck();
            }
            
            const nextCard = this.drawCard();
            cardsFlipped++;
            console.log(`🎴 Drew card ${cardsFlipped}: ${nextCard.display} (${nextCard.type})`);
            
            // Preview the card in the popup
            const slotNumber = cardsFlipped;
            let isDuplicate = nextCard.type === 'number' && targetPlayer.uniqueNumbers.has(nextCard.value);
            const hasSecondChance = targetPlayer.hasSecondChance && isDuplicate;
            console.log(`🔍 Card analysis - isDuplicate: ${isDuplicate}, hasSecondChance: ${hasSecondChance}`);
            
            // Store all cards temporarily (we'll handle them based on outcome)
            this.flip3DrawnCards.push(nextCard);
            
            // Show card preview with animation
            console.log(`🎬 Starting preview animation for slot ${slotNumber}`);
            setTimeout(() => {
                this.previewFlip3Card(nextCard, slotNumber);
                
                // Update Flip3 progress indicator
                this.updateFlip3Progress(cardsFlipped);
                console.log(`📊 Updated progress indicator to ${cardsFlipped}/3`);
                
                // Check for action cards that should be deferred until after Flip 3 completes
                if (nextCard.type === 'action' && (nextCard.value === 'flip3' || nextCard.value === 'freeze' || nextCard.value === 'second_chance')) {
                    console.log(`🎭 Action card drawn during Flip3: ${nextCard.display} - deferring until completion`);
                    // Action card drawn during Flip 3 - defer until completion
                    this.addToLog(`${targetPlayer.name} drew ${nextCard.display} during Flip 3! Will be resolved after completion.`);
                    
                    // Add to deferred actions to be processed after Flip 3 completes
                    deferredActionCards.push({
                        card: nextCard,
                        drawnBy: targetPlayer,
                        cardNumber: cardsFlipped // Track which card in sequence this was
                    });
                    
                    // Add card to drawn cards for normal processing
                    drawnCards.push(nextCard);
                    
                    console.log(`🎯 Normal flow reached - will continue to next card`);
                    // Continue to next card after showing preview
                    console.log(`⏭️  Scheduling next card in 1.5 seconds (cardsFlipped: ${cardsFlipped}/3)`);
                    setTimeout(() => {
                        console.log(`🔄 Timeout fired - calling processNextCard again`);
                        processNextCard();
                    }, 1500);
                    return;
                }
                
                // Handle duplicates with Second Chance
                if (isDuplicate && hasSecondChance) {
                    // Transfer Second Chance to random other player
                    const otherPlayers = this.players.filter(p => p.id !== targetPlayer.id && p.status === 'active');
                    if (otherPlayers.length > 0) {
                        const recipient = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                        targetPlayer.hasSecondChance = false;
                        targetPlayer.actionCards = targetPlayer.actionCards.filter(c => c.value !== 'second_chance');
                        recipient.hasSecondChance = true;
                        recipient.actionCards.push({ type: 'action', value: 'second_chance', display: 'Second Chance' });
                        
                        this.addToLog(`${targetPlayer.name}'s Second Chance transferred to ${recipient.name}!`);
                        
                        // Show Second Chance animation
                        this.animateSecondChanceActivation(targetPlayer, nextCard);
                        
                        // Add the card as normal (not duplicate anymore)
                        drawnCards.push(nextCard);
                        
                        // Continue to next card
                        setTimeout(processNextCard, 2000);
                    } else {
                        // No other players, treat as normal duplicate
                        isDuplicate = true;
                    }
                    return;
                }
                
                if (isDuplicate && !hasSecondChance) {
                    // Handle bust
                    targetPlayer.numberCards.push(nextCard);
                    targetPlayer.numberCards.sort((a, b) => a.value - b.value);
                    targetPlayer.status = 'busted';
                    this.addToLog(`${targetPlayer.name} busted with duplicate ${nextCard.value} during Flip Three!`);
                    this.calculateRoundScore(targetPlayer);
                    
                    // Show bust animation in popup briefly
                    this.handleFlip3Bust(nextCard, cardsFlipped);
                    
                    // Update display to show bust
                    this.updateDisplay();
                    
                    // End Flip3 sequence - set flags but don't clear state yet
                    this.isProcessingFlip3 = false;
                    this.flip3CompletionPending = true; // Set completion pending flag
                    
                    // Hide popup immediately and continue to next turn
                    setTimeout(() => {
                        this.hideFlip3SequenceIndicator();
                        
                        // Check what to do after bust
                        setTimeout(() => {
                            if (onComplete) {
                                this.clearFlip3State(); // Clear all state before callback
                                // Let the completion callback handle next steps
                                onComplete();
                            } else {
                                // No callback - check for pending Flip 3s or continue turn
                                if (this.pendingFlip3Queue.length > 0) {
                                    this.clearFlip3State(); // Clear state before processing next
                                    this.processPendingFlip3Queue();
                                } else {
                                    this.clearFlip3State(); // Clear all state before next turn
                                    this.nextTurn(); // Go directly to next turn
                                }
                            }
                        }, 300); // Brief pause after hiding popup
                    }, 800); // Show bust message briefly
                    return; // CRITICAL: Stop Flip 3 sequence immediately on bust
                } else {
                    console.log(`✅ Normal card processing - adding ${nextCard.display} to drawnCards`);
                    // Card is not a duplicate - add to drawn cards
                    drawnCards.push(nextCard);
                    
                    // Check if this card completes Flip 7
                    if (nextCard.type === 'number') {
                        const tempUniqueNumbers = new Set(targetPlayer.uniqueNumbers);
                        tempUniqueNumbers.add(nextCard.value);
                        
                        if (tempUniqueNumbers.size === 7) {
                            // Flip 7 achieved during Flip 3!
                            this.addToLog(`${targetPlayer.name} achieved Flip 7 during Flip 3!`);
                            
                            // Add all drawn cards so far
                            drawnCards.forEach(card => {
                                if (card.type === 'number') {
                                    targetPlayer.numberCards.push(card);
                                    targetPlayer.uniqueNumbers.add(card.value);
                                    targetPlayer.numberCards.sort((a, b) => a.value - b.value);
                                } else if (card.type === 'modifier') {
                                    targetPlayer.modifierCards.push(card);
                                } else if (card.type === 'action') {
                                    // Action cards are now deferred and will be processed after Flip 3 completes
                                    // Don't add them to player immediately
                                }
                            });
                            
                            targetPlayer.status = 'flip7';
                            this.updateDisplay();
                            
                            // Hide Flip 3 indicator
                            this.hideFlip3SequenceIndicator();
                            
                            // Show Flip 7 celebration
                            if (targetPlayer.isHuman) {
                                this.animateFlip7Celebration(targetPlayer);
                            } else {
                                // For AI, just end the round
                                setTimeout(() => {
                                    this.endRound();
                                }, 600);
                            }
                            
                            // End Flip 3 sequence - set flags but don't clear state yet
                            this.isProcessingFlip3 = false;
                            this.flip3CompletionPending = true; // Set completion pending flag
                            
                            // Check what to do after Flip 7
                            const checkPendingFlip3 = () => {
                                if (onComplete) {
                                    this.clearFlip3State(); // Clear all state before callback
                                    // Let the completion callback handle next steps
                                    onComplete();
                                } else {
                                    // No callback - check for pending Flip 3s
                                    if (this.pendingFlip3Queue.length > 0) {
                                        this.clearFlip3State(); // Clear state before processing next
                                        this.processPendingFlip3Queue();
                                    } else {
                                        this.clearFlip3State(); // Clear all state
                                    }
                                    // Round will end automatically due to Flip 7
                                }
                            };
                            
                            // Wait longer for Flip 7 celebration
                            setTimeout(checkPendingFlip3, 5000);
                            return;
                        }
                    }
                    
                    console.log(`🎯 Normal flow reached - will continue to next card`);
                    // Continue to next card after showing preview
                    console.log(`⏭️  Scheduling next card in 1.5 seconds (cardsFlipped: ${cardsFlipped}/3)`);
                    setTimeout(() => {
                        console.log(`🔄 Timeout fired - calling processNextCard again`);
                        processNextCard();
                    }, 1500);
                }
            }, 600);
        };
        
        console.log(`🚀 Starting Flip3 sequence in 0.5 seconds`);
        setTimeout(() => {
            console.log(`🎯 Initial timeout fired - starting processNextCard`);
            processNextCard();
        }, 500);
    }
    
    processDeferredActionCards(deferredActionCards, targetPlayer, drawnCards) {
        console.log(`🎭 Processing ${deferredActionCards.length} deferred action cards for ${targetPlayer.name}`);
        
        // Check if the player busted during the Flip 3
        const playerBusted = targetPlayer.status === 'busted';
        
        if (playerBusted) {
            // Player busted - nullify all deferred action cards
            console.log(`💀 ${targetPlayer.name} busted during Flip 3 - nullifying all deferred action cards`);
            this.addToLog(`${targetPlayer.name} busted during Flip 3! All action cards drawn are discarded.`);
            
            // Discard all deferred action cards
            deferredActionCards.forEach(actionData => {
                this.discardPile.push(actionData.card);
                console.log(`🗑️ Discarded ${actionData.card.display} due to bust`);
            });
            
            return; // No further processing needed
        }
        
        // Player didn't bust - process each deferred action card
        if (deferredActionCards.length > 0) {
            this.addToLog(`${targetPlayer.name} completed Flip 3 without busting! Processing ${deferredActionCards.length} action card(s):`);
            
            deferredActionCards.forEach((actionData, index) => {
                const { card, drawnBy, cardNumber } = actionData;
                console.log(`🎯 Processing deferred action ${index + 1}/${deferredActionCards.length}: ${card.display} (drawn as card ${cardNumber})`);
                
                if (card.value === 'second_chance') {
                    // Handle Second Chance
                    if (!drawnBy.hasSecondChance) {
                        drawnBy.hasSecondChance = true;
                        drawnBy.actionCards.push(card);
                        this.addToLog(`${drawnBy.name} gained a Second Chance!`);
                    } else {
                        // Handle duplicate Second Chance
                        this.handleDuplicateSecondChance(drawnBy, card);
                    }
                } else if (card.value === 'flip3') {
                    // Handle deferred Flip 3 - add to pending queue
                    this.addToLog(`${drawnBy.name} can now use Flip 3!`);
                    this.pendingFlip3Queue.push({
                        cardOwner: drawnBy,
                        card: card
                    });
                    
                    // If it's a human player, they'll need to select a target when the queue is processed
                    if (drawnBy.isHuman) {
                        console.log(`👤 Human player will select Flip 3 target when queue is processed`);
                    } else {
                        // AI selects target immediately
                        const actionTarget = this.determineAITarget(drawnBy, card);
                        this.pendingFlip3Queue[this.pendingFlip3Queue.length - 1].target = actionTarget;
                        this.addToLog(`${drawnBy.name} will use Flip 3 on ${actionTarget.name}!`);
                    }
                } else if (card.value === 'freeze') {
                    // Handle deferred Freeze - add it to player's action cards for immediate use
                    this.addToLog(`${drawnBy.name} can now use Freeze!`);
                    
                    if (drawnBy.isHuman) {
                        // Human player gets the freeze card to use
                        drawnBy.actionCards.push(card);
                        this.addToLog(`${drawnBy.name} received a Freeze card to use.`);
                    } else {
                        // AI uses freeze immediately
                        const actionTarget = this.determineAITarget(drawnBy, card);
                        setTimeout(() => {
                            this.executeSpecialAction(card, drawnBy, actionTarget);
                        }, 1000 * (index + 1)); // Stagger AI actions
                    }
                }
            });
        }
    }
    
    processPendingFlip3Queue() {
        // Check if there are pending Flip 3 cards to execute
        if (this.pendingFlip3Queue.length > 0) {
            const pendingFlip3 = this.pendingFlip3Queue.shift();
            this.addToLog(`Processing queued Flip 3 from ${pendingFlip3.cardOwner.name}`);
            
            // Execute the queued Flip 3
            if (pendingFlip3.target) {
                // Target already selected (AI)
                this.executeFlipThree(pendingFlip3.cardOwner, pendingFlip3.target, () => {
                    // After this Flip 3 completes, check for more in queue
                    this.processPendingFlip3Queue();
                });
            } else {
                // Need to select target (human) - this shouldn't happen as we handle it earlier
                console.warn('Pending Flip 3 without target - this should not happen');
                this.processPendingFlip3Queue();
            }
        } else {
            // No more Flip 3s in queue - check if we should continue turn
            if (!this.isProcessingFlip3) {
                // All Flip 3s complete - safe to continue
                this.continueAfterSpecialAction();
            }
        }
    }
    
    isProcessingAnyFlip3() {
        // Check if currently processing a Flip 3, have any queued, or completion is pending
        return this.isProcessingFlip3 || this.flip3CompletionPending || this.pendingFlip3Queue.length > 0;
    }
    
    clearFlip3State() {
        // Centralized method to clear all Flip 3 related state
        console.log('🧹 Clearing Flip3 state');
        this.isProcessingFlip3 = false;
        this.flip3CompletionPending = false;
        this.flip3TargetPlayer = null;
        this.flip3DrawnCards = [];
    }
    
    reshuffleDeck() {
        // Reshuffle discard pile back into deck when deck runs out
        console.log('🔀 Reshuffling discard pile into deck');
        
        if (this.discardPile.length === 0) {
            console.error('❌ Both deck and discard pile are empty!');
            // Emergency: create a few cards to prevent game halt
            this.deck = [
                { type: 'number', value: 5, display: '5' },
                { type: 'number', value: 8, display: '8' },
                { type: 'modifier', value: 2, display: '+2' }
            ];
            return;
        }
        
        // Move all discard pile cards back to deck
        this.deck = [...this.discardPile];
        this.discardPile = [];
        
        // Shuffle the deck
        this.shuffleDeck();
        
        console.log(`✅ Reshuffled ${this.deck.length} cards back into deck`);
    }

    activateSecondChance(player, duplicateCard) {
        this.addToLog(`${player.name} used Second Chance to avoid busting!`);
        
        // Apply animation for all players (human and AI)
        this.animateSecondChanceActivation(player, duplicateCard);
    }

    animateFreezeTransfer(cardOwner, targetPlayer, onComplete) {
        // Find the freeze card in the card owner's hand
        const ownerContainer = document.getElementById(cardOwner.id);
        const ownerCardContainer = cardOwner.isHuman 
            ? document.getElementById('player-cards')
            : ownerContainer.querySelector('.player-cards');
        
        const freezeCard = Array.from(ownerCardContainer.children).find(card => 
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
        // Get the unified card container for this player
        const playerContainer = document.getElementById(player.id);
        const cardContainer = player.isHuman 
            ? document.getElementById('player-cards')
            : playerContainer.querySelector('.player-cards');
            
        if (!cardContainer) {
            // Fallback if container not found
            this.removeSecondChanceCards(player, duplicateCard);
            return;
        }
        
        // Find the Second Chance card element
        const secondChanceCard = Array.from(cardContainer.children).find(card => 
            card.dataset.cardValue === 'second_chance'
        );
        
        // Find the duplicate number card element (it should be the last one added)
        const duplicateCardElements = Array.from(cardContainer.children).filter(card =>
            card.dataset.cardValue == duplicateCard.value.toString()
        );
        // Get the last one (the duplicate that was just added)
        const duplicateCardElement = duplicateCardElements[duplicateCardElements.length - 1];
        
        if (secondChanceCard && duplicateCardElement) {
            // Calculate positions for floating animation
            const secondChanceRect = secondChanceCard.getBoundingClientRect();
            const duplicateRect = duplicateCardElement.getBoundingClientRect();
            
            // Calculate the distance and direction for floating
            const deltaX = duplicateRect.left - secondChanceRect.left;
            const deltaY = duplicateRect.top - secondChanceRect.top;
            
            // Set CSS custom properties for the float animation
            secondChanceCard.style.setProperty('--float-x', `${deltaX}px`);
            secondChanceCard.style.setProperty('--float-y', `${deltaY}px`);
            
            // Stage 1: Start floating animation (800ms)
            secondChanceCard.classList.add('second-chance-floating');
            duplicateCardElement.classList.add('duplicate-targeted');
            
            setTimeout(() => {
                // Stage 2: Both cards hover together (400ms)
                secondChanceCard.classList.add('second-chance-hovering');
                duplicateCardElement.classList.add('duplicate-hovering');
                
                setTimeout(() => {
                    // Stage 3: Both cards fade away together (800ms)
                    secondChanceCard.classList.add('second-chance-fading');
                    duplicateCardElement.classList.add('duplicate-fading');
                    
                    // Remove cards after fade completes
                    setTimeout(() => {
                        this.removeSecondChanceCards(player, duplicateCard);
                        if (secondChanceCard.parentNode) {
                            secondChanceCard.parentNode.removeChild(secondChanceCard);
                        }
                        if (duplicateCardElement.parentNode) {
                            duplicateCardElement.parentNode.removeChild(duplicateCardElement);
                        }
                    }, 800);
                }, 400);
            }, 800);
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
            if (window.innerWidth <= 1024) {
                // Small delay to ensure desktop DOM is fully settled before mobile sync
                setTimeout(() => {
                    this.setupMobilePlayerAreas();
                }, 50);
            }
            
            // Continue game flow - check if round should end or move to next player
            this.checkForRoundEnd();
        }, 1200);
    }

    animateStay(player) {
        const playerArea = document.getElementById(player.id);
        const mobilePlayerArea = document.getElementById(`mobile-${player.id}`);
        
        // Apply animation to both desktop and mobile containers
        const containers = [playerArea, mobilePlayerArea].filter(c => c !== null);
        
        containers.forEach(container => {
            // Add stay animation class
            container.classList.add('stay-animation');
            
            // Create stayed indicator with points
            const stayedIndicator = document.createElement('div');
            stayedIndicator.className = 'stayed-indicator';
            stayedIndicator.innerHTML = `
                <span class="stayed-icon">✓</span>
                <span class="stayed-text">STAYED</span>
                <span class="stayed-points">${player.roundScore} Points Banked!</span>
            `;
            
            // Position indicator at the top of the player area
            stayedIndicator.style.cssText = `
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
            `;
            
            container.appendChild(stayedIndicator);
            
            // Add glow effect to all cards
            const cards = container.querySelectorAll('.card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('stay-glow');
                }, index * 50); // Stagger the glow effect
            });
            
            // Create points animation
            const pointsAnimation = document.createElement('div');
            pointsAnimation.className = 'points-banked-animation';
            pointsAnimation.textContent = `+${player.roundScore}`;
            pointsAnimation.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1001;
            `;
            container.appendChild(pointsAnimation);
            
            // Remove animations after delay
            setTimeout(() => {
                container.classList.remove('stay-animation');
                if (stayedIndicator.parentNode) {
                    stayedIndicator.remove();
                }
                if (pointsAnimation.parentNode) {
                    pointsAnimation.remove();
                }
                
                // Remove glow from cards
                cards.forEach(card => {
                    card.classList.remove('stay-glow');
                });
                
                // Add persistent stayed class for subtle styling
                container.classList.add('stayed');
            }, 2500);
        });
        
        // Add to log for mobile if window is mobile size
        if (window.innerWidth <= 1024) {
            this.setupMobilePlayerAreas();
        }
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
            setTimeout(() => this.nextTurn(), 800); // Speed optimized timing
        }
    }

    playerHit() {
        const player = this.players[0];
        if (player.status !== 'active') {
            return;
        }
        
        // Prevent multiple rapid clicks
        if (this.isProcessingPlayerAction) {
            return;
        }
        
        this.isProcessingPlayerAction = true;
        console.log('🔒 Processing flag SET (playerHit)');
        
        // Safety timeout to clear processing flag if it gets stuck (playerHit)
        setTimeout(() => {
            if (this.isProcessingPlayerAction) {
                console.warn('Hit processing flag stuck - force clearing and re-enabling buttons');
                this.isProcessingPlayerAction = false;
                this.enablePlayerActions();
            }
        }, 10000); // 10 second safety timeout
        
        const card = this.drawCard();
        this.displayCard(card, 'player');
        
        this.disablePlayerActions();
        
        // Wait for card animation to complete before handling card logic (standardized timing)
        setTimeout(() => {
            const result = this.handleCardDraw(player, card, false, false);
            
            // If busted, handleCardDraw already handled everything - exit early
            if (result.busted) {
                console.log('Player busted - resetting processing flag');
                this.isProcessingPlayerAction = false; // Reset flag
                console.log('🔓 Processing flag CLEARED');
                return; // Don't call updateDisplay() again or nextTurn()
            }
            
            // If turn ended due to action card (not bust), the action will handle nextTurn
            if (result.endTurn && !result.busted) {
                // Action card will handle the turn flow
                setTimeout(() => {
                    this.updateDisplay();
                    console.log('Action card processed - resetting processing flag');
                    this.isProcessingPlayerAction = false; // Reset flag
                console.log('🔓 Processing flag CLEARED');
                }, 1200); // Standardized timing
            } else {
                // Normal flow: move to next turn after animation
                setTimeout(() => {
                    this.updateDisplay();
                    this.nextTurn();
                    console.log('Normal turn completed - resetting processing flag');
                    this.isProcessingPlayerAction = false; // Reset flag
                console.log('🔓 Processing flag CLEARED');
                }, 1200); // Standardized timing
            }
        }, 1200); // Standardized card animation duration
    }

    playerStay() {
        const player = this.players[0];
        if (player.status !== 'active' || player.numberCards.length === 0) return;
        
        // Prevent multiple rapid clicks
        if (this.isProcessingPlayerAction) {
            return;
        }
        
        this.isProcessingPlayerAction = true;
        console.log('🔒 Processing flag SET (playerStay)');
        
        // Safety timeout to clear processing flag if it gets stuck (playerStay)
        setTimeout(() => {
            if (this.isProcessingPlayerAction) {
                console.warn('Stay processing flag stuck - force clearing and re-enabling buttons');
                this.isProcessingPlayerAction = false;
                this.enablePlayerActions();
            }
        }, 10000); // 10 second safety timeout
        
        player.status = 'stayed';
        this.calculateRoundScore(player);
        this.addToLog(`${player.name} stayed with ${player.roundScore} points!`);
        
        // Add visual animation for staying
        this.animateStay(player);
        
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
    
    calculateCurrentRoundScore(player) {
        // Real-time calculation for display purposes (includes modifier cards)
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
        
        return score;
    }

    nextTurn() {
        // Don't advance turn if still processing Flip 3
        if (this.isProcessingAnyFlip3()) {
            console.log('⏸️ Flip 3 in progress - delaying next turn');
            return;
        }
        
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
        
        // Note: Highlight timing moved to be just before AI action for better flow
        // Human players get immediate highlight, AI players get timed highlight
        
        // Handle the actual turn logic with proper timing
        setTimeout(() => {
            if (currentPlayer.isHuman) {
                // Human players get immediate highlight and turn indication
                this.highlightCurrentPlayer();
                this.showMessage(`Your turn!`);
                
                // Safety check: Clear any lingering processing flag when it's human's turn
                if (this.isProcessingPlayerAction) {
                    console.warn('Clearing stuck processing flag before human turn');
                    this.isProcessingPlayerAction = false;
                }
                // Enable actions for human player
                this.enablePlayerActions();
            } else {
                // AI turn - faster transitions for better flow
                setTimeout(() => {
                    // Show whose turn it is
                    this.highlightCurrentPlayer();
                    this.showMessage(`${currentPlayer.name}'s turn...`);
                    
                    // Reduced AI thinking time from 1000ms to 500ms
                    setTimeout(() => {
                        console.log(`🤖 Taking AI turn for ${currentPlayer.name}`);
                        this.takeAITurn(currentPlayer);
                    }, 500); // Reduced from 1000ms
                }, 300); // Reduced from 500ms
            }
        }, 400); // Reduced from 800ms - faster turn transitions
    }

    takeAITurn(player) {
        // AI should be more aggressive early and cautious later
        const uniqueCount = player.uniqueNumbers.size;
        const currentScore = player.roundScore;
        
        // PRIORITY: If bot has Second Chance, keep hitting until they lose it
        if (player.hasSecondChance) {
            this.addToLog(`${player.name} has Second Chance - playing aggressively!`);
            this.aiHit(player);
            return;
        }
        
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
            
            // Check if waiting for special action (Flip3/Freeze modal or animation)
            if (result.waitingForModal || result.waitingForAnimation) {
                // Special action card - let the modal/animation system handle continuation
                // Don't call nextTurn() here - the special action will handle it
                this.updateDisplay();
            } else if (result.endTurn && !result.busted) {
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
        
        // Add visual animation for staying
        this.animateStay(player);
        
        this.updateDisplay();
        
        // Move to next player immediately
        this.nextTurn();
    }

    endRound() {
        // Calculate final scores
        this.players.forEach(player => {
            if (player.status === 'busted') {
                player.roundScore = 0;
            } else if (player.status === 'frozen' && player.numberCards.length === 0) {
                // Player was frozen before getting any cards - ensure they stay at 0
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
        
        try {
            this.animateCardFlip(card, playerId);
        } catch (error) {
            console.error('Animation failed, adding card directly:', error);
            this.addCardToPlayerHand(card, playerId);
        }
    }

    animateCardFlip(card, playerId) {
        // Use center animation areas for better visual impact
        const isMobile = window.innerWidth <= 1024;
        const animationArea = isMobile 
            ? document.getElementById('mobile-center-card-animation-area')
            : document.getElementById('center-card-animation-area');
        
        // Fallback if animation area doesn't exist - add card directly
        if (!animationArea) {
            this.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Check if target container exists before starting animation
        const targetElement = this.getTargetCardContainer(playerId, card.type);
        if (!targetElement) {
            this.addCardToPlayerHand(card, playerId);
            return;
        }
        
        // Define reveal duration for simple flip
        const revealDuration = 600; // Quick simple flip
        
        // Show backdrop for focus (mobile only)
        let backdropTimeout = null;
        if (isMobile) {
            const backdrop = document.getElementById('animation-backdrop');
            if (backdrop) {
                backdrop.classList.add('show');
                
                // Only set auto-hide timeout for non-interactive cards
                // Interactive cards (Flip3/Freeze for humans) will manage their own backdrop
                const willBecomeInteractive = card.type === 'action' && 
                    (card.value === 'freeze' || card.value === 'flip3') && 
                    playerId === 'player';
                
                if (!willBecomeInteractive) {
                    // Hide backdrop after animation completes for normal cards
                    this.backdropAutoHideTimeout = setTimeout(() => {
                        backdrop.classList.remove('show');
                        this.backdropAutoHideTimeout = null;
                    }, revealDuration + 100); // Just after flip completes
                }
            }
        }
        
        // Create simple flip animation for both mobile and desktop
        const animatedCard = document.createElement('div');
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
        
        // Start simple flip animation
        animatedCard.classList.add('simple-flip');
        
        // After flip completes, handle the card
        setTimeout(() => {
            // Check if this is a special action card that should show modal instead
            // IMPORTANT: Only show interactive modal for human players (playerId === 'player')
            const isHumanPlayer = playerId === 'player';
            const shouldShowModal = card.type === 'action' && (card.value === 'freeze' || card.value === 'flip3') && isHumanPlayer;
            
            if (shouldShowModal) {
                // For special action cards from human player, transition to interactive drag & drop
                this.transitionToInteractiveCard(animatedCard, animationArea, card, playerId);
                return;
            }
            
            // For regular cards, slide from center to player hand
            this.slideCardToPlayerHand(animatedCard, animationArea, card, playerId);
        }, revealDuration); // Wait for flip to complete
    }

    slideCardToPlayerHand(animatedCard, animationArea, card, playerId) {
        const isMobile = window.innerWidth <= 1024;
        
        // Set mobile-specific card size BEFORE getting position
        if (isMobile) {
            animatedCard.style.width = '120px';
            animatedCard.style.height = '168px';
            animatedCard.style.fontSize = '2em';
        }
        
        // Get current card position AFTER size changes
        const animatedCardRect = animatedCard.getBoundingClientRect();
        const startX = animatedCardRect.left;
        const startY = animatedCardRect.top;
        
        // Get target element based on device type
        let targetElement;
        if (isMobile) {
            targetElement = this.getPlayerAreaElement(playerId);
        } else {
            targetElement = this.getTargetCardContainer(playerId, card.type);
        }
        
        if (!targetElement) {
            // Fallback: just add card directly if no target found
            this.addCardToPlayerHand(card, playerId);
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
            return;
        }
        
        // Get target position
        const targetRect = targetElement.getBoundingClientRect();
        let endX, endY;
        
        if (isMobile) {
            // Simplify mobile targeting - animate to center of player container
            endX = targetRect.left + (targetRect.width / 2) - (120 / 2);
            endY = targetRect.top + (targetRect.height / 2) - (168 / 2);
        } else {
            // Desktop positioning (center of cards container)
            endX = targetRect.left + (targetRect.width / 2) - (animatedCardRect.width / 2);
            endY = targetRect.top + (targetRect.height / 2) - (animatedCardRect.height / 2);
        }
        
        // Calculate slide distance
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Calculate scale based on device
        const scale = isMobile ? 0.5 : 0.8;
        
        // Apply slide animation with proper transform origin
        animatedCard.style.position = 'fixed';
        animatedCard.style.left = startX + 'px';
        animatedCard.style.top = startY + 'px';
        animatedCard.style.zIndex = '10000';
        animatedCard.style.transformOrigin = 'center center';
        animatedCard.style.transition = `transform ${isMobile ? '0.4s' : '0.6s'} ease-in-out`;
        animatedCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
        
        // After slide animation completes, add card to hand and clean up
        setTimeout(() => {
            this.addCardToPlayerHand(card, playerId);
            
            // Clear animation area
            if (animationArea && animationArea.parentNode) {
                animationArea.innerHTML = '';
            }
        }, isMobile ? 400 : 600);
    }

    transitionToInteractiveCard(animatedCard, animationArea, card, playerId) {
        // Clear any pending backdrop auto-hide timeout since we're taking control
        if (this.backdropAutoHideTimeout) {
            clearTimeout(this.backdropAutoHideTimeout);
            this.backdropAutoHideTimeout = null;
        }
        
        // Remove the reveal animation classes
        animatedCard.classList.remove('flip-reveal', 'mobile-reveal');
        
        // Add interactive classes for visual cues
        animatedCard.classList.add('interactive-card', 'drag-me');
        
        // IMPORTANT: Make only Flip3/Freeze cards small for drag/drop
        if (card.value === 'flip3' || card.value === 'freeze') {
            animatedCard.classList.add('drag-card-small');
            
            // Expand animation area for better touch interaction with small cards
            if (animationArea && window.innerWidth <= 1024) {
                animationArea.style.width = '100px';
                animationArea.style.height = '120px';
                animationArea.style.marginLeft = '-50px'; // Half of 100px
                animationArea.style.marginTop = '-60px';  // Half of 120px
            }
        }
        
        // CRITICAL: Enable pointer events on mobile animation area for touch interaction
        if (animationArea) {
            animationArea.classList.add('has-interactive-card');
        }
        
        // Show backdrop and instructions
        const backdrop = document.getElementById('animation-backdrop');
        if (backdrop) {
            backdrop.classList.add('show');
            backdrop.style.zIndex = '9998'; // Below the card but above everything else
        }
        
        // Add instructional overlay
        this.showDragInstructions(card);
        
        // Highlight valid drop targets
        this.highlightDropTargets();
        
        // Enable drag functionality
        this.enableCardDrag(animatedCard, card, playerId, animationArea);
    }

    showDragInstructions(card) {
        const instructions = document.createElement('div');
        instructions.id = 'drag-instructions';
        instructions.className = 'drag-instructions';
        
        const actionText = card.value === 'freeze' ? 'freeze them' : 'make them draw 3 cards';
        instructions.innerHTML = `
            <div class="instruction-content">
                <h3>Drag the ${card.display} card</h3>
                <p>Drop it on any player to ${actionText}</p>
                <div class="drag-arrow">⬇</div>
            </div>
        `;
        
        document.body.appendChild(instructions);
    }

    highlightDropTargets() {
        const isMobile = window.innerWidth <= 1024;
        
        // Get all player containers
        this.players.forEach(player => {
            const container = isMobile 
                ? document.getElementById(`mobile-${player.id}`)
                : document.getElementById(player.id);
            
            if (container) {
                container.classList.add('valid-drop-target');
            }
        });
    }

    enableCardDrag(animatedCard, card, playerId, animationArea) {
        // Make card draggable
        animatedCard.draggable = true;
        animatedCard.style.cursor = 'grab';
        
        // Add touch support for mobile
        let isDragging = false;
        let startX, startY;
        let currentX = 0, currentY = 0;
        
        // Desktop drag events
        animatedCard.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ card, playerId }));
            animatedCard.style.opacity = '0.7';
        });
        
        animatedCard.addEventListener('dragend', (e) => {
            animatedCard.style.opacity = '1';
        });
        
        // Enhanced mobile touch events with better finger tracking
        let currentDropTarget = null;
        let animationFrameId = null;
        
        animatedCard.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            
            // Get the card's current position relative to the viewport
            const rect = animatedCard.getBoundingClientRect();
            
            // Calculate offset from touch point to card position
            // This ensures the card doesn't jump when touched
            startX = touch.clientX - rect.left;
            startY = touch.clientY - rect.top;
            
            // Enable dragging positioning with improved setup
            animatedCard.classList.add('dragging');
            animatedCard.style.cursor = 'grabbing';
            animatedCard.style.position = 'fixed';
            animatedCard.style.left = rect.left + 'px';
            animatedCard.style.top = rect.top + 'px';
            animatedCard.style.zIndex = '15000';
            animatedCard.style.pointerEvents = 'none'; // Prevent touch conflicts
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            currentX = 0;
            currentY = 0;
            currentDropTarget = null;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        animatedCard.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            
            // Use requestAnimationFrame for smoother movement
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                // Position card maintaining the original touch offset
                const newLeft = touch.clientX - startX;
                const newTop = touch.clientY - startY;
                
                animatedCard.style.left = newLeft + 'px';
                animatedCard.style.top = newTop + 'px';
                animatedCard.style.transform = 'scale(1.3) rotate(-5deg)'; // Add slight rotation for visual feedback
                
                // Enhanced drop target detection with expanded hit areas
                const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                let newDropTarget = elementUnder?.closest('.valid-drop-target');
                
                // If no direct hit, search for nearby drop targets (mobile forgiveness)
                if (!newDropTarget && window.innerWidth <= 1024) {
                    const tolerance = 60; // Pixels of tolerance for mobile
                    const dropTargets = document.querySelectorAll('.valid-drop-target');
                    
                    let closestTarget = null;
                    let closestDistance = tolerance;
                    
                    dropTargets.forEach(target => {
                        const rect = target.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        const distance = Math.sqrt(
                            Math.pow(touch.clientX - centerX, 2) + 
                            Math.pow(touch.clientY - centerY, 2)
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestTarget = target;
                        }
                    });
                    
                    newDropTarget = closestTarget;
                }
                
                // Update drop target highlighting
                if (newDropTarget !== currentDropTarget) {
                    // Remove highlight from previous target
                    if (currentDropTarget) {
                        currentDropTarget.classList.remove('drag-hover');
                    }
                    
                    // Add highlight to new target
                    if (newDropTarget) {
                        newDropTarget.classList.add('drag-hover');
                        // Add subtle vibration when hovering over valid target
                        if (navigator.vibrate) {
                            navigator.vibrate(25);
                        }
                    }
                    
                    currentDropTarget = newDropTarget;
                }
            });
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        animatedCard.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            // Cancel any pending animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Find final drop target with enhanced detection
            const touch = e.changedTouches[0];
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            let dropTarget = elementUnder?.closest('.valid-drop-target');
            
            // Enhanced drop detection for mobile - try nearby targets if no direct hit
            if (!dropTarget && window.innerWidth <= 1024) {
                const tolerance = 80; // Larger tolerance on release for easier targeting
                const dropTargets = document.querySelectorAll('.valid-drop-target');
                
                let closestTarget = null;
                let closestDistance = tolerance;
                
                dropTargets.forEach(target => {
                    const rect = target.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    const distance = Math.sqrt(
                        Math.pow(touch.clientX - centerX, 2) + 
                        Math.pow(touch.clientY - centerY, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestTarget = target;
                    }
                });
                
                if (closestTarget) {
                    dropTarget = closestTarget;
                    // Visual feedback for auto-snapping
                    if (navigator.vibrate) {
                        navigator.vibrate([30, 30, 30]); // Triple tap to indicate snap
                    }
                }
            }
            
            // Clear any remaining drag-hover states
            document.querySelectorAll('.drag-hover').forEach(el => {
                el.classList.remove('drag-hover');
            });
            
            if (dropTarget) {
                // Success vibration
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 100]);
                }
                this.handleCardDrop(dropTarget, card, playerId);
            } else {
                // Error vibration
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
                
                // Snap back to center with animation
                animatedCard.style.transition = 'all 0.3s ease-out';
                animatedCard.classList.remove('dragging');
                animatedCard.style.left = '';
                animatedCard.style.top = '';
                animatedCard.style.transform = 'scale(1)';
                animatedCard.style.position = '';
                animatedCard.style.zIndex = '';
                animatedCard.style.pointerEvents = '';
                
                // Remove transition after animation
                setTimeout(() => {
                    animatedCard.style.transition = '';
                }, 300);
                
                // Clean up drag interface if no valid drop
                this.cleanupDragInterface();
            }
            
            animatedCard.style.cursor = 'grab';
            currentDropTarget = null;
        });
        
        // Setup drop zones
        this.setupDropZones(card, playerId, animationArea);
    }

    setupDropZones(card, playerId, animationArea) {
        const isMobile = window.innerWidth <= 1024;
        
        this.players.forEach(targetPlayer => {
            const container = isMobile 
                ? document.getElementById(`mobile-${targetPlayer.id}`)
                : document.getElementById(targetPlayer.id);
            
            if (!container) return;
            
            // Desktop drop events
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('drag-hover');
            });
            
            container.addEventListener('dragleave', (e) => {
                container.classList.remove('drag-hover');
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-hover');
                this.handleCardDrop(container, card, playerId);
            });
        });
    }

    handleCardDrop(dropTarget, card, playerId) {
        console.log('🎯 Human dropped card:', card.value, 'on target:', dropTarget.id);
        
        // Find which player was targeted
        const targetPlayerId = dropTarget.id.replace('mobile-', '');
        const targetPlayer = this.players.find(p => p.id === targetPlayerId);
        
        if (!targetPlayer) return;
        
        console.log('  Target player:', targetPlayer.name);
        console.log('  Is initial dealing:', this.isInitialDealing);
        
        // Clean up drag interface
        this.cleanupDragInterface();
        
        // Execute the card effect (human players use direct effect execution)
        const humanPlayer = this.players.find(p => p.isHuman);
        
        // Check if this is a nested Flip 3 during another Flip 3
        if (card.value === 'flip3' && this.isProcessingFlip3) {
            // Store the target for later execution
            if (this.pendingFlip3Queue.length > 0) {
                this.pendingFlip3Queue[this.pendingFlip3Queue.length - 1].target = targetPlayer;
            }
            this.addToLog(`Flip 3 will be executed on ${targetPlayer.name} after current Flip 3 completes!`);
            return; // Don't execute now, just store target
        }
        
        // Store whether we need to continue initial dealing after this action
        const needsInitialDealContinuation = this.isInitialDealing && this.pendingInitialDealContinuation;
        
        if (card.value === 'freeze') {
            this.executeSpecialActionEffect(card, humanPlayer, targetPlayer);
            // Freeze is instant, so check for continuation immediately
            if (needsInitialDealContinuation) {
                console.log('🎴 Triggering initial deal continuation after freeze');
                // Use continueAfterSpecialAction which handles the continuation
                setTimeout(() => this.continueAfterSpecialAction(), 100);
            }
        } else if (card.value === 'flip3') {
            // For Flip 3, we need to ensure continuation happens after it completes
            if (needsInitialDealContinuation) {
                console.log('🎴 Flip 3 during initial deal - continuation will be handled after completion');
            }
            this.executeSpecialActionEffect(card, humanPlayer, targetPlayer);
        }
    }

    cleanupDragInterface() {
        // Remove backdrop
        const backdrop = document.getElementById('animation-backdrop');
        if (backdrop) {
            backdrop.classList.remove('show');
        }
        
        // Remove instructions
        const instructions = document.getElementById('drag-instructions');
        if (instructions) {
            instructions.remove();
        }
        
        // Remove drop target highlights
        document.querySelectorAll('.valid-drop-target').forEach(target => {
            target.classList.remove('valid-drop-target', 'drag-hover');
        });
        
        // Clear animation area and disable pointer events
        const animationArea = document.getElementById('mobile-center-card-animation-area') 
            || document.getElementById('center-card-animation-area');
        if (animationArea) {
            animationArea.innerHTML = '';
            animationArea.classList.remove('has-interactive-card'); // Restore pointer-events: none
            
            // Reset dynamic sizing for mobile
            if (window.innerWidth <= 1024) {
                animationArea.style.width = '';
                animationArea.style.height = '';
                animationArea.style.marginLeft = '';
                animationArea.style.marginTop = '';
            }
        }
    }

    animateAICardDrag(card, fromPlayer, toPlayer, callback) {
        const isMobile = window.innerWidth <= 1024;
        
        // Show action message
        this.addToLog(`${fromPlayer.name} is using ${card.display} on ${toPlayer.name}!`);
        
        // Get source and target containers
        const sourceContainer = isMobile 
            ? document.getElementById(`mobile-${fromPlayer.id}`)
            : document.getElementById(fromPlayer.id);
        
        const targetContainer = isMobile 
            ? document.getElementById(`mobile-${toPlayer.id}`)
            : document.getElementById(toPlayer.id);
        
        if (!sourceContainer || !targetContainer) {
            // Fallback to immediate execution
            callback();
            return;
        }
        
        // Create ghost card element
        const ghostCard = this.createCardElement(card);
        ghostCard.classList.add('ai-drag-ghost');
        
        // Get positions
        const sourceRect = sourceContainer.getBoundingClientRect();
        const targetRect = targetContainer.getBoundingClientRect();
        
        // Position ghost card at source
        ghostCard.style.position = 'fixed';
        ghostCard.style.left = sourceRect.left + (sourceRect.width / 2) + 'px';
        ghostCard.style.top = sourceRect.top + (sourceRect.height / 2) + 'px';
        ghostCard.style.zIndex = '10000';
        ghostCard.style.pointerEvents = 'none';
        ghostCard.style.transform = 'translate(-50%, -50%) scale(1.5)';
        
        // Add to DOM
        document.body.appendChild(ghostCard);
        
        // Highlight target container
        targetContainer.classList.add('ai-drag-target');
        
        // Show drag trajectory
        this.showDragTrajectory(sourceRect, targetRect);
        
        // Animate card movement
        const targetX = targetRect.left + (targetRect.width / 2);
        const targetY = targetRect.top + (targetRect.height / 2);
        
        // Create smooth animation
        ghostCard.style.transition = 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Small delay to ensure positioning is set
        setTimeout(() => {
            ghostCard.style.left = targetX + 'px';
            ghostCard.style.top = targetY + 'px';
            ghostCard.style.transform = 'translate(-50%, -50%) scale(2) rotate(360deg)';
        }, 50);
        
        // Complete animation
        setTimeout(() => {
            // Add drop effect
            this.showDropEffect(targetContainer);
            
            // Clean up
            ghostCard.remove();
            targetContainer.classList.remove('ai-drag-target');
            this.clearDragTrajectory();
            
            // Execute the actual card effect
            console.log(`🎯 AI drag animation complete for ${card.display} - executing callback`);
            callback();
        }, 1300);
    }

    showDragTrajectory(sourceRect, targetRect) {
        const trajectory = document.createElement('div');
        trajectory.id = 'ai-drag-trajectory';
        trajectory.className = 'ai-drag-trajectory';
        
        // Calculate midpoint for arc
        const midX = (sourceRect.left + targetRect.left) / 2;
        const midY = Math.min(sourceRect.top, targetRect.top) - 50; // Arc upward
        
        // Create SVG path for smooth curve
        trajectory.innerHTML = `
            <svg style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;">
                <path d="M ${sourceRect.left + sourceRect.width/2} ${sourceRect.top + sourceRect.height/2} 
                         Q ${midX} ${midY} 
                         ${targetRect.left + targetRect.width/2} ${targetRect.top + targetRect.height/2}" 
                      stroke="#ffd700" 
                      stroke-width="3" 
                      fill="none" 
                      stroke-dasharray="10,5" 
                      opacity="0.8">
                    <animate attributeName="stroke-dashoffset" 
                             values="0;-30" 
                             dur="0.5s" 
                             repeatCount="indefinite" />
                </path>
            </svg>
        `;
        
        document.body.appendChild(trajectory);
    }

    clearDragTrajectory() {
        const trajectory = document.getElementById('ai-drag-trajectory');
        if (trajectory) {
            trajectory.remove();
        }
    }

    showDropEffect(targetContainer) {
        // Create particle burst effect
        const particles = document.createElement('div');
        particles.className = 'drop-particles';
        particles.style.position = 'absolute';
        particles.style.top = '50%';
        particles.style.left = '50%';
        particles.style.transform = 'translate(-50%, -50%)';
        particles.style.pointerEvents = 'none';
        particles.style.zIndex = '100';
        
        // Add multiple particle elements
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.backgroundColor = '#ffd700';
            particle.style.borderRadius = '50%';
            
            // Random direction and distance
            const angle = (i * 45) * Math.PI / 180;
            const distance = 30 + Math.random() * 20;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            particle.style.transform = 'translate(-2px, -2px)';
            particle.style.transition = 'all 0.6s ease-out';
            particle.style.opacity = '1';
            
            particles.appendChild(particle);
            
            // Animate particle
            setTimeout(() => {
                particle.style.transform = `translate(${endX}px, ${endY}px)`;
                particle.style.opacity = '0';
            }, 50);
        }
        
        targetContainer.appendChild(particles);
        
        // Clean up particles
        setTimeout(() => {
            particles.remove();
        }, 700);
    }

    addFreezeVisualEffects(targetPlayer) {
        // Enhanced freeze effects (builds on existing system)
        const isMobile = window.innerWidth <= 1024;
        
        // Get containers for both desktop and mobile
        const desktopContainer = document.getElementById(targetPlayer.id);
        const mobileContainer = document.getElementById(`mobile-${targetPlayer.id}`);
        
        // Always add effects to both containers to ensure visibility
        const containers = [desktopContainer, mobileContainer].filter(c => c !== null);
        
        if (containers.length === 0) {
            console.warn(`❌ No containers found for player ${targetPlayer.name}`);
            return;
        }
        
        containers.forEach(container => {
            // Safety check: Remove any existing freeze effects first to prevent duplication
            this.removeFreezeVisualEffectsFromContainer(container);
            
            // Add enhanced frozen class for additional effects
            container.classList.add('enhanced-frozen');
            container.style.position = 'relative';
            
            // Create dramatic freeze overlay
            const freezeOverlay = document.createElement('div');
            freezeOverlay.className = 'freeze-overlay';
            
            // Add ice crystals background
            const iceCrystals = document.createElement('div');
            iceCrystals.className = 'ice-crystals';
            freezeOverlay.appendChild(iceCrystals);
            
            // Add FROZEN text
            const frozenText = document.createElement('div');
            frozenText.className = 'freeze-overlay-text';
            frozenText.innerHTML = '❄️ FROZEN ❄️';
            freezeOverlay.appendChild(frozenText);
            
            // Add ice shards border
            const iceShards = document.createElement('div');
            iceShards.className = 'freeze-ice-shards';
            container.appendChild(iceShards);
            
            // Add floating ice particles
            const particlesContainer = document.createElement('div');
            particlesContainer.className = 'freeze-particles';
            
            // Create multiple floating ice particles
            const particles = ['❄', '❅', '❆', '✦', '✧', '◆'];
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'freeze-particle';
                particle.textContent = particles[Math.floor(Math.random() * particles.length)];
                particle.style.left = Math.random() * 80 + 10 + '%';
                particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
                particle.style.animationDelay = Math.random() * 2 + 's';
                particlesContainer.appendChild(particle);
            }
            container.appendChild(particlesContainer);
            
            // Add overlay to container
            container.appendChild(freezeOverlay);
            
            console.log(`✅ Added dramatic freeze overlay to container:`, container.id || container.className);
        });
        
        // Create ice particles effect on primary container
        const primaryContainer = isMobile && mobileContainer ? mobileContainer : desktopContainer;
        if (primaryContainer) {
            this.createIceParticles(primaryContainer);
        }
    }

    createIceParticles(container) {
        const iceContainer = document.createElement('div');
        iceContainer.className = 'ice-particles';
        iceContainer.style.position = 'absolute';
        iceContainer.style.top = '0';
        iceContainer.style.left = '0';
        iceContainer.style.width = '100%';
        iceContainer.style.height = '100%';
        iceContainer.style.pointerEvents = 'none';
        iceContainer.style.zIndex = '10';
        
        // Create multiple ice crystals
        for (let i = 0; i < 6; i++) {
            const crystal = document.createElement('div');
            crystal.textContent = '❄';
            crystal.style.position = 'absolute';
            crystal.style.color = '#60a5fa';
            crystal.style.fontSize = '12px';
            crystal.style.left = Math.random() * 80 + 10 + '%';
            crystal.style.top = Math.random() * 80 + 10 + '%';
            crystal.style.animation = `iceFloat 3s infinite ${Math.random() * 2}s`;
            
            iceContainer.appendChild(crystal);
        }
        
        container.appendChild(iceContainer);
    }
    
    removeFreezeVisualEffectsFromContainer(container) {
        // Safety method to clean up freeze visual effects from a specific container
        if (!container) return;
        
        // Remove frozen and stayed classes
        container.classList.remove('enhanced-frozen', 'frozen-effect', 'frozen', 'busted', 'stayed', 'stay-animation');
        
        // Remove freeze overlay (new dramatic effect)
        const freezeOverlay = container.querySelector('.freeze-overlay');
        if (freezeOverlay) {
            freezeOverlay.remove();
        }
        
        // Remove ice shards border
        const iceShards = container.querySelector('.freeze-ice-shards');
        if (iceShards) {
            iceShards.remove();
        }
        
        // Remove floating particles
        const particles = container.querySelector('.freeze-particles');
        if (particles) {
            particles.remove();
        }
        
        // Remove existing freeze indicators (legacy)
        const existingIndicator = container.querySelector('.frozen-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Remove ice particles
        const iceParticles = container.querySelector('.ice-particles');
        if (iceParticles) {
            iceParticles.remove();
        }
        
        // Remove freeze status from player status elements
        const statusElement = container.querySelector('.player-status');
        if (statusElement) {
            statusElement.classList.remove('frozen-status');
        }
    }
    
    clearAllFreezeEffects(player) {
        // Clear freeze effects from desktop container
        const desktopContainer = document.getElementById(player.id);
        if (desktopContainer) {
            this.removeFreezeVisualEffectsFromContainer(desktopContainer);
        }
        
        // Clear freeze effects from mobile container
        const mobileContainer = document.getElementById(`mobile-${player.id}`);
        if (mobileContainer) {
            this.removeFreezeVisualEffectsFromContainer(mobileContainer);
        }
        
        // Also clear the frozen flag
        player.isFrozen = false;
    }

    getTargetCardContainer(playerId, cardType) {
        // Always return the unified card container regardless of card type
        // Handle both numeric (0,1,2,3) and string ('player', 'opponent1') player IDs
        if (playerId === 0 || playerId === 'player') {
            return document.getElementById('player-cards');
        } else {
            // Convert numeric player IDs to opponent string format
            const opponentId = typeof playerId === 'number' ? `opponent${playerId}` : playerId;
            return document.getElementById(`${opponentId}-cards`);
        }
    }

    getPlayerAreaElement(playerId) {
        // Get entire player area for better slide animation targeting
        // Handle both numeric (0,1,2,3) and string ('player', 'opponent1') player IDs
        const isMobile = window.innerWidth <= 1024;
        
        
        if (playerId === 0 || playerId === 'player') {
            const elementId = isMobile ? 'mobile-player' : 'player';
            const element = document.getElementById(elementId);
            return element;
        } else {
            // Convert numeric player IDs to opponent string format
            const opponentId = typeof playerId === 'number' ? `opponent${playerId}` : playerId;
            const elementId = isMobile ? `mobile-${opponentId}` : opponentId;
            const element = document.getElementById(elementId);
            return element;
        }
    }

    addCardToPlayerHand(card, playerId) {
        // With unified container, we need to re-render the entire hand in sorted order
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            const cardContainer = this.getTargetCardContainer(playerId, card.type);
            if (cardContainer) {
                this.renderPlayerCards(player, cardContainer);
            } else {
                console.error(`No card container found for ${playerId}`);
            }
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
            // Using custom image for card
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
        console.log(`enablePlayerActions: status=${player.status}, processing=${this.isProcessingPlayerAction}, currentPlayer=${this.currentPlayerIndex}, gameActive=${this.gameActive}`);
        
        // Validate turn state before enabling buttons
        const isHumanTurn = this.gameActive && this.currentPlayerIndex === 0;
        const canEnable = player.status === 'active' && !this.isProcessingPlayerAction && isHumanTurn;
        
        if (canEnable) {
            console.log('✓ Enabling buttons - all conditions met');
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
        } else {
            console.log(`✗ NOT enabling buttons - canEnable=${canEnable}, gameActive=${this.gameActive}, isHumanTurn=${isHumanTurn}`);
        }
    }

    disablePlayerActions() {
        console.log('disablePlayerActions: Disabling all player buttons');
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
        
        // Note: Mobile button states are now handled exclusively by enablePlayerActions() and disablePlayerActions()
        // to avoid race conditions and duplicate state management
        
        // Update each player's display
        this.players.forEach(player => {
            this.updatePlayerDisplay(player);
        });
        
        // Sync mobile layout if on mobile
        if (window.innerWidth <= 1024) {
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
        
        // Update player name (remove score from name)
        const nameElement = container.querySelector('h3');
        if (nameElement) {
            nameElement.textContent = player.name;
        }
        
        // Update scores in new header structure
        const roundScoreElement = container.querySelector('.player-header .round-value');
        if (roundScoreElement) {
            // Use real-time calculated score that includes modifier cards
            const currentRoundScore = this.calculateCurrentRoundScore(player);
            roundScoreElement.textContent = currentRoundScore;
        }
        
        const totalScoreElement = container.querySelector('.player-header .score-value');
        if (totalScoreElement) {
            totalScoreElement.textContent = player.totalScore;
        }
        
        // Update legacy score elements (fallback for old structure)
        const scoreElements = container.querySelectorAll('.player-stats .score-value');
        if (scoreElements[0]) scoreElements[0].textContent = player.totalScore;
        
        const roundElements = container.querySelectorAll('.player-stats .round-value');
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
        
        // Get unified card container
        const cardContainer = isMainPlayer 
            ? document.getElementById('player-cards')
            : container.querySelector('.player-cards');
            
        // Render all cards in sorted order using unified container
        if (cardContainer) {
            this.renderPlayerCards(player, cardContainer);
        }

        // Show Flip 7 indicator
        if (isMainPlayer && player.uniqueNumbers.size === 7) {
            const flip7Indicator = document.getElementById('flip7-indicator');
            if (flip7Indicator) flip7Indicator.style.display = 'inline';
        } else if (isMainPlayer) {
            const flip7Indicator = document.getElementById('flip7-indicator');
            if (flip7Indicator) flip7Indicator.style.display = 'none';
        }
    }

    renderPlayerCards(player, container) {
        // Clear container
        container.innerHTML = '';
        
        // Collect all cards
        const allCards = [];
        
        // Add number cards (sorted numerically)
        const numberCards = player.status === 'busted' 
            ? [...player.numberCards] // Keep original order for busted players to show duplicates together
            : [...player.numberCards].sort((a, b) => a.value - b.value);
        allCards.push(...numberCards);
        
        // Add modifier cards (sorted by value: +2, +4, +6, +8, +10, x2)
        const sortedModifiers = [...player.modifierCards].sort((a, b) => {
            const order = { '+2': 1, '+4': 2, '+6': 3, '+8': 4, '+10': 5, 'x2': 6 };
            return (order[a.value] || 999) - (order[b.value] || 999);
        });
        allCards.push(...sortedModifiers);
        
        // Add Second Chance at the end
        if (player.hasSecondChance) {
            allCards.push({
                type: 'action',
                value: 'second_chance',
                display: 'Second Chance'
            });
        }
        
        // Render all cards
        allCards.forEach((card, index) => {
            const cardElement = this.createCardElement(card);
            cardElement.dataset.cardValue = card.value;
            cardElement.dataset.cardType = card.type;
            
            // Add special styling for duplicate cards in busted hands
            if (player.status === 'busted' && card.type === 'number') {
                const duplicateCount = player.numberCards.filter(c => c.value === card.value).length;
                if (duplicateCount > 1) {
                    cardElement.classList.add('duplicate-card');
                }
            }
            
            container.appendChild(cardElement);
        });
        
        // Update dynamic card sizing class - OPTIMIZED for maximum card sizes
        const cardCount = allCards.length;
        let mobileSizeClass;
        if (cardCount <= 12) {
            // Use specific size classes for 1-12 cards
            mobileSizeClass = `cards-${cardCount}`;
        } else {
            // For 13+ cards, use the smallest size class (cards-12)
            mobileSizeClass = 'cards-12';
        }
        const desktopSizeClass = `desktop-cards-${Math.min(cardCount, 7)}`;
        container.className = `player-cards ${mobileSizeClass} ${desktopSizeClass}`.trim();
        
        console.log(`Card sizing: ${cardCount} cards -> mobile: ${mobileSizeClass}, desktop: ${desktopSizeClass}`);
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
        // Processing queued action - these should now go through the modal system
        // This function is kept for any legacy queued actions during Flip3 sequences
        if (actionData.type === 'flip3' || actionData.type === 'freeze') {
            // Create a card object and trigger the modal system
            const card = { 
                type: 'action', 
                value: actionData.type, 
                display: actionData.type === 'flip3' ? 'Flip Three' : 'Freeze' 
            };
            this.executeSpecialAction(card, actionData.owner, actionData.target);
            if (onComplete) setTimeout(onComplete, 500);
        } else {
            if (onComplete) onComplete();
        }
    }
    
    determineAITarget(player, card) {
        // Reusable AI targeting logic
        let targetPlayer = null;
        
        if (card.value === 'freeze') {
            // Target the point leader (excluding self)
            const maxScore = Math.max(...this.players.filter(p => 
                p.status === 'active' && p.id !== player.id
            ).map(p => p.roundScore));
            const pointLeaders = this.players.filter(p => 
                p.status === 'active' && p.id !== player.id && p.roundScore === maxScore
            );
            
            if (pointLeaders.length > 0) {
                targetPlayer = pointLeaders[Math.floor(Math.random() * pointLeaders.length)];
            } else {
                // No other active players, target self
                targetPlayer = player;
            }
        } else if (card.value === 'flip3') {
            // Bot AI for Flip3: Target self if < 3 cards, otherwise random other player
            const botCardCount = player.numberCards.length;
            if (botCardCount < 3) {
                targetPlayer = player; // Target self
            } else {
                // Target random other active player
                const otherActivePlayers = this.players.filter(p => 
                    p.status === 'active' && p.id !== player.id
                );
                if (otherActivePlayers.length > 0) {
                    targetPlayer = otherActivePlayers[Math.floor(Math.random() * otherActivePlayers.length)];
                } else {
                    targetPlayer = player; // Fallback to self
                }
            }
        }
        
        return targetPlayer;
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
        
        // Add highlight to NEXT player instead of current player
        if (this.gameActive && this.currentPlayerIndex >= 0) {
            // Find next active player
            let nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            
            // Skip all inactive players (stayed, busted, frozen) to find the actual next active player
            let attempts = 0;
            while (attempts < this.players.length) {
                const nextPlayer = this.players[nextPlayerIndex];
                if (nextPlayer.status === 'active') {
                    break;
                }
                nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
                attempts++;
            }
            
            // Highlight the next active player
            const nextPlayer = this.players[nextPlayerIndex];
            const container = document.getElementById(nextPlayer.id);
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
            // Showing name popup
            namePopup.style.display = 'flex';
            namePopup.style.position = 'fixed';
            namePopup.style.top = '0';
            namePopup.style.left = '0';
            namePopup.style.width = '100vw';
            namePopup.style.height = '100vh';
            namePopup.style.zIndex = '99999';
            namePopup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            
            // Popup styles configured
            
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
                    // Retry successful - showing name popup
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
        // Starting Flip 7 celebration
        
        // Show celebration overlay
        const celebrationEl = document.getElementById('flip7-celebration');
        celebrationEl.style.display = 'block';
        
        // Stage 1: Card wave animation (2s)
        this.animateCardWave(player);
        
        setTimeout(() => {
            // Stage 2: Logo drops and spins (2s)
            this.showFlip7Logo();
            
            setTimeout(() => {
                // Stage 3: Fast spinning top effect (2s)
                this.spinLogoFast();
                
                setTimeout(() => {
                    // Stage 4: Wobble and finale with glitter (2.5s)
                    this.wobbleAndExplodeLogo();
                    
                    setTimeout(() => {
                        // Stage 5: Clean up and end round (6.5s total)
                        this.cleanupFlip7Celebration();
                        this.endRound();
                    }, 2500);
                }, 2000);
            }, 2000);
        }, 2000);
    }
    
    animateCardWave(player) {
        const cardContainer = this.getTargetCardContainer(player.id, 'number');
        const numberCards = cardContainer ? cardContainer.querySelectorAll('.card[data-card-type="number"]') : [];
        
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
            if (cardContainer) {
                cardContainer.style.opacity = '0.3';
            }
        }, 200);
    }
    
    showFlip7Logo() {
        const logo = document.getElementById('flip7-celebration-logo');
        logo.classList.add('drop-spin');
    }
    
    spinLogoFast() {
        const logo = document.getElementById('flip7-celebration-logo');
        logo.classList.remove('drop-spin');
        logo.classList.add('spin-fast');
    }
    
    wobbleAndExplodeLogo() {
        const logo = document.getElementById('flip7-celebration-logo');
        logo.classList.remove('spin-fast');
        logo.classList.add('wobble-spin');
        
        // Add glitter explosion during wobble
        this.explodeGlitter();
        
        setTimeout(() => {
            logo.classList.remove('wobble-spin');
            logo.classList.add('finale');
        }, 1500);
    }
    
    explodeGlitter() {
        const glitterContainer = document.getElementById('glitter-explosion');
        const isMobile = window.innerWidth <= 1024;
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
        
        // Reset logo classes
        const logo = document.getElementById('flip7-celebration-logo');
        logo.classList.remove('drop-spin', 'spin-fast', 'wobble-spin', 'finale');
        
        // Clear any remaining particles
        const glitterContainer = document.getElementById('glitter-explosion');
        glitterContainer.innerHTML = '';
        
        // Restore original cards opacity
        const cardContainer = this.getTargetCardContainer('player', 'number');
        if (cardContainer) {
            cardContainer.style.opacity = '1';
        }
        
        // Flip 7 celebration complete
    }
    
    // ==================== FLIP 3 PROGRESS INDICATOR METHODS ====================
    
    showFlip3SequenceIndicator(cardOwner, targetPlayer, currentCard) {
        console.log(`🔄 Showing Flip3 indicator: ${cardOwner.name} → ${targetPlayer.name}`);
        
        const indicator = document.getElementById('flip3-progress-indicator');
        const targetName = document.getElementById('flip3-target-name');
        const currentCounter = document.getElementById('flip3-current');
        const statusDiv = document.getElementById('flip3-status');
        
        if (!indicator || !targetName || !currentCounter) {
            console.warn('Flip3 indicator elements not found');
            return;
        }
        
        // Set target player name
        targetName.textContent = targetPlayer.name;
        
        // Reset all dots
        const dots = indicator.querySelectorAll('.flip3-dot');
        dots.forEach(dot => {
            dot.classList.remove('filled', 'active');
        });
        
        // Reset card slots to show card backs
        for (let i = 1; i <= 3; i++) {
            const slot = document.getElementById(`flip3-card-${i}`);
            if (slot) {
                slot.innerHTML = '<div class="card back"></div>';
            }
        }
        
        // Clear status
        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.className = 'flip3-status';
        }
        
        // Set starting state (card 1)
        currentCounter.textContent = '1';
        if (dots[0]) dots[0].classList.add('active');
        
        // Store target player for later use
        this.flip3TargetPlayer = targetPlayer;
        this.flip3DrawnCards = [];
        
        // Show the backdrop and indicator
        const backdrop = document.getElementById('flip3-backdrop');
        if (backdrop) backdrop.style.display = 'block';
        indicator.style.display = 'block';
    }
    
    updateFlip3Progress(currentCard) {
        console.log(`🔄 Updating Flip3 progress: card ${currentCard}`);
        
        const indicator = document.getElementById('flip3-progress-indicator');
        const currentCounter = document.getElementById('flip3-current');
        
        if (!indicator || !currentCounter) {
            console.warn('Flip3 indicator elements not found for update');
            return;
        }
        
        const dots = indicator.querySelectorAll('.flip3-dot');
        
        // Update counter
        currentCounter.textContent = currentCard.toString();
        
        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index < currentCard) {
                dot.classList.add('filled');
            }
        });
        
        // Set active dot (next card to be drawn)
        if (currentCard < 3 && dots[currentCard]) {
            dots[currentCard].classList.add('active');
        }
        
        // Special handling for completion
        if (currentCard >= 3) {
            // All cards drawn - brief "COMPLETE!" message
            setTimeout(() => {
                const title = indicator.querySelector('.flip3-title');
                if (title) {
                    const originalText = title.textContent;
                    title.textContent = 'FLIP 3 COMPLETE!';
                    title.style.color = '#4ade80'; // Green
                    
                    setTimeout(() => {
                        title.textContent = originalText;
                        title.style.color = '#ffd700'; // Back to gold
                    }, 1000);
                }
            }, 500);
        }
    }
    
    hideFlip3SequenceIndicator() {
        console.log('🔄 Hiding Flip3 indicator');
        
        const indicator = document.getElementById('flip3-progress-indicator');
        if (!indicator) {
            console.warn('Flip3 indicator not found for hiding');
            return;
        }
        
        // Fade out animation
        indicator.style.animation = 'flip3Appear 0.3s ease-in reverse';
        
        setTimeout(() => {
            // Hide backdrop and indicator
            const backdrop = document.getElementById('flip3-backdrop');
            if (backdrop) backdrop.style.display = 'none';
            indicator.style.display = 'none';
            indicator.style.animation = ''; // Reset animation
            
            // State clearing is now handled centrally in clearFlip3State()
        }, 300);
    }
    
    previewFlip3Card(card, slotNumber) {
        console.log(`🎴 Previewing Flip3 card ${slotNumber}: ${card.display}`);
        
        const slot = document.getElementById(`flip3-card-${slotNumber}`);
        if (!slot) return;
        
        const cardDiv = slot.querySelector('.card');
        if (!cardDiv) return;
        
        // Add flipping animation class
        cardDiv.classList.add('flipping');
        
        // After flip animation, show the card face using proper card creation
        setTimeout(() => {
            // Create a properly formatted card element
            const properCard = this.createCardElement(card);
            
            // Copy the proper card styling to the existing div
            cardDiv.className = properCard.className;
            cardDiv.innerHTML = properCard.innerHTML;
            
            // Copy background image if it exists (for custom images)
            if (properCard.style.backgroundImage) {
                cardDiv.style.backgroundImage = properCard.style.backgroundImage;
                cardDiv.style.backgroundSize = 'cover';
                cardDiv.style.backgroundPosition = 'center';
            }
            
            // Check if this is a duplicate
            const isDuplicate = this.flip3TargetPlayer && 
                               card.type === 'number' && 
                               this.flip3TargetPlayer.uniqueNumbers.has(card.value);
            
            if (isDuplicate) {
                cardDiv.classList.add('duplicate');
            } else {
                cardDiv.classList.add('success');
            }
            
            console.log(`✅ Card ${slotNumber} preview updated with proper styling:`, cardDiv.className);
        }, 300);
        
        // Return the duplicate status (calculate it here since we need it synchronously)
        const isDuplicate = this.flip3TargetPlayer && 
                           card.type === 'number' && 
                           this.flip3TargetPlayer.uniqueNumbers.has(card.value);
        
        return isDuplicate;
    }
    
    animateFlip3Success() {
        console.log('✅ Animating Flip3 success - adding cards to hand');
        
        // Get all card slots
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const slot = document.getElementById(`flip3-card-${i}`);
            if (slot) {
                const cardDiv = slot.querySelector('.card');
                if (cardDiv) {
                    slots.push(cardDiv);
                }
            }
        }
        
        // Animate cards flying to player's hand
        slots.forEach((cardDiv, index) => {
            setTimeout(() => {
                cardDiv.style.animation = 'flip3CardFlyToHand 0.5s ease-out forwards';
            }, index * 100);
        });
        
        // Update status
        const statusDiv = document.getElementById('flip3-status');
        if (statusDiv) {
            statusDiv.textContent = 'All cards added successfully!';
            statusDiv.className = 'flip3-status success';
        }
        
        // Hide indicator after animation
        setTimeout(() => {
            this.hideFlip3SequenceIndicator();
        }, 600);
    }
    
    handleFlip3Bust(duplicateCard, cardNumber) {
        console.log(`❌ Flip3 bust on card ${cardNumber} - duplicate ${duplicateCard.value}`);
        
        // Update status
        const statusDiv = document.getElementById('flip3-status');
        if (statusDiv) {
            statusDiv.textContent = `Duplicate ${duplicateCard.value} - BUST!`;
            statusDiv.className = 'flip3-status error';
        }
        
        // Don't hide indicator here - let the calling function control when to hide it
    }

    
}

// Enhanced game initialization with multiple triggers
console.log('Game script loaded - setting up initialization...');

let gameInstance = null;
let initAttempted = false;

function initializeGame(trigger) {
    if (initAttempted) {
        console.log(`Game initialization already attempted, skipping ${trigger}`);
        return;
    }
    
    console.log(`🚀 Initializing game from: ${trigger}`);
    initAttempted = true;
    
    try {
        gameInstance = new Flip7Game();
        console.log('✓ Game instance created successfully');
    } catch (error) {
        console.error('✗ Error creating game instance:', error);
        // Reset flag to allow retry
        initAttempted = false;
    }
}

// Primary trigger: DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeGame('DOMContentLoaded');
});

// Fallback trigger: window.onload (in case DOMContentLoaded already fired)

// ==================== INITIALIZATION ====================

window.addEventListener('load', () => {
    setTimeout(() => {
        initializeGame('window-load-fallback');
    }, 100);
});

// Ultimate fallback: direct timeout
setTimeout(() => {
    initializeGame('timeout-fallback');
}, 1000);