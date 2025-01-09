const socketIo = require('socket.io');

class WebSocketService {
    constructor() {
        this.io = null;
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.setupEventHandlers();
        return this.io;
    }

    setupEventHandlers() {
        this.io.on('connect', (socket) => {
            console.log('Client connected');

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });
    }

    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    getIO() {
        return this.io;
    }
}

module.exports = new WebSocketService();
