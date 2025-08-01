// ====================================
// 🌍 ENVIRONMENT CONSTANTS
// ====================================

import dotenv from 'dotenv';

// Load environment variables from .env file first
dotenv.config();

export const ENV = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3001,

    // Database Configuration
    MONGODB_URI: process.env.MONGODB_URI || `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`,
    MONGO_DB_USER: process.env.MONGO_DB_USER,
    MONGO_DB_PASSWORD: process.env.MONGO_DB_PASSWORD,
    MONGO_CLUSTER: process.env.MONGO_CLUSTER,
    MONGO_DATABASE: process.env.MONGO_DATABASE,


    // JWT Configuration
    JWT: {
        SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        SERVICE_EXPIRES_IN: process.env.JWT_SERVICE_EXPIRES_IN || '1h', // Shorter expiry for service tokens
    },

    // Service Configuration
    SERVICE: {
        NAME: process.env.SERVICE_NAME || 'alerts-service',
        VERSION: process.env.SERVICE_VERSION || '1.0.0',
        ENVIRONMENT: process.env.SERVICE_ENVIRONMENT || process.env.NODE_ENV || 'development',
    },
} as const;