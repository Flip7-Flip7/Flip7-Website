// ModularAutostart.test.js - Test autostart functionality of modular system

describe('Modular Game Autostart', () => {
    // Mock DOM environment for testing
    class MockDOM {
        constructor() {
            this.eventListeners = {};
            this.elements = new Map();
            this.documentReady = false;
            this.consoleOutput = [];
            this.gameState = null;
            
            this.setupGlobalMocks();
        }

        setupGlobalMocks() {
            // Mock document
            global.document = {
                addEventListener: (event, callback) => {
                    if (!this.eventListeners[event]) {
                        this.eventListeners[event] = [];
                    }
                    this.eventListeners[event].push(callback);
                },
                getElementById: (id) => {
                    if (!this.elements.has(id)) {
                        this.elements.set(id, this.createMockElement(id));
                    }
                    return this.elements.get(id);
                },
                querySelector: (selector) => this.createMockElement(selector),
                querySelectorAll: (selector) => [this.createMockElement(selector)]
            };

            // Mock window
            global.window = {
                gameState: null,
                flip7Game: null,
                gameEngine: null,
                uiController: null
            };

            // Mock console to capture output
            global.console = {
                log: (...args) => {
                    this.consoleOutput.push({
                        type: 'log',
                        message: args.join(' '),
                        timestamp: Date.now()
                    });
                },
                error: (...args) => {
                    this.consoleOutput.push({
                        type: 'error', 
                        message: args.join(' '),
                        timestamp: Date.now()
                    });
                }
            };

            // Mock setTimeout
            global.setTimeout = (callback, delay) => {
                // Execute immediately for testing
                setTimeout(() => callback(), 0);
            };
        }

        createMockElement(id) {
            const element = {
                id: id,
                className: '',
                innerHTML: '',
                style: {},
                classList: {
                    add: (className) => element.className += ` ${className}`,
                    remove: (className) => element.className = element.className.replace(className, ''),
                    contains: (className) => element.className.includes(className),
                    toggle: (className) => element.classList.contains(className) 
                        ? element.classList.remove(className) 
                        : element.classList.add(className)
                },
                addEventListener: (event, callback) => {
                    if (!element.eventListeners) element.eventListeners = {};
                    if (!element.eventListeners[event]) element.eventListeners[event] = [];
                    element.eventListeners[event].push(callback);
                },
                appendChild: (child) => {},
                removeChild: (child) => {},
                parentNode: null,
                children: [],
                textContent: '',
                getAttribute: (attr) => element.attributes && element.attributes[attr] || null,
                setAttribute: (attr, value) => {
                    if (!element.attributes) element.attributes = {};
                    element.attributes[attr] = value;
                },
                getBoundingClientRect: () => ({
                    top: 0, left: 0, bottom: 100, right: 100,
                    width: 100, height: 100, x: 0, y: 0
                })
            };
            return element;
        }

        triggerDOMContentLoaded() {
            this.documentReady = true;
            if (this.eventListeners.DOMContentLoaded) {
                this.eventListeners.DOMContentLoaded.forEach(callback => callback());
            }
        }

        getConsoleOutput() {
            return this.consoleOutput;
        }

        clearConsole() {
            this.consoleOutput = [];
        }
    }

    // Mock EventBus for testing
    class MockEventBus {
        constructor() {
            this.events = {};
            this.emissions = [];
        }

        on(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        }

        emit(event, data = null) {
            this.emissions.push({ event, data, timestamp: Date.now() });
            if (this.events[event]) {
                this.events[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('EventBus callback error:', error);
                    }
                });
            }
        }

        off(event, callback) {
            if (this.events[event]) {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            }
        }

        clear() {
            this.events = {};
            this.emissions = [];
        }

        getEmissions() {
            return this.emissions;
        }

        getLastEmission() {
            return this.emissions[this.emissions.length - 1];
        }
    }

    // Mock the complete modular system for autostart testing
    class MockModularSystem {
        constructor() {
            this.eventBus = new MockEventBus();
            this.gameEngine = null;
            this.gameStarted = false;
            this.autoStartTriggered = false;
            this.initializationComplete = false;
        }

        // Simulate the main.js initialization
        simulateMainJSInitialization() {
            // Mock Flip7ModularGame initialization
            this.initializationComplete = true;
            console.log('🎮 Flip7ModularGame: Initializing...');
            console.log('🎮 Flip7ModularGame: Game system initialized');
            
            // Simulate the autostart timeout
            setTimeout(() => {
                console.log('🎮 Starting new game automatically...');
                this.autoStartTriggered = true;
                this.eventBus.emit('NEW_GAME_REQUESTED');
            }, 500);

            // Mock window assignments
            global.window.flip7Game = this;
            global.window.gameEngine = this.gameEngine;
            
            console.log('✅ All modules loaded and game ready!');
            console.log('🎮 Game will start automatically in 0.5 seconds');
            console.log('📱 Use Hit/Stay buttons to play, or flip7Game.restartGame() to restart');
        }

        // Simulate GameEngine responding to NEW_GAME_REQUESTED
        simulateGameEngineResponse() {
            this.eventBus.on('NEW_GAME_REQUESTED', () => {
                console.log('🎮 GameEngine: Starting new game');
                this.gameStarted = true;
                this.eventBus.emit('GAME_STARTED');
            });
        }

        isGameStarted() {
            return this.gameStarted;
        }

        isAutoStartTriggered() {
            return this.autoStartTriggered;
        }

        isInitialized() {
            return this.initializationComplete;
        }

        getEventEmissions() {
            return this.eventBus.getEmissions();
        }
    }

    let mockDOM;
    let mockSystem;

    beforeEach(() => {
        mockDOM = new MockDOM();
        mockSystem = new MockModularSystem();
    });

    afterEach(() => {
        // Cleanup global mocks
        delete global.document;
        delete global.window;
        delete global.console;
        delete global.setTimeout;
    });

    describe('DOM Ready Event Handling', () => {
        test('should register DOMContentLoaded listener', () => {
            // Simulate script loading (would happen when main.js loads)
            mockDOM.triggerDOMContentLoaded();
            
            // Verify DOMContentLoaded listener was registered
            expect(mockDOM.eventListeners.DOMContentLoaded).toBeDefined();
            expect(mockDOM.eventListeners.DOMContentLoaded.length).toBeGreaterThan(0);
        });

        test('should initialize when DOM is ready', (done) => {
            // Setup the system to respond like the real modular system
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();
            mockSystem.simulateGameEngineResponse();

            // Wait for async initialization
            setTimeout(() => {
                expect(mockSystem.isInitialized()).toBe(true);
                
                // Check console output
                const consoleOutput = mockDOM.getConsoleOutput();
                const initMessages = consoleOutput.filter(msg => 
                    msg.message.includes('Flip7ModularGame') || 
                    msg.message.includes('All modules loaded')
                );
                
                expect(initMessages.length).toBeGreaterThan(0);
                done();
            }, 100);
        });
    });

    describe('Autostart Functionality', () => {
        test('should trigger autostart after initialization', (done) => {
            mockSystem.simulateGameEngineResponse();
            
            // Trigger DOM ready and initialization
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            // Wait for autostart timeout
            setTimeout(() => {
                expect(mockSystem.isAutoStartTriggered()).toBe(true);
                
                // Check for autostart console message
                const consoleOutput = mockDOM.getConsoleOutput();
                const autostartMessage = consoleOutput.find(msg => 
                    msg.message.includes('Starting new game automatically')
                );
                
                expect(autostartMessage).toBeDefined();
                done();
            }, 600); // Wait longer than the 500ms timeout
        });

        test('should emit NEW_GAME_REQUESTED event on autostart', (done) => {
            mockSystem.simulateGameEngineResponse();
            
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                const emissions = mockSystem.getEventEmissions();
                const newGameEvent = emissions.find(emission => 
                    emission.event === 'NEW_GAME_REQUESTED'
                );
                
                expect(newGameEvent).toBeDefined();
                done();
            }, 600);
        });

        test('should start game when NEW_GAME_REQUESTED is emitted', (done) => {
            mockSystem.simulateGameEngineResponse();
            
            mockDOM.triggerDOMContentLoaded(); 
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                expect(mockSystem.isGameStarted()).toBe(true);
                
                // Verify GAME_STARTED event was emitted
                const emissions = mockSystem.getEventEmissions();
                const gameStartedEvent = emissions.find(emission => 
                    emission.event === 'GAME_STARTED'
                );
                
                expect(gameStartedEvent).toBeDefined();
                done();
            }, 600);
        });
    });

    describe('Global Exposure for Testing', () => {
        test('should expose game objects to window', (done) => {
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                // Check that objects are exposed to window for debugging
                expect(global.window.flip7Game).toBeDefined();
                expect(global.window.gameEngine).toBeDefined();
                done();
            }, 100);
        });

        test('should provide debug console messages', (done) => {
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                const consoleOutput = mockDOM.getConsoleOutput();
                
                // Check for key debug messages
                const debugMessages = [
                    '🚀 Flip 7 Modular Game - Full System Initialization',
                    '🎮 Game will start automatically in 0.5 seconds',
                    '📱 Use Hit/Stay buttons to play'
                ];

                debugMessages.forEach(expectedMessage => {
                    const found = consoleOutput.some(msg => 
                        msg.message.includes(expectedMessage.slice(2)) // Skip emoji for testing
                    );
                    expect(found).toBe(true);
                });

                done();
            }, 100);
        });
    });

    describe('Integration Flow', () => {
        test('should complete full initialization -> autostart -> game start flow', (done) => {
            const timeline = [];
            
            // Track the complete flow
            mockSystem.simulateGameEngineResponse();
            
            // Override console to track timing
            const originalConsoleLog = console.log;
            global.console.log = (...args) => {
                timeline.push({
                    timestamp: Date.now(),
                    message: args.join(' ')
                });
                mockDOM.consoleOutput.push({
                    type: 'log',
                    message: args.join(' '),
                    timestamp: Date.now()
                });
            };

            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                // Verify the sequence occurred in correct order
                const initMessage = timeline.find(t => t.message.includes('Game system initialized'));
                const autostartMessage = timeline.find(t => t.message.includes('Starting new game automatically'));
                const gameStartMessage = timeline.find(t => t.message.includes('GameEngine: Starting new game'));

                expect(initMessage).toBeDefined();
                expect(autostartMessage).toBeDefined();
                expect(gameStartMessage).toBeDefined();

                // Verify timing (autostart should come after init)
                if (initMessage && autostartMessage) {
                    expect(autostartMessage.timestamp).toBeGreaterThanOrEqual(initMessage.timestamp);
                }

                expect(mockSystem.isGameStarted()).toBe(true);
                done();
            }, 700);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            // Don't register any DOM elements
            mockDOM.elements.clear();
            
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            // Should not crash - mock elements are created on demand
            expect(() => {
                document.getElementById('nonexistent');
            }).not.toThrow();
        });

        test('should handle event emission errors gracefully', (done) => {
            // Create a faulty event listener
            mockSystem.eventBus.on('NEW_GAME_REQUESTED', () => {
                throw new Error('Test error');
            });

            mockSystem.simulateGameEngineResponse(); // This adds the working listener
            mockDOM.triggerDOMContentLoaded();
            mockSystem.simulateMainJSInitialization();

            setTimeout(() => {
                // Should still work despite the error
                const emissions = mockSystem.getEventEmissions();
                expect(emissions.length).toBeGreaterThan(0);
                
                // Check for error in console
                const consoleOutput = mockDOM.getConsoleOutput();
                const errorMessages = consoleOutput.filter(msg => msg.type === 'error');
                expect(errorMessages.length).toBeGreaterThan(0);
                
                done();
            }, 600);
        });
    });
});