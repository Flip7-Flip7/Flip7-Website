// EventBus.js - Central event system for decoupled communication

class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        this.events[eventName].push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.events[eventName].indexOf(callback);
            if (index > -1) {
                this.events[eventName].splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (data) => {
            unsubscribe();
            callback(data);
        });
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to event handlers
     */
    emit(eventName, data) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }

    /**
     * Remove all event listeners for a specific event
     * @param {string} eventName - Name of the event
     */
    off(eventName) {
        delete this.events[eventName];
    }

    /**
     * Remove all event listeners
     */
    clear() {
        this.events = {};
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Export for ES6 modules
export default eventBus;

// Also attach to window for backwards compatibility
window.gameEventBus = eventBus;