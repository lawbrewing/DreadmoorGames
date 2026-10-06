// js/core/events.js

class EventBus {
    constructor() {
        // A dictionary holding all event names and their corresponding listener functions
        this.listeners = {};
    }

    /**
     * SUBSCRIBE to an event (Tune into the radio frequency)
     * @param {string} eventName - The name of the event (e.g., 'PATRON_SERVED')
     * @param {function} callback - The function to run when the event happens
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * UNSUBSCRIBE from an event (Turn off the radio)
     * Useful for cleaning up UI elements when they are destroyed
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;

        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * BROADCAST an event (Shout over the radio)
     * @param {string} eventName - The name of the event
     * @param {object} data - Any information you want to pass (e.g., { tipAmount: 5 })
     */
    emit(eventName, data = {}) {
        if (!this.listeners[eventName]) return;

        // Loop through all subscribed functions and trigger them
        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                // Critical for game stability: If one listener crashes, it won't break the entire game loop
                console.error(`[EventBus] Error in listener for event '${eventName}':`, error);
            }
        });
    }
}

// Create a single global instance of the Event Bus that all other scripts will share
const gameEvents = new EventBus();