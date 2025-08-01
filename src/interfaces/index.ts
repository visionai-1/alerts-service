// ====================================
// 🎯 SHARED INTERFACES
// ====================================

import { Algorithm } from 'jsonwebtoken';

/**
 * Standard API Error Interface
 * Used for consistent error handling across the application
 */
export interface ApiErrorInterface {
    title: string;
    detail: string;
    code: number;
    source?: {
        pointer?: string;
        parameter?: string;
    };
    meta?: Record<string, any>;
}

/**
 * Frontend User Token Payload
 * Token structure for frontend React application
 */
export interface UserTokenPayload {
    userId: string;
    role: string;
    [key: string]: any;
}

/**
 * Internal System Token Payload  
 * Token structure for service-to-service communication
 */
export interface SystemTokenPayload {
    system: true;
    service: string;
    [key: string]: any;
}

/**
 * Combined JWT Payload Interface
 * Union type for both user and system tokens
 */
export type JWTPayload = UserTokenPayload | SystemTokenPayload;

/**
 * JWT Options Interface
 * Configuration options for JWT token generation
 */
export interface JWTOptions {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
    subject?: string;
    algorithm?: Algorithm;
}

/**
 * Decoded User Token Interface
 * Represents a decoded frontend user JWT token
 */
export interface DecodedUserToken extends UserTokenPayload {
    iat: number;
    exp: number;
    iss?: string;
    aud?: string;
    sub?: string;
    jti?: string;
}

/**
 * Decoded System Token Interface
 * Represents a decoded internal system JWT token
 */
export interface DecodedSystemToken extends SystemTokenPayload {
    iat: number;
    exp: number;
    iss?: string;
    aud?: string;
    sub?: string;
    jti?: string;
}

/**
 * Decoded Token Interface
 * Union type for decoded tokens
 */
export type DecodedToken = DecodedUserToken | DecodedSystemToken;

/**
 * User Interface
 * Basic user data structure
 */
export interface User {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Simple Token Response Interface
 */
export interface TokenResponse {
    token: string;
    expiresIn: string;
}

/**
 * Type Guards for Token Validation
 */
export const isUserToken = (token: DecodedToken): token is DecodedUserToken => {
    return 'userId' in token && typeof token.userId === 'string';
};

export const isSystemToken = (token: DecodedToken): token is DecodedSystemToken => {
    return 'system' in token && token.system === true && 'service' in token;
};

/**
 * API Response Interface
 * Standard structure for API responses
 */
export interface ApiResponse<T = any> {
    data?: T;
    errors?: ApiErrorInterface[];
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        [key: string]: any;
    };
}

/**
 * Token Validation Result Interface
 */
export interface TokenValidationResult {
    isValid: boolean;
    decoded?: DecodedToken;
    error?: ApiErrorInterface;
}

/**
 * Pagination Interface
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Database Query Options Interface
 */
export interface QueryOptions extends PaginationOptions {
    filter?: Record<string, any>;
    populate?: string[];
    select?: string[];
}

// Re-export weather interfaces
export * from './weather'; 