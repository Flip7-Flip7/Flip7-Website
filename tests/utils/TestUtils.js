// TestUtils.js - Helper utilities for unit testing

/**
 * Create a test player with specific configuration
 */
export function createTestPlayer(id = 'test-player', name = 'Test Player', isHuman = false) {
    return {
        id,
        name,
        isHuman,
        totalScore: 0,
        roundScore: 0,
        numberCards: [],
        modifierCards: [],
        actionCards: [],
        uniqueNumbers: new Set(),
        status: 'active',
        hasSecondChance: false,
        isFrozen: false,
        
        // Mock methods for testing
        addCard(card) {
            if (card.type === 'number') {
                this.numberCards.push(card);
                this.uniqueNumbers.add(card.value);
                this.numberCards.sort((a, b) => a.value - b.value);
            } else if (card.type === 'modifier') {
                this.modifierCards.push(card);
            } else if (card.type === 'action') {
                if (card.value === 'second_chance' && !this.hasSecondChance) {
                    this.hasSecondChance = true;
                    this.actionCards.push(card);
                } else {
                    this.actionCards.push(card);
                }
            }
        },
        
        hasDuplicate(value) {
            return this.uniqueNumbers.has(value);
        },
        
        hasFlip7() {
            return this.uniqueNumbers.size === 7;
        },
        
        resetForNewRound() {
            this.roundScore = 0;
            this.numberCards = [];
            this.modifierCards = [];
            this.actionCards = [];
            this.uniqueNumbers.clear();
            this.status = 'active';
            this.hasSecondChance = false;
            this.isFrozen = false;
        },
        
        bust() {
            this.status = 'busted';
            this.roundScore = 0;
        },
        
        stay() {
            this.status = 'stayed';
        },
        
        freeze() {
            this.status = 'frozen';
            this.isFrozen = true;
        }
    };
}

/**
 * Create test cards of various types
 */
export const createCard = {
    number: (value, id = null) => ({
        type: 'number',
        value: value,
        display: value.toString(),
        id: id || `number_${value}_test`
    }),
    
    modifier: (value, id = null) => ({
        type: 'modifier',
        value: value,
        display: value === 'x2' ? 'x2' : `+${value}`,
        id: id || `modifier_${value}_test`
    }),
    
    action: (value, id = null) => ({
        type: 'action',
        value: value,
        display: value === 'second_chance' ? '2nd Chance' : 
                value === 'flip3' ? 'Flip 3' : 
                value.charAt(0).toUpperCase() + value.slice(1),
        id: id || `action_${value}_test`
    })
};

/**
 * Create a set of number cards for testing Flip 7
 */
export function createFlip7Cards() {
    return [0, 1, 2, 3, 4, 5, 6].map(value => createCard.number(value));
}

/**
 * Create a set of cards that would cause a bust (duplicate)
 */
export function createBustScenario(existingValue = 5) {
    return [
        createCard.number(existingValue),
        createCard.number(existingValue) // Duplicate
    ];
}

/**
 * Create test deck with specific card distribution
 */
export function createTestDeck(options = {}) {
    const {
        numberCards = 10,
        modifierCards = 5,
        actionCards = 3,
        shuffle = false
    } = options;
    
    const deck = [];
    
    // Add number cards (0 to numberCards-1)
    for (let i = 0; i < numberCards; i++) {
        deck.push(createCard.number(i));
    }
    
    // Add modifier cards
    for (let i = 0; i < modifierCards; i++) {
        const modType = i % 2 === 0 ? 'x2' : 2;
        deck.push(createCard.modifier(modType));
    }
    
    // Add action cards
    const actionTypes = ['freeze', 'flip3', 'second_chance'];
    for (let i = 0; i < actionCards; i++) {
        deck.push(createCard.action(actionTypes[i % actionTypes.length]));
    }
    
    if (shuffle) {
        // Simple shuffle for testing
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }
    
    return deck;
}

/**
 * Create game state for testing
 */
export function createTestGameState(options = {}) {
    const {
        players = 4,
        currentPlayerIndex = 0,
        roundNumber = 1,
        gameActive = true
    } = options;
    
    const testPlayers = [];
    for (let i = 0; i < players; i++) {
        testPlayers.push(createTestPlayer(
            i === 0 ? 'player' : `opponent${i}`,
            i === 0 ? 'Human Player' : `AI Bot ${i}`,
            i === 0
        ));
    }
    
    return {
        players: testPlayers,
        currentPlayerIndex,
        roundNumber,
        gameActive,
        isInitialDealing: false,
        dealerIndex: 0
    };
}

/**
 * Assert player has expected cards
 */
export function assertPlayerCards(player, expectedNumbers = [], expectedModifiers = [], expectedActions = []) {
    const actualNumbers = player.numberCards.map(card => card.value).sort((a, b) => a - b);
    const actualModifiers = player.modifierCards.map(card => card.value);
    const actualActions = player.actionCards.map(card => card.value);
    
    expect(actualNumbers).toEqual(expectedNumbers.sort((a, b) => a - b));
    expect(actualModifiers).toEqual(expect.arrayContaining(expectedModifiers));
    expect(actualActions).toEqual(expect.arrayContaining(expectedActions));
}

