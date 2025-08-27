# Flip 7 Game - Unit Tests

Comprehensive unit test suite for the modular Flip 7 card game system.

## Overview

This test suite provides extensive coverage of the game logic, focusing on edge cases and critical game mechanics. The tests are designed to work with the modular architecture and use Jest as the testing framework.

## Test Structure

### Core Test Files
- **`Player.test.js`** - Tests for Player class logic, card management, scoring, and state management
- **`ScoringEngine.test.js`** - Tests for scoring calculations, modifiers, Flip 7 bonuses, and winner determination
- **`GameEngine.test.js`** - Tests for game flow, turn management, round progression, and game state
- **`AIPlayer.test.js`** - Tests for AI decision making, risk calculation, and targeting logic
- **`DeckManager.test.js`** - Tests for deck creation, shuffling, card drawing, and reshuffle mechanics

### Utility Files
- **`utils/TestUtils.js`** - Helper functions for creating test data, scenarios, and mock objects
- **`jest.setup.js`** - Jest configuration, global mocks, and custom matchers
- **`package.json`** - Test dependencies and Jest configuration
- **`.babelrc`** - Babel configuration for ES6 module support

## Running Tests

### Prerequisites
```bash
cd tests/
npm install
```

### Test Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

## Test Coverage

### Player Class Tests
- **Constructor & Initialization**: Default values, human vs AI players
- **Card Management**: Adding cards, sorting, duplicate detection
- **Flip 7 Logic**: Exactly 7 unique numbers detection
- **Scoring**: Real-time score calculation with modifiers
- **State Management**: Bust, stay, freeze, second chance mechanics
- **Serialization**: State save/restore functionality
- **Edge Cases**: Invalid cards, maximum unique numbers, empty states

### ScoringEngine Tests
- **Basic Scoring**: Number card summation
- **Modifier Logic**: x2 multipliers, bonus points, application order
- **Flip 7 Bonus**: 15-point bonus for exactly 7 unique numbers
- **Winner Detection**: Score thresholds, tie-breaking
- **Rankings**: Player sorting by score
- **Complex Scenarios**: Multiple modifiers, edge score values
- **Edge Cases**: Empty hands, extreme scores, negative modifiers

### GameEngine Tests
- **Game Initialization**: Player setup, default values
- **Game Flow**: Start game, start round, end round, end game
- **Turn Management**: Player progression, skipping inactive players
- **Card Drawing**: Handling different card types, duplicates, special actions
- **Round Logic**: End conditions (Flip 7, all players done)
- **Winner Logic**: Score threshold checking, game termination
- **Event Emissions**: Proper event broadcasting
- **Edge Cases**: Empty player lists, invalid indices, tied scores

### AIPlayer Tests
- **Decision Making**: Hit vs stay logic based on game state
- **Risk Calculation**: Unique card count, score, game situation
- **Aggressive Strategies**: Second chance, near Flip 7 scenarios
- **Targeting Logic**: Freeze and Flip 3 target selection
- **Special Scenarios**: High risk situations, calculated risks
- **Event Integration**: AI turn requests, action emissions
- **Edge Cases**: No valid targets, extreme scores, tie scenarios

### DeckManager Tests
- **Deck Creation**: Correct card distribution, unique IDs
- **Shuffling**: Randomization, maintaining card integrity
- **Card Drawing**: Deck management, empty deck handling
- **Reshuffle Logic**: Discard pile management, automatic reshuffling
- **Round Preparation**: Ensuring sufficient cards
- **Statistics**: Deck composition, cards dealt tracking
- **Edge Cases**: Empty decks, massive discard piles, extreme drawing

## Test Utilities

### Helper Functions
- **`createTestPlayer()`** - Create players with specific configurations
- **`createCard.*`** - Create cards of all types (number, modifier, action)
- **`createFlip7Cards()`** - Generate exactly 7 unique number cards
- **`scoringScenarios.*`** - Pre-built scenarios for scoring tests
- **`aiScenarios.*`** - AI decision-making test scenarios
- **`createMockEventBus()`** - Mock event system for isolated testing

### Custom Matchers
- **`toBeValidCard()`** - Verify card object structure
- **`toBeValidPlayer()`** - Verify player object structure
- **`toHaveUniqueNumbers(count)`** - Check player's unique number count

### Mock Objects
- **EventBus**: Mock event emission and listening
- **DOM Elements**: Mock browser APIs for UI testing
- **Random Numbers**: Predictable randomization for consistent tests
- **Timers**: Immediate execution for synchronous testing

## Edge Cases Covered

### Player Edge Cases
- Adding duplicate number cards with/without second chance
- Achieving Flip 7 with different number combinations
- Score calculation with multiple x2 modifiers
- State management with complex card combinations
- Serialization with edge values

### Scoring Edge Cases
- Zero score scenarios (busted players, empty hands)
- Maximum possible scores with all high cards
- Flip 7 bonus interaction with modifiers
- Multiple modifier precedence (x2 before bonus points)
- Negative modifier handling

### Game Flow Edge Cases
- All players bust simultaneously
- Multiple players achieve Flip 7
- Game end with tied scores
- Empty player lists in turn management
- Dealer rotation at maximum index

### AI Decision Edge Cases
- No valid targets for special actions
- Identical player scores for targeting
- Extreme risk scenarios (many unique cards, high scores)
- Decision making with no cards
- Targeting with identical unique card counts

### Deck Edge Cases
- Drawing all cards from deck
- Empty deck with empty discard pile
- Massive discard pile reshuffling
- Extreme card drawing scenarios
- Card distribution verification

## Integration Testing

While these are primarily unit tests, they also verify:
- Module communication through event system
- Proper state synchronization between modules
- Correct data flow in game scenarios
- Event emission timing and data

## Performance Considerations

- Tests use mocked timers for immediate execution
- Large datasets tested (full deck scenarios, many players)
- Memory leak detection through proper cleanup
- Randomization testing with multiple seeds

## Debugging Tests

### Common Issues
- **Module Import Errors**: Ensure ES6 module support is configured
- **Mock Setup**: Verify global mocks are properly initialized
- **Async Operations**: Use proper async/await or mock timers
- **Event Emissions**: Check that events are emitted with correct data

### Debug Helpers
```javascript
// In tests, access mock emissions:
const emissions = mockEventBus.getEmissions();
console.log('Events emitted:', emissions);

// Check last emission:
const lastEvent = mockEventBus.getLastEmission();
console.log('Last event:', lastEvent);

// Reset for clean testing:
mockEventBus.clearEmissions();
```

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Include both success and failure scenarios
3. Test edge cases and boundary conditions
4. Use descriptive test names that explain the scenario
5. Group related tests in `describe` blocks
6. Add comments for complex test scenarios
7. Verify all code paths are covered
8. Update this README with new test categories

## Coverage Goals

Target coverage levels:
- **Unit Tests**: 90%+ line coverage for core game logic
- **Edge Cases**: 100% coverage of identified edge conditions
- **Integration**: Key module interaction scenarios
- **Performance**: Large dataset and extreme scenario testing