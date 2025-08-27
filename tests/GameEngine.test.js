// GameEngine.test.js - Unit tests for GameEngine

import { GameEngine } from '../modules/game/core/GameEngine.js';
import { createMockEventBus, createTestPlayer, createCard } from './utils/TestUtils.js';

// Mock the dependencies
jest.mock('../modules/game/rules/ScoringEngine.js', () => ({
    __esModule: true,
    default: {
        calculateRoundScore: jest.fn((player) => {
            if (player.status === 'busted') return 0;
            return player.numberCards.reduce((sum, card) => sum + card.value, 0);
        }),
        checkForWinner: jest.fn((players, winningScore) => {
            return players.find(p => p.totalScore >= winningScore) || null;
        }),
        getPlayerRankings: jest.fn((players) => {
            return [...players].sort((a, b) => b.totalScore - a.totalScore);
        })
    }
}));

jest.mock('../modules/game/deck/DeckManager.js', () => ({
    __esModule: true,
    default: {
        deck: [],
        drawCard: jest.fn(() => ({ type: 'number', value: 5, display: '5' })),
        prepareForRound: jest.fn(),
        createNewDeck: jest.fn()
    }
}));

describe('GameEngine', () => {
    let gameEngine;
    let mockEventBus;

    beforeEach(() => {
        mockEventBus = createMockEventBus();
        
        // Mock global eventBus
        jest.doMock('../modules/events/EventBus.js', () => ({
            __esModule: true,
            default: mockEventBus
        }));
        
        gameEngine = new GameEngine();
        
        // Clear any setup emissions
        mockEventBus.clearEmissions();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct default values', () => {
            expect(gameEngine.players).toEqual([]);
            expect(gameEngine.currentPlayerIndex).toBe(0);
            expect(gameEngine.dealerIndex).toBe(0);
            expect(gameEngine.roundNumber).toBe(1);
            expect(gameEngine.gameActive).toBe(false);
            expect(gameEngine.winningScore).toBe(200);
            expect(gameEngine.isInitialDealing).toBe(false);
            expect(gameEngine.currentDealIndex).toBe(0);
            expect(gameEngine.isStartingNewRound).toBe(false);
        });

        test('should setup event listeners', () => {
            expect(mockEventBus.on).toHaveBeenCalledWith('game:newGameRequested', expect.any(Function));
            expect(mockEventBus.on).toHaveBeenCalledWith('player:hit', expect.any(Function));
            expect(mockEventBus.on).toHaveBeenCalledWith('player:stay', expect.any(Function));
        });
    });

    describe('initializePlayers', () => {
        test('should create 4 players with correct configuration', () => {
            gameEngine.initializePlayers();

            expect(gameEngine.players.length).toBe(4);
            expect(gameEngine.players[0].id).toBe('player');
            expect(gameEngine.players[0].isHuman).toBe(true);
            expect(gameEngine.players[1].id).toBe('opponent1');
            expect(gameEngine.players[1].isHuman).toBe(false);
            expect(gameEngine.players[2].id).toBe('opponent2');
            expect(gameEngine.players[3].id).toBe('opponent3');
        });

        test('should set global game state', () => {
            gameEngine.initializePlayers();

            expect(window.gameState).toBeDefined();
            expect(window.gameState.players).toEqual(gameEngine.players);
            expect(window.gameState.currentPlayerIndex).toBe(gameEngine.currentPlayerIndex);
            expect(window.gameState.roundNumber).toBe(gameEngine.roundNumber);
        });
    });

    describe('startNewGame', () => {
        test('should initialize game state correctly', () => {
            gameEngine.startNewGame();

            expect(gameEngine.gameActive).toBe(true);
            expect(gameEngine.roundNumber).toBe(1);
            expect(gameEngine.dealerIndex).toBe(0);
            expect(gameEngine.players.length).toBe(4);
        });

        test('should reset all player scores and status', () => {
            gameEngine.initializePlayers();
            gameEngine.players[0].totalScore = 50;
            gameEngine.players[0].status = 'stayed';

            gameEngine.startNewGame();

            gameEngine.players.forEach(player => {
                expect(player.totalScore).toBe(0);
                expect(player.status).toBe('waiting');
            });
        });

        test('should emit game started event', () => {
            gameEngine.startNewGame();

            const emissions = mockEventBus.getEmissions();
            const gameStartEvent = emissions.find(e => e.event === 'game:started');
            
            expect(gameStartEvent).toBeDefined();
            expect(gameStartEvent.data.players).toEqual(gameEngine.players);
            expect(gameStartEvent.data.roundNumber).toBe(1);
        });

        test('should start first round', () => {
            // Mock startNewRound to avoid complex setup
            gameEngine.startNewRound = jest.fn();
            
            gameEngine.startNewGame();
            
            expect(gameEngine.startNewRound).toHaveBeenCalled();
        });
    });

    describe('startNewRound', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
        });

        test('should set round initialization flags', () => {
            gameEngine.startNewRound();

            expect(gameEngine.isStartingNewRound).toBe(true);
            expect(gameEngine.currentPlayerIndex).toBe(gameEngine.dealerIndex);
        });

        test('should reset all players for new round', () => {
            // Set up players with round data
            gameEngine.players[0].roundScore = 25;
            gameEngine.players[0].status = 'stayed';

            gameEngine.startNewRound();

            gameEngine.players.forEach(player => {
                expect(player.roundScore).toBe(0);
                expect(player.status).toBe('active');
            });
        });

        test('should emit round started event', () => {
            mockEventBus.clearEmissions();
            gameEngine.startNewRound();

            const emissions = mockEventBus.getEmissions();
            const roundStartEvent = emissions.find(e => e.event === 'round:started');
            
            expect(roundStartEvent).toBeDefined();
            expect(roundStartEvent.data.roundNumber).toBe(gameEngine.roundNumber);
        });

        test('should update global game state', () => {
            gameEngine.startNewRound();

            expect(window.gameState.currentPlayerIndex).toBe(gameEngine.currentPlayerIndex);
            expect(window.gameState.roundNumber).toBe(gameEngine.roundNumber);
            expect(window.gameState.isStartingNewRound).toBe(gameEngine.isStartingNewRound);
        });
    });

    describe('handleCardDraw', () => {
        let player;

        beforeEach(() => {
            player = createTestPlayer('test-player', 'Test Player');
        });

        test('should handle number card without duplicate', () => {
            const card = createCard.number(5);
            
            const result = gameEngine.handleCardDraw(player, card);
            
            expect(result.waitingForAction).toBe(false);
            expect(result.busted).toBe(false);
            expect(result.endTurn).toBe(false);
            expect(player.numberCards).toContain(card);
        });

        test('should handle number card duplicate with second chance', () => {
            const card1 = createCard.number(5);
            const card2 = createCard.number(5);
            
            player.addCard(card1);
            player.hasSecondChance = true;
            
            const result = gameEngine.handleCardDraw(player, card2);
            
            expect(result.busted).toBe(false);
            expect(player.hasSecondChance).toBe(false);
            expect(player.numberCards.length).toBe(1); // Duplicate removed, new added
        });

        test('should handle number card duplicate without second chance', () => {
            const card1 = createCard.number(5);
            const card2 = createCard.number(5);
            
            player.addCard(card1);
            
            const result = gameEngine.handleCardDraw(player, card2);
            
            expect(result.busted).toBe(true);
            expect(result.endTurn).toBe(true);
            expect(player.status).toBe('busted');
        });

        test('should handle Flip 7 achievement', () => {
            // Add 6 unique numbers first
            for (let i = 0; i < 6; i++) {
                player.addCard(createCard.number(i));
            }
            
            const card = createCard.number(6); // 7th unique
            const result = gameEngine.handleCardDraw(player, card);
            
            expect(result.endTurn).toBe(true);
            expect(player.status).toBe('flip7');
            
            const emissions = mockEventBus.getEmissions();
            const flip7Event = emissions.find(e => e.event === 'player:flip7');
            expect(flip7Event).toBeDefined();
        });

        test('should handle modifier card', () => {
            const card = createCard.modifier('x2');
            
            const result = gameEngine.handleCardDraw(player, card);
            
            expect(result.waitingForAction).toBe(false);
            expect(player.modifierCards).toContain(card);
        });

        test('should handle action card', () => {
            const card = createCard.action('freeze');
            
            const result = gameEngine.handleCardDraw(player, card);
            
            expect(result.waitingForAction).toBe(true);
            expect(player.actionCards).toContain(card);
            
            const emissions = mockEventBus.getEmissions();
            const actionEvent = emissions.find(e => e.event === 'card:actionDrawn');
            expect(actionEvent).toBeDefined();
        });

        test('should emit score update event', () => {
            const card = createCard.number(8);
            mockEventBus.clearEmissions();
            
            gameEngine.handleCardDraw(player, card);
            
            const emissions = mockEventBus.getEmissions();
            const scoreEvent = emissions.find(e => e.event === 'score:updated');
            expect(scoreEvent).toBeDefined();
            expect(scoreEvent.data.playerId).toBe(player.id);
        });
    });

    describe('nextTurn', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
            gameEngine.players.forEach(p => p.status = 'active');
        });

        test('should move to next active player', () => {
            gameEngine.currentPlayerIndex = 0;
            
            gameEngine.nextTurn();
            
            expect(gameEngine.currentPlayerIndex).toBe(1);
        });

        test('should skip inactive players', () => {
            gameEngine.currentPlayerIndex = 0;
            gameEngine.players[1].status = 'busted';
            gameEngine.players[2].status = 'stayed';
            
            gameEngine.nextTurn();
            
            expect(gameEngine.currentPlayerIndex).toBe(3);
        });

        test('should wrap around to first player', () => {
            gameEngine.currentPlayerIndex = 3;
            
            gameEngine.nextTurn();
            
            expect(gameEngine.currentPlayerIndex).toBe(0);
        });

        test('should end round if no active players', () => {
            gameEngine.players.forEach(p => p.status = 'stayed');
            gameEngine.endRound = jest.fn();
            
            gameEngine.nextTurn();
            
            expect(gameEngine.endRound).toHaveBeenCalled();
        });

        test('should emit turn started event for active player', () => {
            mockEventBus.clearEmissions();
            
            gameEngine.nextTurn();
            
            const emissions = mockEventBus.getEmissions();
            const turnEvent = emissions.find(e => e.event === 'turn:started');
            expect(turnEvent).toBeDefined();
            expect(turnEvent.data.playerId).toBe(gameEngine.players[1].id);
        });

        test('should emit AI turn request for AI player', () => {
            mockEventBus.clearEmissions();
            gameEngine.currentPlayerIndex = 0; // Human player first
            
            gameEngine.nextTurn(); // Move to AI player
            
            const emissions = mockEventBus.getEmissions();
            const aiEvent = emissions.find(e => e.event === 'ai:turnRequested');
            expect(aiEvent).toBeDefined();
            expect(aiEvent.data.player.isHuman).toBe(false);
        });

        test('should not emit AI turn request for human player', () => {
            mockEventBus.clearEmissions();
            gameEngine.currentPlayerIndex = 3; // Start at last AI
            
            gameEngine.nextTurn(); // Move to human player (index 0)
            
            const emissions = mockEventBus.getEmissions();
            const aiEvent = emissions.find(e => e.event === 'ai:turnRequested');
            expect(aiEvent).toBeUndefined();
        });
    });

    describe('checkForRoundEnd', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
        });

        test('should end round if player achieved Flip 7', () => {
            gameEngine.players[0].status = 'flip7';
            gameEngine.endRound = jest.fn();
            
            const result = gameEngine.checkForRoundEnd();
            
            expect(result).toBe(true);
            expect(gameEngine.endRound).toHaveBeenCalled();
        });

        test('should end round if no active players left', () => {
            gameEngine.players.forEach(p => p.status = 'stayed');
            gameEngine.endRound = jest.fn();
            
            const result = gameEngine.checkForRoundEnd();
            
            expect(result).toBe(true);
            expect(gameEngine.endRound).toHaveBeenCalled();
        });

        test('should continue if active players remain', () => {
            gameEngine.players[0].status = 'stayed';
            gameEngine.players[1].status = 'active';
            gameEngine.players[2].status = 'busted';
            gameEngine.players[3].status = 'stayed';
            
            const result = gameEngine.checkForRoundEnd();
            
            expect(result).toBe(false);
        });

        test('should continue if multiple active players', () => {
            gameEngine.players.forEach(p => p.status = 'active');
            
            const result = gameEngine.checkForRoundEnd();
            
            expect(result).toBe(false);
        });
    });

    describe('endRound', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
        });

        test('should calculate final scores for all players', () => {
            gameEngine.players[0].status = 'stayed';
            gameEngine.players[1].status = 'busted';
            gameEngine.players[2].status = 'active';
            
            gameEngine.endRound();
            
            // Busted player should have 0 score
            expect(gameEngine.players[1].roundScore).toBe(0);
        });

        test('should emit round ended event', () => {
            mockEventBus.clearEmissions();
            
            gameEngine.endRound();
            
            const emissions = mockEventBus.getEmissions();
            const roundEndEvent = emissions.find(e => e.event === 'round:ended');
            expect(roundEndEvent).toBeDefined();
            expect(roundEndEvent.data.roundNumber).toBe(gameEngine.roundNumber);
        });

        test('should add round scores to total scores', () => {
            gameEngine.players[0].roundScore = 25;
            gameEngine.players[0].totalScore = 50;
            
            gameEngine.endRound();
            
            expect(gameEngine.players[0].totalScore).toBe(75);
        });

        test('should call completeRoundEnd', () => {
            gameEngine.completeRoundEnd = jest.fn();
            
            gameEngine.endRound();
            
            expect(gameEngine.completeRoundEnd).toHaveBeenCalled();
        });
    });

    describe('completeRoundEnd', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
        });

        test('should emit scoreboard update', () => {
            mockEventBus.clearEmissions();
            
            gameEngine.completeRoundEnd();
            
            const emissions = mockEventBus.getEmissions();
            const scoreboardEvent = emissions.find(e => e.event === 'display:scoreboardUpdate');
            expect(scoreboardEvent).toBeDefined();
        });

        test('should end game if winner found', () => {
            gameEngine.players[0].totalScore = 250;
            gameEngine.endGame = jest.fn();
            
            gameEngine.completeRoundEnd();
            
            expect(gameEngine.endGame).toHaveBeenCalledWith(gameEngine.players[0]);
        });

        test('should start next round if no winner', () => {
            gameEngine.players.forEach(p => p.totalScore = 100);
            gameEngine.startNewRound = jest.fn();
            
            gameEngine.completeRoundEnd();
            
            expect(gameEngine.dealerIndex).toBe(1); // Rotated
            expect(gameEngine.roundNumber).toBe(2); // Incremented
            expect(gameEngine.startNewRound).toHaveBeenCalled();
        });

        test('should rotate dealer index correctly', () => {
            gameEngine.dealerIndex = 3; // Last player
            gameEngine.players.forEach(p => p.totalScore = 100);
            gameEngine.startNewRound = jest.fn();
            
            gameEngine.completeRoundEnd();
            
            expect(gameEngine.dealerIndex).toBe(0); // Wrapped around
        });
    });

    describe('endGame', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
            gameEngine.gameActive = true;
        });

        test('should set game as inactive', () => {
            const winner = gameEngine.players[0];
            
            gameEngine.endGame(winner);
            
            expect(gameEngine.gameActive).toBe(false);
        });

        test('should emit game ended event', () => {
            const winner = gameEngine.players[0];
            mockEventBus.clearEmissions();
            
            gameEngine.endGame(winner);
            
            const emissions = mockEventBus.getEmissions();
            const gameEndEvent = emissions.find(e => e.event === 'game:ended');
            expect(gameEndEvent).toBeDefined();
            expect(gameEndEvent.data.winner).toBe(winner);
        });
    });

    describe('Player Actions', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
            gameEngine.currentPlayerIndex = 0; // Human player
            gameEngine.players[0].status = 'active';
        });

        describe('handlePlayerHit', () => {
            test('should draw card and handle result', () => {
                const mockDeckManager = require('../modules/game/deck/DeckManager.js').default;
                mockDeckManager.drawCard.mockReturnValue(createCard.number(7));
                
                gameEngine.handlePlayerHit();
                
                expect(mockDeckManager.drawCard).toHaveBeenCalled();
                
                const emissions = mockEventBus.getEmissions();
                const cardEvent = emissions.find(e => e.event === 'card:drawn');
                expect(cardEvent).toBeDefined();
            });

            test('should ignore hit if not human player turn', () => {
                gameEngine.currentPlayerIndex = 1; // AI player
                
                gameEngine.handlePlayerHit();
                
                // Should not draw card or emit events
                const emissions = mockEventBus.getEmissions();
                expect(emissions.length).toBe(0);
            });

            test('should ignore hit if player not active', () => {
                gameEngine.players[0].status = 'stayed';
                
                gameEngine.handlePlayerHit();
                
                const emissions = mockEventBus.getEmissions();
                expect(emissions.length).toBe(0);
            });
        });

        describe('handlePlayerStay', () => {
            test('should set player as stayed', () => {
                gameEngine.handlePlayerStay();
                
                expect(gameEngine.players[0].status).toBe('stayed');
                
                const emissions = mockEventBus.getEmissions();
                const stayEvent = emissions.find(e => e.event === 'player:stayed');
                expect(stayEvent).toBeDefined();
            });

            test('should move to next turn', () => {
                gameEngine.nextTurn = jest.fn();
                
                gameEngine.handlePlayerStay();
                
                expect(gameEngine.nextTurn).toHaveBeenCalled();
            });
        });
    });

    describe('Utility Methods', () => {
        beforeEach(() => {
            gameEngine.initializePlayers();
        });

        test('getCurrentPlayer should return current player', () => {
            gameEngine.currentPlayerIndex = 2;
            
            const currentPlayer = gameEngine.getCurrentPlayer();
            
            expect(currentPlayer).toBe(gameEngine.players[2]);
        });

        test('getActivePlayers should filter active players', () => {
            gameEngine.players[0].status = 'active';
            gameEngine.players[1].status = 'busted';
            gameEngine.players[2].status = 'active';
            gameEngine.players[3].status = 'stayed';
            
            const activePlayers = gameEngine.getActivePlayers();
            
            expect(activePlayers.length).toBe(2);
            expect(activePlayers[0].status).toBe('active');
            expect(activePlayers[1].status).toBe('active');
        });

        test('isGameActive should return game state', () => {
            gameEngine.gameActive = true;
            expect(gameEngine.isGameActive()).toBe(true);
            
            gameEngine.gameActive = false;
            expect(gameEngine.isGameActive()).toBe(false);
        });

        test('getPlayerById should find player by ID', () => {
            const player = gameEngine.getPlayerById('opponent2');
            
            expect(player.id).toBe('opponent2');
        });

        test('getPlayerById should return undefined for non-existent ID', () => {
            const player = gameEngine.getPlayerById('non-existent');
            
            expect(player).toBeUndefined();
        });

        test('getGameState should return complete game state', () => {
            gameEngine.gameActive = true;
            gameEngine.isInitialDealing = true;
            
            const state = gameEngine.getGameState();
            
            expect(state.players).toBe(gameEngine.players);
            expect(state.currentPlayerIndex).toBe(gameEngine.currentPlayerIndex);
            expect(state.roundNumber).toBe(gameEngine.roundNumber);
            expect(state.gameActive).toBe(true);
            expect(state.isInitialDealing).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty player array in nextTurn', () => {
            gameEngine.players = [];
            gameEngine.endRound = jest.fn();
            
            gameEngine.nextTurn();
            
            expect(gameEngine.endRound).toHaveBeenCalled();
        });

        test('should handle invalid currentPlayerIndex', () => {
            gameEngine.initializePlayers();
            gameEngine.currentPlayerIndex = 10; // Invalid index
            
            expect(() => gameEngine.getCurrentPlayer()).not.toThrow();
        });

        test('should handle multiple Flip 7 players', () => {
            gameEngine.initializePlayers();
            gameEngine.players[0].status = 'flip7';
            gameEngine.players[1].status = 'flip7';
            gameEngine.endRound = jest.fn();
            
            const result = gameEngine.checkForRoundEnd();
            
            expect(result).toBe(true);
            expect(gameEngine.endRound).toHaveBeenCalled();
        });

        test('should handle game end with tied scores', () => {
            gameEngine.initializePlayers();
            gameEngine.players[0].totalScore = 200;
            gameEngine.players[1].totalScore = 200;
            gameEngine.endGame = jest.fn();
            
            gameEngine.completeRoundEnd();
            
            expect(gameEngine.endGame).toHaveBeenCalled();
        });

        test('should handle dealer rotation at maximum index', () => {
            gameEngine.initializePlayers();
            gameEngine.dealerIndex = 3;
            gameEngine.players.forEach(p => p.totalScore = 50);
            gameEngine.startNewRound = jest.fn();
            
            gameEngine.completeRoundEnd();
            
            expect(gameEngine.dealerIndex).toBe(0);
        });
    });
});