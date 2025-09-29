const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const schedulerService = require('./services/schedulerService');

// Import routes
const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const notificationsRoutes = require('./routes/notifications');
const lineRoutes = require('./routes/line');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['chrome-extension://*'] 
        : ['http://localhost:3000', 'chrome-extension://*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/line', lineRoutes);

// Admin routes (optional)
app.get('/api/admin/status', async (req, res) => {
    try {
        const schedulerStatus = schedulerService.getStatus();
        res.json({
            success: true,
            scheduler: schedulerStatus,
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Manual scheduler control (admin only)
app.post('/api/admin/scheduler/start', async (req, res) => {
    try {
        schedulerService.start();
        res.json({
            success: true,
            message: 'Scheduler started'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start scheduler'
        });
    }
});

app.post('/api/admin/scheduler/stop', async (req, res) => {
    try {
        schedulerService.stop();
        res.json({
            success: true,
            message: 'Scheduler stopped'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop scheduler'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
let server;
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();
        
        // Start the server (bind to HOST so it can accept external connections)
        server = app.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on ${HOST}:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            const publicHost = process.env.PUBLIC_HOST || HOST;
            console.log(`🔗 Health check: http://${publicHost}:${PORT}/health`);
        });

        // Start the scheduler
        schedulerService.start();

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    schedulerService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    schedulerService.stop();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
