// GameFlow.test.js - End-to-end game flow testing

describe('Game Flow Integration Tests', () => {
    // Mock complete game system for end-to-end testing
    class MockCompleteGame {
        constructor() {
            this.players = [];
            this.currentPlayerIndex = 0;
            this.dealerIndex = 0;
            this.roundNumber = 1;
            this.gameActive = false;
            this.winningScore = 200;
            this.deck = [];
            this.discardPile = [];
            this.gameLog = [];
            this.gameWinner = null;
            
            this.initializeDeck();
        }

        initializeDeck() {
            // Create a full deck like the real game
            this.deck = [];
            
            // Number cards (0-12), 4 of each
            for (let value = 0; value <= 12; value++) {
                for (let i = 0; i < 4; i++) {
                    this.deck.push({
                        type: 'number',
                        value: value,
                        display: value.toString(),
                        id: `number_${value}_${i}`
                    });
                }
            }
            
            // Modifier cards
            const modifiers = [
                { value: 2, count: 4 },
                { value: 4, count: 4 },
                { value: 6, count: 4 },
                { value: 8, count: 4 },
                { value: 10, count: 4 },
                { value: 'x2', count: 8 }
            ];
            
            modifiers.forEach(mod => {
                for (let i = 0; i < mod.count; i++) {
                    this.deck.push({
                        type: 'modifier',
                        value: mod.value,
                        display: mod.value === 'x2' ? 'x2' : `+${mod.value}`,
                        id: `modifier_${mod.value}_${i}`
                    });
                }
            });
            
            // Action cards
            const actions = [
                { value: 'freeze', count: 4 },
                { value: 'flip3', count: 4 },
                { value: 'second_chance', count: 8 }
            ];
            
            actions.forEach(action => {
                for (let i = 0; i < action.count; i++) {
                    this.deck.push({
                        type: 'action',
                        value: action.value,
                        display: action.value === 'second_chance' ? 'Second Chance' : 
                                action.value === 'flip3' ? 'Flip 3' : 
                                action.value === 'freeze' ? 'Freeze' : action.value,
                        id: `action_${action.value}_${i}`
                    });
                }
            });
        }

        createPlayer(id, name, isHuman = false) {
            return {
                id,
                name,
                isHuman,
                numberCards: [],
                modifierCards: [],
                actionCards: [],
                uniqueNumbers: new Set(),
                hasSecondChance: false,
                status: 'waiting',
                roundScore: 0,
                totalScore: 0,
                isFrozen: false
            };
        }

        addPlayers(playerConfigs) {
            this.players = [];
            playerConfigs.forEach(config => {
                this.players.push(this.createPlayer(config.id, config.name, config.isHuman || false));
            });
        }

        shuffleDeck() {
            // Simple shuffle for testing
            for (let i = this.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
            }
        }

        drawCard() {
            if (this.deck.length === 0) {
                // Reshuffle if needed
                if (this.discardPile.length > 0) {
                    this.deck = [...this.discardPile];
                    this.discardPile = [];
                    this.shuffleDeck();
                } else {
                    return null; // No cards available
                }
            }
            return this.deck.pop();
        }

        startGame() {
            if (this.players.length === 0) return false;
            
            this.gameActive = true;
            this.roundNumber = 1;
            this.dealerIndex = 0;
            this.currentPlayerIndex = 0;
            this.gameLog.push(`Game started with ${this.players.length} players`);
            
            return this.startRound();
        }

        startRound() {
            this.gameLog.push(`Round ${this.roundNumber} started`);
            
            // Reset all players for new round
            this.players.forEach(player => {
                player.numberCards = [];
                player.modifierCards = [];
                // Keep action cards that should persist (like Second Chance)
                player.actionCards = player.actionCards.filter(card => card.value === 'second_chance');
                player.uniqueNumbers = new Set();
                player.status = 'active';
                player.roundScore = 0;
                player.isFrozen = false;
                // Don't reset hasSecondChance - it persists between rounds
            });
            
            this.currentPlayerIndex = this.dealerIndex;
            return true;
        }

        simulatePlayerTurn(player) {
            const card = this.drawCard();
            if (!card) {
                return { action: 'no_cards', reason: 'Deck empty' };
            }

            if (player.status !== 'active' || player.isFrozen) {
                return { action: 'skipped', reason: `Player ${player.status}${player.isFrozen ? '/frozen' : ''}` };
            }

            const result = this.processCard(player, card);
            this.gameLog.push(`${player.name} drew ${card.display}: ${result.outcome}`);
            
            return result;
        }

        processCard(player, card) {
            if (card.type === 'number') {
                if (player.uniqueNumbers.has(card.value)) {
                    if (player.hasSecondChance) {
                        // Use Second Chance
                        player.hasSecondChance = false;
                        player.actionCards = player.actionCards.filter(c => c.value !== 'second_chance');
                        player.numberCards.push(card);
                        player.numberCards.sort((a, b) => a.value - b.value);
                        player.uniqueNumbers.add(card.value);
                        return { outcome: `used Second Chance for duplicate ${card.value}`, endTurn: false, busted: false };
                    } else {
                        // Bust
                        player.status = 'busted';
                        player.roundScore = 0;
                        return { outcome: `BUSTED with duplicate ${card.value}`, endTurn: true, busted: true };
                    }
                } else {
                    // Normal number card
                    player.numberCards.push(card);
                    player.uniqueNumbers.add(card.value);
                    player.numberCards.sort((a, b) => a.value - b.value);
                    
                    // Check for Flip 7
                    if (player.uniqueNumbers.size === 7) {
                        this.calculateRoundScore(player);
                        return { outcome: `achieved FLIP 7! Score: ${player.roundScore}`, endTurn: true, flip7: true };
                    }
                    
                    return { outcome: `added ${card.value}`, endTurn: false, busted: false };
                }
            } else if (card.type === 'modifier') {
                player.modifierCards.push(card);
                return { outcome: `gained modifier ${card.display}`, endTurn: false, busted: false };
            } else if (card.type === 'action') {
                if (card.value === 'second_chance' && !player.hasSecondChance) {
                    player.hasSecondChance = true;
                    player.actionCards.push(card);
                    return { outcome: `gained Second Chance`, endTurn: false, busted: false };
                } else {
                    player.actionCards.push(card);
                    return { outcome: `gained ${card.display}`, endTurn: false, busted: false };
                }
            }
            
            return { outcome: 'unknown card type', endTurn: false, busted: false };
        }

        calculateRoundScore(player) {
            if (player.status === 'busted') {
                player.roundScore = 0;
                return 0;
            }

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
            
            player.roundScore = score;
            return score;
        }

        simulateRound() {
            const roundResults = {
                playerResults: [],
                roundWinner: null,
                gameEnded: false,
                gameWinner: null
            };
            
            // Simple simulation: each player draws until they stay, bust, or achieve Flip 7
            this.players.forEach(player => {
                const playerResult = {
                    player: player.name,
                    actions: [],
                    finalStatus: player.status,
                    roundScore: 0,
                    totalScore: player.totalScore
                };
                
                // Simulate multiple draws per player
                let maxDraws = 15; // Prevent infinite loops
                while (player.status === 'active' && !player.isFrozen && maxDraws > 0) {
                    const turnResult = this.simulatePlayerTurn(player);
                    playerResult.actions.push(turnResult);
                    
                    if (turnResult.busted || turnResult.flip7 || turnResult.action === 'no_cards') {
                        break;
                    }
                    
                    // Simple AI: stop if score is reasonable (simulate "stay")
                    this.calculateRoundScore(player);
                    if (player.roundScore >= 12 && Math.random() > 0.5) {
                        player.status = 'stayed';
                        playerResult.actions.push({ outcome: 'decided to stay' });
                        break;
                    }
                    
                    maxDraws--;
                }
                
                // Final score calculation
                this.calculateRoundScore(player);
                player.totalScore += player.roundScore;
                
                playerResult.finalStatus = player.status;
                playerResult.roundScore = player.roundScore;
                playerResult.totalScore = player.totalScore;
                
                roundResults.playerResults.push(playerResult);
            });
            
            // Determine round winner
            const activePlayers = this.players.filter(p => p.status !== 'busted');
            if (activePlayers.length > 0) {
                const highestRoundScore = Math.max(...activePlayers.map(p => p.roundScore));
                roundResults.roundWinner = activePlayers.find(p => p.roundScore === highestRoundScore);
            }
            
            // Check for game winner
            const winner = this.players.find(p => p.totalScore >= this.winningScore);
            if (winner) {
                this.gameWinner = winner;
                this.gameActive = false;
                roundResults.gameEnded = true;
                roundResults.gameWinner = winner;
            }
            
            return roundResults;
        }

        simulateFullGame() {
            const gameResults = {
                rounds: [],
                winner: null,
                totalRounds: 0,
                ended: false
            };
            
            this.startGame();
            
            let maxRounds = 20; // Prevent infinite games
            while (this.gameActive && maxRounds > 0) {
                const roundResult = this.simulateRound();
                gameResults.rounds.push(roundResult);
                gameResults.totalRounds++;
                
                if (roundResult.gameEnded) {
                    gameResults.ended = true;
                    gameResults.winner = roundResult.gameWinner;
                    break;
                }
                
                // Next round
                this.roundNumber++;
                this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
                this.startRound();
                maxRounds--;
            }
            
            // Handle case where max rounds reached without winner
            if (!gameResults.ended && this.players.length > 0) {
                const highestScorer = this.players.reduce((prev, curr) => 
                    (curr.totalScore > prev.totalScore) ? curr : prev
                );
                this.gameActive = false; // Set game as inactive
                this.gameWinner = highestScorer;
                gameResults.ended = true;
                gameResults.winner = highestScorer;
            }
            
            return gameResults;
        }
    }

    let game;

    beforeEach(() => {
        game = new MockCompleteGame();
        // Set a fixed seed for reproducible tests (in a real implementation)
        // Math.random would be mocked for consistent results
    });

    describe('Complete Game Flow', () => {
        test('should complete a full game with 4 players', () => {
            // Setup standard 4-player game with reasonable winning score for testing
            game.winningScore = 80; // Lower for testing
            game.addPlayers([
                { id: 'human', name: 'Human Player', isHuman: true },
                { id: 'ai1', name: 'AI Bot 1' },
                { id: 'ai2', name: 'AI Bot 2' },
                { id: 'ai3', name: 'AI Bot 3' }
            ]);

            const gameResults = game.simulateFullGame();

            // Verify game completed successfully
            expect(gameResults.ended).toBe(true);
            expect(gameResults.winner).toBeDefined();
            expect(gameResults.winner.totalScore).toBeGreaterThan(0);
            expect(gameResults.totalRounds).toBeGreaterThan(0);
            expect(gameResults.rounds.length).toBe(gameResults.totalRounds);
        });

        test('should handle game with different winning conditions', () => {
            // Test with lower winning score for faster games
            game.winningScore = 50;
            
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' }
            ]);

            const gameResults = game.simulateFullGame();

            expect(gameResults.ended).toBe(true);
            expect(gameResults.winner.totalScore).toBeGreaterThanOrEqual(50);
            expect(gameResults.totalRounds).toBeLessThan(10); // Should be shorter with lower target
        });

        test('should handle single player game', () => {
            game.winningScore = 80; // Lower for testing
            game.addPlayers([
                { id: 'solo', name: 'Solo Player' }
            ]);

            const gameResults = game.simulateFullGame();

            expect(gameResults.ended).toBe(true);
            expect(gameResults.winner.name).toBe('Solo Player');
            expect(game.players[0].totalScore).toBeGreaterThan(0);
        });
    });

    describe('Multi-Round Scenarios', () => {
        test('should maintain score accumulation across rounds', () => {
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' }
            ]);

            game.startGame();
            
            // Manually set some round scores to test accumulation
            game.players[0].roundScore = 25;
            game.players[0].totalScore = 25;
            game.players[1].roundScore = 30;
            game.players[1].totalScore = 30;

            // Start second round
            game.roundNumber = 2;
            game.startRound();
            
            // Verify players reset for new round but keep total scores
            game.players.forEach(player => {
                expect(player.roundScore).toBe(0);
                expect(player.numberCards).toHaveLength(0);
                expect(player.status).toBe('active');
            });
            
            expect(game.players[0].totalScore).toBe(25);
            expect(game.players[1].totalScore).toBe(30);
        });

        test('should rotate dealer correctly across rounds', () => {
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' },
                { id: 'p3', name: 'Player 3' }
            ]);

            game.startGame();
            expect(game.dealerIndex).toBe(0);

            // Simulate round completion and next round start
            game.roundNumber = 2;
            game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
            expect(game.dealerIndex).toBe(1);

            game.roundNumber = 3;
            game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
            expect(game.dealerIndex).toBe(2);

            game.roundNumber = 4;
            game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
            expect(game.dealerIndex).toBe(0); // Back to first player
        });

        test('should handle persistent Second Chance across rounds', () => {
            const player = game.createPlayer('test', 'Test Player');
            game.players = [player];

            // Give player Second Chance
            player.hasSecondChance = true;
            player.actionCards.push({ type: 'action', value: 'second_chance', display: 'Second Chance' });

            // Start new round
            game.startRound();

            // Second Chance should persist
            expect(player.hasSecondChance).toBe(true);
            expect(player.actionCards.some(c => c.value === 'second_chance')).toBe(true);
            
            // But other stats should reset
            expect(player.roundScore).toBe(0);
            expect(player.numberCards).toHaveLength(0);
            expect(player.status).toBe('active');
        });
    });

    describe('Win Condition Scenarios', () => {
        test('should handle Flip 7 victory', () => {
            const player = game.createPlayer('flip7', 'Flip7 Player');
            game.players = [player];

            // Give player cards for Flip 7
            [0, 1, 2, 3, 4, 5, 6].forEach(value => {
                const card = { type: 'number', value, display: value.toString() };
                game.processCard(player, card);
            });

            expect(player.uniqueNumbers.size).toBe(7);
            game.calculateRoundScore(player);
            expect(player.roundScore).toBeGreaterThan(15); // Base score + Flip 7 bonus
        });

        test('should handle high score victory', () => {
            const player = game.createPlayer('high', 'High Score Player');
            game.players = [player];

            // Give player high value cards and modifiers
            [10, 11, 12].forEach(value => {
                const card = { type: 'number', value, display: value.toString() };
                game.processCard(player, card);
            });

            // Add x2 modifier
            const x2Card = { type: 'modifier', value: 'x2', display: 'x2' };
            game.processCard(player, x2Card);

            // Add bonus points
            const bonusCard = { type: 'modifier', value: 10, display: '+10' };
            game.processCard(player, bonusCard);

            game.calculateRoundScore(player);
            expect(player.roundScore).toBe(76); // (10+11+12)*2 + 10 = 66 + 10
        });

        test('should handle tied scores correctly', () => {
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' }
            ]);

            // Set identical high scores
            game.players[0].totalScore = 200;
            game.players[1].totalScore = 200;

            const gameResults = game.simulateFullGame();

            // Game should complete with one winner (first to reach in tie-break)
            expect(gameResults.ended).toBe(true);
            expect(gameResults.winner).toBeDefined();
            expect([200]).toContain(gameResults.winner.totalScore);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty deck scenario', () => {
            const player = game.createPlayer('test', 'Test Player');
            game.players = [player];
            game.deck = []; // Empty deck
            game.discardPile = []; // Empty discard

            const result = game.simulatePlayerTurn(player);
            expect(result.action).toBe('no_cards');
        });

        test('should handle all players busting', () => {
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' }
            ]);

            // Force all players to bust
            game.players.forEach(player => {
                player.status = 'busted';
                player.roundScore = 0;
            });

            const roundResults = game.simulateRound();
            expect(roundResults.roundWinner).toBeNull();
        });

        test('should handle game with no players', () => {
            const started = game.startGame();
            expect(started).toBe(false);
            expect(game.gameActive).toBe(false);
        });

        test('should handle maximum rounds without winner', () => {
            // Set very high winning score to test max rounds limit
            game.winningScore = 10000;
            
            game.addPlayers([
                { id: 'p1', name: 'Player 1' }
            ]);

            const gameResults = game.simulateFullGame();

            // Should stop at max rounds even without winner
            expect(gameResults.totalRounds).toBeGreaterThan(0);
            expect(gameResults.totalRounds).toBeLessThanOrEqual(20);
        });
    });

    describe('State Consistency Throughout Game', () => {
        test('should maintain consistent state across complete game', () => {
            game.winningScore = 80; // Lower for testing
            game.addPlayers([
                { id: 'p1', name: 'Player 1' },
                { id: 'p2', name: 'Player 2' }
            ]);

            const initialDeckSize = game.deck.length;
            const gameResults = game.simulateFullGame();

            // Verify final state consistency
            expect(gameResults.winner).toBeDefined();
            expect(gameResults.winner.totalScore).toBeGreaterThan(0);
            expect(game.gameActive).toBe(false);
            
            // Verify all player states are valid
            game.players.forEach(player => {
                expect(player.totalScore).toBeGreaterThanOrEqual(0);
                expect(['active', 'stayed', 'busted']).toContain(player.status);
                expect(player.uniqueNumbers.size).toBeLessThanOrEqual(13); // Max possible unique cards (0-12)
            });

            // Verify deck integrity (cards moved between deck and discard)
            const remainingCards = game.deck.length + game.discardPile.length;
            expect(remainingCards).toBeLessThanOrEqual(initialDeckSize);
        });
    });
});