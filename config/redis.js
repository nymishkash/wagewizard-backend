const Redis = require("ioredis");

const redisClient = new Redis({
    host: "127.0.0.1",
    port: 6379,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redisClient.on("error", (error) => {
    console.error("Redis Client Error:", error);
});
redisClient.on("connect", () => {
    console.log("Successfully connected to Redis");
});

const CHANNEL_NAME = "ww_events";

const eventService = {
    publish: async (eventType, data) => {
        try {
            const message = JSON.stringify({ eventType, data });
            console.log(`Publishing event: ${message}`);
            await redisClient.publish(CHANNEL_NAME, message);
            console.log("Event published successfully");
        } catch (error) {
            console.error("Error publishing event:", error);
        }
    },

    subscribe: (callback) => {
        const subscriber = redisClient.duplicate();

        subscriber.subscribe(CHANNEL_NAME, (err) => {
            if (err) {
                console.error("Failed to subscribe:", err);
                return;
            }
            console.log("Subscribed to", CHANNEL_NAME);
        });

        subscriber.on("message", (channel, message) => {
            console.log(`Received message from channel ${channel}:`, message);
            try {
                const { eventType, data } = JSON.parse(message);
                callback(eventType, data);
            } catch (error) {
                console.error("Error processing message:", error);
            }
        });

        return subscriber;
    },
};

module.exports = eventService;
