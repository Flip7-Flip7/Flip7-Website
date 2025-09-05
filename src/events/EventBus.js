/**
 * EventBus - Central event system for module communication
 * Provides a decoupled way for modules to communicate without direct dependencies
 */
class EventBus {
    constructor() {
        this.events = {};
        this.debug = false; // Set to true for event logging
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {function} callback - Function to call when event is emitted
     * @param {object} context - Optional context for callback
     * @returns {function} Unsubscribe function
     */
    on(eventName, callback, context = null) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        const listener = { callback, context };
        this.events[eventName].push(listener);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }


    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {function} callback - Function to remove
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(
            listener => listener.callback !== callback
        );
        
        // Clean up empty event arrays
        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {...any} args - Arguments to pass to listeners
     */
    emit(eventName, ...args) {
        if (this.debug) {
            console.log(`[EventBus] Emitting: ${eventName}`, args);
        }
        
        if (!this.events[eventName]) return;
        
        // Create a copy to avoid issues if listeners modify the array
        const listeners = [...this.events[eventName]];
        
        listeners.forEach(listener => {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`[EventBus] Error in listener for ${eventName}:`, error);
            }
        });
    }

}

// Create singleton instance
const gameEventBus = new EventBus();

// Make available globally
window.EventBus = EventBus;
window.gameEventBus = gameEventBus;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}
