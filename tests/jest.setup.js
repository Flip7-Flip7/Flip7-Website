// jest.setup.js - Jest setup and global mocks

// Mock browser globals that aren't available in Node.js test environment
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock window.gameState
global.window = {
    gameState: {
        players: [],
        currentPlayerIndex: 0,
        roundNumber: 1,
        deck: [],
        isStartingNewRound: false
    },
    innerWidth: 1024,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock document methods
global.document = {
    getElementById: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false),
            toggle: jest.fn()
        },
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        style: {},
        textContent: '',
        innerHTML: ''
    })),
    createElement: jest.fn(() => ({
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        addEventListener: jest.fn(),
        appendChild: jest.fn()
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
};

// Mock Math.random for consistent testing
const originalRandom = Math.random;
let mockRandomValue = 0.5;

global.setMockRandom = (value) => {
    mockRandomValue = value;
};

global.restoreRandom = () => {
    Math.random = originalRandom;
};

// Set predictable random for most tests
Math.random = jest.fn(() => mockRandomValue);

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((callback, delay) => {
    // For testing, execute immediately
    if (typeof callback === 'function') {
        callback();
    }
    return 1;
});

global.clearTimeout = jest.fn();
global.setInterval = jest.fn((callback, delay) => 1);
global.clearInterval = jest.fn();

// Mock Date.now for consistent timestamps
global.Date.now = jest.fn(() => 1640995200000); // Fixed timestamp

// Utility function to reset all mocks
global.resetAllMocks = () => {
    jest.clearAllMocks();
    mockRandomValue = 0.5;
    
    // Reset window.gameState
    global.window.gameState = {
        players: [],
        currentPlayerIndex: 0,
        roundNumber: 1,
        deck: [],
        isStartingNewRound: false
    };
};

// Run before each test
beforeEach(() => {
    // Don't reset everything, just clear mock call history
    jest.clearAllMocks();
});

// Custom matchers for game-specific assertions
expect.extend({
    toBeValidCard(received) {
        const pass = received && 
                    typeof received.type === 'string' &&
                    (received.value !== undefined) &&
                    typeof received.display === 'string';
        
        if (pass) {
            return {
                message: () => `expected ${JSON.stringify(received)} not to be a valid card`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${JSON.stringify(received)} to be a valid card with type, value, and display properties`,
                pass: false
            };
        }
    },
    
    toBeValidPlayer(received) {
        const pass = received &&
                    typeof received.id === 'string' &&
                    typeof received.name === 'string' &&
                    typeof received.isHuman === 'boolean' &&
                    typeof received.totalScore === 'number' &&
                    typeof received.roundScore === 'number' &&
                    Array.isArray(received.numberCards) &&
                    Array.isArray(received.modifierCards) &&
                    Array.isArray(received.actionCards);
        
        if (pass) {
            return {
                message: () => `expected ${JSON.stringify(received)} not to be a valid player`,
                pass: true
            };
        } else {
            return {
                message: () => `expected object to be a valid player with required properties`,
                pass: false
            };
        }
    },
    
    toHaveUniqueNumbers(received, expected) {
        if (!received || !received.uniqueNumbers) {
            return {
                message: () => `expected player to have uniqueNumbers property`,
                pass: false
            };
        }
        
        const pass = received.uniqueNumbers.size === expected;
        
        if (pass) {
            return {
                message: () => `expected player not to have ${expected} unique numbers`,
                pass: true
            };
        } else {
            return {
                message: () => `expected player to have ${expected} unique numbers, but had ${received.uniqueNumbers.size}`,
                pass: false
            };
        }
    }
});

// Export for use in tests
module.exports = {
    resetAllMocks: global.resetAllMocks,
    setMockRandom: global.setMockRandom,
    restoreRandom: global.restoreRandom
};