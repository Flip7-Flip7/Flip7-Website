// AIPlayer.test.js - Unit tests for AIPlayer decision making

import { AIPlayer } from '../modules/game/ai/AIPlayer.js';
import { createMockEventBus, createTestPlayer, createCard, aiScenarios } from './utils/TestUtils.js';

// Mock GameEngine dependency
const mockGameEngine = {
    drawCard: jest.fn(() => createCard.number(3)),
    handleCardDraw: jest.fn(() => ({ busted: false, endTurn: false })),
    handlePlayerHit: jest.fn(),
    handlePlayerStay: jest.fn(),
    nextTurn: jest.fn(),
    getActivePlayers: jest.fn(() => []),
    getGameState: jest.fn(() => ({ roundNumber: 1 }))
};

jest.mock('../modules/game/core/GameEngine.js', () => ({
    __esModule: true,
    default: mockGameEngine
}));

describe('AIPlayer', () => {
    let aiPlayer;
    let mockEventBus;

    beforeEach(() => {
        mockEventBus = createMockEventBus();
        
        // Mock global eventBus
        jest.doMock('../modules/events/EventBus.js', () => ({
            __esModule: true,
            default: mockEventBus
        }));
        
        aiPlayer = new AIPlayer();
        
        // Clear setup emissions
        mockEventBus.clearEmissions();
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should setup event listeners', () => {
            expect(mockEventBus.on).toHaveBeenCalledWith('ai:turnRequested', expect.any(Function));
        });
    });

    describe('takeAITurn', () => {
        test('should be aggressive with second chance', () => {
            const { player, expectedAction } = aiScenarios.withSecondChance();
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiHit).toHaveBeenCalledWith(player);
            expect(aiPlayer.aiStay).not.toHaveBeenCalled();
        });

        test('should be aggressive with 6 unique numbers (near Flip 7)', () => {
            const { player, expectedAction } = aiScenarios.nearFlip7();
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiHit).toHaveBeenCalledWith(player);
            expect(aiPlayer.aiStay).not.toHaveBeenCalled();
        });

        test('should be aggressive with 5 unique numbers and low score', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            [1, 3, 5, 7, 9].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 25; // Low score
            
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiHit).toHaveBeenCalledWith(player);
        });

        test('should stay with high score and risk', () => {
            const { player, expectedAction } = aiScenarios.highScore();
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiStay).toHaveBeenCalledWith(player);
            expect(aiPlayer.aiHit).not.toHaveBeenCalled();
        });

        test('should consider risk with many unique numbers', () => {
            const { player, expectedAction } = aiScenarios.manyUniques();
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiStay).toHaveBeenCalledWith(player);
        });

        test('should calculate risk tolerance correctly', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            [2, 4, 6].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 12;
            
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            // With 3 unique numbers and score 12, should likely hit
            expect(aiPlayer.aiHit).toHaveBeenCalledWith(player);
        });

        test('should handle edge case with zero unique numbers', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            player.roundScore = 0;
            
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            // With no cards and low score, should hit
            expect(aiPlayer.aiHit).toHaveBeenCalledWith(player);
        });

        test('should sometimes take calculated risks with many uniques', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            [0, 1, 2, 3, 4, 5, 7, 8, 10].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 40;
            
            // Mock Math.random to force risk taking
            const originalRandom = Math.random;
            Math.random = jest.fn(() => 0.5); // 50% - should take risk (>0.7 threshold)
            
            aiPlayer.aiHit = jest.fn();
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiStay).toHaveBeenCalledWith(player);
            
            // Restore Math.random
            Math.random = originalRandom;
        });
    });

    describe('aiHit', () => {
        test('should emit AI action event', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            
            aiPlayer.aiHit(player);
            
            const emissions = mockEventBus.getEmissions();
            const aiActionEvent = emissions.find(e => e.event === 'ai:actionTaken');
            expect(aiActionEvent).toBeDefined();
            expect(aiActionEvent.data.playerId).toBe('ai-test');
            expect(aiActionEvent.data.action).toBe('hit');
        });

        test('should call game engine handlePlayerHit', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            
            aiPlayer.aiHit(player);
            
            expect(mockGameEngine.handlePlayerHit).toHaveBeenCalled();
        });
    });

    describe('aiStay', () => {
        test('should emit AI action event', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            player.roundScore = 15;
            
            aiPlayer.aiStay(player);
            
            const emissions = mockEventBus.getEmissions();
            const aiActionEvent = emissions.find(e => e.event === 'ai:actionTaken');
            expect(aiActionEvent).toBeDefined();
            expect(aiActionEvent.data.playerId).toBe(player.id);
            expect(aiActionEvent.data.action).toBe('stay');
        });

        test('should call game engine handlePlayerStay', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            
            aiPlayer.aiStay(player);
            
            expect(mockGameEngine.handlePlayerStay).toHaveBeenCalled();
        });
    });

    describe('determineAITarget', () => {
        let players;

        beforeEach(() => {
            players = [
                Object.assign(createTestPlayer('p1'), { roundScore: 10, isHuman: false }),
                Object.assign(createTestPlayer('p2'), { roundScore: 20, isHuman: true }),
                Object.assign(createTestPlayer('p3'), { roundScore: 15, isHuman: false })
            ];
            
            mockGameEngine.getActivePlayers.mockReturnValue(players);
        });

        test('should return null if no active players', () => {
            mockGameEngine.getActivePlayers.mockReturnValue([]);
            const player = createTestPlayer('ai-test');
            
            const target = aiPlayer.determineAITarget(player, createCard.action('freeze'));
            
            expect(target).toBeNull();
        });

        test('should select freeze target correctly', () => {
            const player = createTestPlayer('ai-test');
            
            const target = aiPlayer.selectFreezeTarget(players);
            
            // Should target player with highest score (p2 with 20)
            expect(target.roundScore).toBe(20);
        });

        test('should prefer human player for freeze if leading', () => {
            // Make human player the leader
            players[1].roundScore = 25; // Human with highest score
            
            const target = aiPlayer.selectFreezeTarget(players);
            
            expect(target.isHuman).toBe(true);
            expect(target.roundScore).toBe(25);
        });

        test('should select random leader if multiple non-human leaders', () => {
            players[0].roundScore = 25;
            players[2].roundScore = 25;
            players[1].roundScore = 15; // Human not leading
            
            const target = aiPlayer.selectFreezeTarget(players);
            
            expect(target.roundScore).toBe(25);
            expect([players[0].id, players[2].id]).toContain(target.id);
        });

        test('should select flip3 target with fewest unique numbers', () => {
            players[0].uniqueNumbers = new Set([1, 2, 3, 4, 5]); // 5 unique
            players[1].uniqueNumbers = new Set([1, 2]); // 2 unique (most vulnerable)
            players[2].uniqueNumbers = new Set([1, 2, 3]); // 3 unique
            
            const target = aiPlayer.selectFlip3Target(players);
            
            expect(target.uniqueNumbers.size).toBe(2);
            expect(target.id).toBe(players[1].id);
        });

        test('should handle freeze card targeting', () => {
            const player = createTestPlayer('ai-test');
            const card = createCard.action('freeze');
            
            const target = aiPlayer.determineAITarget(player, card);
            
            expect(target.roundScore).toBe(20); // Highest scorer
        });

        test('should handle flip3 card targeting', () => {
            const player = createTestPlayer('ai-test');
            const card = createCard.action('flip3');
            
            players[1].uniqueNumbers = new Set([1, 2]); // Fewest unique
            
            const target = aiPlayer.determineAITarget(player, card);
            
            expect(target.uniqueNumbers.size).toBe(2);
        });

        test('should return random target for unknown card type', () => {
            const player = createTestPlayer('ai-test');
            const card = createCard.action('unknown');
            
            const target = aiPlayer.determineAITarget(player, card);
            
            expect(players).toContain(target);
        });
    });

    describe('selectSecondChanceTarget', () => {
        test('should prefer human player if available', () => {
            const recipients = [
                Object.assign(createTestPlayer('p1'), { isHuman: false }),
                Object.assign(createTestPlayer('p2'), { isHuman: true }),
                Object.assign(createTestPlayer('p3'), { isHuman: false })
            ];
            
            const target = aiPlayer.selectSecondChanceTarget(recipients);
            
            expect(target.isHuman).toBe(true);
            expect(target.id).toBe('p2');
        });

        test('should select random recipient if no human', () => {
            const recipients = [
                Object.assign(createTestPlayer('p1'), { isHuman: false }),
                Object.assign(createTestPlayer('p3'), { isHuman: false })
            ];
            
            const target = aiPlayer.selectSecondChanceTarget(recipients);
            
            expect(recipients).toContain(target);
            expect(target.isHuman).toBe(false);
        });

        test('should return null for empty recipient list', () => {
            const target = aiPlayer.selectSecondChanceTarget([]);
            expect(target).toBeNull();
        });
    });

    describe('calculateRiskTolerance', () => {
        beforeEach(() => {
            mockGameEngine.getGameState.mockReturnValue({ roundNumber: 1 });
        });

        test('should be more aggressive with few unique cards', () => {
            const player = createTestPlayer();
            [1, 2].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 10;
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeGreaterThan(0.5); // Should be aggressive
        });

        test('should be cautious with many unique cards', () => {
            const player = createTestPlayer();
            [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 15;
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeLessThan(0.5); // Should be cautious
        });

        test('should be more aggressive with low score', () => {
            const player = createTestPlayer();
            [5, 7].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 5; // Low score
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeGreaterThan(0.5);
        });

        test('should be cautious with high score', () => {
            const player = createTestPlayer();
            [8, 9, 10].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 30; // High score
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeLessThan(0.5);
        });

        test('should be very aggressive with second chance', () => {
            const player = createTestPlayer();
            player.hasSecondChance = true;
            player.roundScore = 20;
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeGreaterThan(0.8); // Very aggressive
        });

        test('should be more aggressive in later rounds', () => {
            mockGameEngine.getGameState.mockReturnValue({ roundNumber: 5 });
            const player = createTestPlayer();
            player.roundScore = 15;
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeGreaterThan(0.5);
        });

        test('should clamp risk tolerance between 0.1 and 0.9', () => {
            const player = createTestPlayer();
            
            // Setup for very low risk
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 50;
            
            const risk = aiPlayer.calculateRiskTolerance(player);
            
            expect(risk).toBeGreaterThanOrEqual(0.1);
            expect(risk).toBeLessThanOrEqual(0.9);
        });
    });

    describe('shouldUseSpecialActionImmediately', () => {
        let players;

        beforeEach(() => {
            players = [
                Object.assign(createTestPlayer('p1'), { roundScore: 5 }),
                Object.assign(createTestPlayer('p2'), { roundScore: 20 })
            ];
            mockGameEngine.getActivePlayers.mockReturnValue(players);
        });

        test('should always use second chance immediately', () => {
            const player = createTestPlayer();
            const card = createCard.action('second_chance');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(true);
        });

        test('should use freeze if good targets available', () => {
            const player = createTestPlayer();
            const card = createCard.action('freeze');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(true); // p2 has score > 15
        });

        test('should not use freeze if no good targets', () => {
            players = [Object.assign(createTestPlayer('p1'), { roundScore: 5 })];
            mockGameEngine.getActivePlayers.mockReturnValue(players);
            
            const player = createTestPlayer();
            const card = createCard.action('freeze');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(false);
        });

        test('should use flip3 if vulnerable targets available', () => {
            players[1].uniqueNumbers = new Set([1, 2, 3, 4, 5, 6]); // 6 unique (vulnerable)
            
            const player = createTestPlayer();
            const card = createCard.action('flip3');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(true);
        });

        test('should not use flip3 if no vulnerable targets', () => {
            players.forEach(p => p.uniqueNumbers = new Set([1, 2, 3])); // Only 3 unique each
            
            const player = createTestPlayer();
            const card = createCard.action('flip3');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(false);
        });

        test('should return false for unknown card type', () => {
            const player = createTestPlayer();
            const card = createCard.action('unknown');
            
            const shouldUse = aiPlayer.shouldUseSpecialActionImmediately(player, card);
            
            expect(shouldUse).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle AI turn with no cards', () => {
            const player = createTestPlayer();
            // No cards added
            aiPlayer.aiHit = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiHit).toHaveBeenCalled(); // Should hit with no cards
        });

        test('should handle targeting with no valid players', () => {
            mockGameEngine.getActivePlayers.mockReturnValue([]);
            
            const player = createTestPlayer();
            const target = aiPlayer.determineAITarget(player, createCard.action('freeze'));
            
            expect(target).toBeNull();
        });

        test('should handle extreme score scenarios', () => {
            const player = createTestPlayer();
            player.roundScore = 100; // Very high score
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(v => player.addCard(createCard.number(v)));
            
            aiPlayer.aiStay = jest.fn();
            
            aiPlayer.takeAITurn(player);
            
            expect(aiPlayer.aiStay).toHaveBeenCalled(); // Should stay with high score and risk
        });

        test('should handle decision with exactly threshold score', () => {
            const player = createTestPlayer();
            [3, 5, 7].forEach(v => player.addCard(createCard.number(v)));
            player.roundScore = 15; // Exactly at base threshold
            
            // The AI should make a decision (hit or stay) without throwing
            expect(() => aiPlayer.takeAITurn(player)).not.toThrow();
        });

        test('should handle players with identical scores for targeting', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { roundScore: 20 }),
                Object.assign(createTestPlayer('p2'), { roundScore: 20 }),
                Object.assign(createTestPlayer('p3'), { roundScore: 20 })
            ];
            
            const target = aiPlayer.selectFreezeTarget(players);
            
            expect(target.roundScore).toBe(20);
            expect(players).toContain(target);
        });

        test('should handle flip3 targeting with identical unique counts', () => {
            const players = [
                Object.assign(createTestPlayer('p1'), { uniqueNumbers: new Set([1, 2, 3]) }),
                Object.assign(createTestPlayer('p2'), { uniqueNumbers: new Set([4, 5, 6]) }),
                Object.assign(createTestPlayer('p3'), { uniqueNumbers: new Set([7, 8, 9]) })
            ];
            
            const target = aiPlayer.selectFlip3Target(players);
            
            expect(target.uniqueNumbers.size).toBe(3);
            expect(players).toContain(target);
        });
    });

    describe('Event Integration', () => {
        test('should respond to AI turn requested event', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            aiPlayer.takeAITurn = jest.fn();
            
            // Simulate the event emission
            mockEventBus.emit('ai:turnRequested', { player: player });
            
            expect(aiPlayer.takeAITurn).toHaveBeenCalledWith(player);
        });

        test('should emit proper events during actions', () => {
            const player = createTestPlayer('ai-test', 'AI Test', false);
            
            aiPlayer.aiHit(player);
            aiPlayer.aiStay(player);
            
            const emissions = mockEventBus.getEmissions();
            const hitEvent = emissions.find(e => e.event === 'ai:actionTaken' && e.data.action === 'hit');
            const stayEvent = emissions.find(e => e.event === 'ai:actionTaken' && e.data.action === 'stay');
            
            expect(hitEvent).toBeDefined();
            expect(stayEvent).toBeDefined();
        });
    });
});