/**
 * Create specific scoring scenarios for testing
 */
export const scoringScenarios = {
    // Basic number cards only
    simple: (values = [1, 3, 5]) => ({
        numberCards: values.map(v => createCard.number(v)),
        modifierCards: [],
        uniqueNumbers: new Set(values),
        expectedScore: values.reduce((sum, v) => sum + v, 0)
    }),
    
    // With x2 modifier
    withX2: (values = [2, 4, 6]) => ({
        numberCards: values.map(v => createCard.number(v)),
        modifierCards: [createCard.modifier('x2')],
        uniqueNumbers: new Set(values),
        expectedScore: values.reduce((sum, v) => sum + v, 0) * 2
    }),
    
    // With bonus points
    withBonus: (values = [1, 2, 3], bonus = 5) => ({
        numberCards: values.map(v => createCard.number(v)),
        modifierCards: [createCard.modifier(bonus)],
        uniqueNumbers: new Set(values),
        expectedScore: values.reduce((sum, v) => sum + v, 0) + bonus
    }),
    
    // Flip 7 scenario
    flip7: () => ({
        numberCards: createFlip7Cards(),
        modifierCards: [],
        uniqueNumbers: new Set([0, 1, 2, 3, 4, 5, 6]),
        expectedScore: (0 + 1 + 2 + 3 + 4 + 5 + 6) + 15 // 21 + 15 = 36
    }),
    
    // Complex scenario: Flip 7 + x2 + bonus
    complex: () => ({
        numberCards: createFlip7Cards(),
        modifierCards: [createCard.modifier('x2'), createCard.modifier(3)],
        uniqueNumbers: new Set([0, 1, 2, 3, 4, 5, 6]),
        expectedScore: ((0 + 1 + 2 + 3 + 4 + 5 + 6) * 2) + 3 + 15 // (21 * 2) + 3 + 15 = 60
    }),
    
    // Busted player
    busted: () => ({
        numberCards: [],
        modifierCards: [],
        uniqueNumbers: new Set(),
        status: 'busted',
        expectedScore: 0
    })
};

/**
 * AI testing scenarios
 */
export const aiScenarios = {
    // AI with second chance should be aggressive
    withSecondChance: () => {
        const player = createTestPlayer('ai-test', 'AI Test', false);
        player.hasSecondChance = true;
        player.addCard(createCard.number(3));
        player.addCard(createCard.number(7));
        player.roundScore = 10;
        return { player, expectedAction: 'hit' };
    },
    
    // AI with 6 unique numbers should go for Flip 7
    nearFlip7: () => {
        const player = createTestPlayer('ai-test', 'AI Test', false);
        [1, 3, 5, 7, 9, 11].forEach(v => player.addCard(createCard.number(v)));
        player.roundScore = 36;
        return { player, expectedAction: 'hit' };
    },
    
    // AI with high score should stay
    highScore: () => {
        const player = createTestPlayer('ai-test', 'AI Test', false);
        [2, 4, 6, 8].forEach(v => player.addCard(createCard.number(v)));
        player.roundScore = 20;
        return { player, expectedAction: 'stay' };
    },
    
    // AI with many unique numbers but low score
    manyUniques: () => {
        const player = createTestPlayer('ai-test', 'AI Test', false);
        [0, 1, 2, 3, 4, 5, 7, 8].forEach(v => player.addCard(createCard.number(v)));
        player.roundScore = 30;
        return { player, expectedAction: 'stay' }; // High risk due to many uniques
    }
};

/**
 * Mock event bus for testing
 */
export function createMockEventBus() {
    const events = {};
    const emissions = [];
    
    return {
        on: jest.fn((event, handler) => {
            if (!events[event]) events[event] = [];
            events[event].push(handler);
        }),
        
        off: jest.fn((event, handler) => {
            if (events[event]) {
                events[event] = events[event].filter(h => h !== handler);
            }
        }),
        
        emit: jest.fn((event, data) => {
            emissions.push({ event, data, timestamp: Date.now() });
            if (events[event]) {
                events[event].forEach(handler => handler(data));
            }
        }),
        
        once: jest.fn((event, handler) => {
            const onceHandler = (data) => {
                handler(data);
                this.off(event, onceHandler);
            };
            this.on(event, onceHandler);
        }),
        
        // Test utilities
        getEmissions: () => emissions,
        getLastEmission: () => emissions[emissions.length - 1],
        clearEmissions: () => emissions.length = 0,
        getEventHandlers: (event) => events[event] || []
    };
}

export default {
    createTestPlayer,
    createCard,
    createFlip7Cards,
    createBustScenario,
    createTestDeck,
    createTestGameState,
    assertPlayerCards,
    scoringScenarios,
    aiScenarios,
    createMockEventBus
};