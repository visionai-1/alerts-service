import { Request, Response, NextFunction } from 'express';
import { 
    extractToken, 
    validateToken,
    validateUserToken, 
    validateSystemToken, 
    isTokenExpired, 
    decodeJWT 
} from '../utils/token';
import { DecodedUserToken, DecodedSystemToken, isUserToken, isSystemToken } from '../interfaces';
import HttpError from '../utils/httpError';

/**
 * 🔐 Simplified Authentication Middlewares
 * Support for frontend user tokens and internal system tokens
 */

// Extend Request interface to include auth data
declare global {
    namespace Express {
        interface Request {
            authUser?: DecodedUserToken;
            authSystem?: DecodedSystemToken;
            authToken?: string;
            tokenType?: 'user' | 'system';
        }
    }
}

/**
 * Extract token from multiple sources (header, query, cookies)
 */
const extractTokenFromRequest = (req: Request): string | null => {
    // Try Authorization header first (recommended for access tokens)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = extractToken(authHeader);
        if (token) return token;
    }

    // Try query parameter (for refresh token endpoints)
    const queryToken = req.query.token as string;
    if (queryToken && typeof queryToken === 'string') {
        return queryToken;
    }

    // Try cookies (secure storage for refresh tokens)
    const cookieToken = req.cookies?.token;
    if (cookieToken && typeof cookieToken === 'string') {
        return cookieToken;
    }

    return null;
};

/**
 * 👤 User Token Authentication Middleware
 * Validates frontend user tokens (React app)
 * Use for: User-facing API endpoints
 */
export const requireUserAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('User authentication token required');
        }

        // Validate as user token
        const decoded = validateUserToken(token);
        
        // Add user info to request object
        req.authUser = decoded;
        req.authToken = token;
        req.tokenType = 'user';
        
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Invalid user token').sendError(res);
        }
    }
};

/**
 * 🔧 System Token Authentication Middleware
 * Validates internal system tokens (service-to-service)
 * Use for: Internal API endpoints like /alerts/:id/evaluate
 */
export const requireSystemAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('System authentication token required');
        }

        // Validate as system token
        const decoded = validateSystemToken(token);
        
        // Add system info to request object
        req.authSystem = decoded;
        req.authToken = token;
        req.tokenType = 'system';
        
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Invalid system token').sendError(res);
        }
    }
};

/**
 * 🔓 Optional User Token Middleware
 * Adds user data if user token is present and valid
 * Use for: Public endpoints that benefit from user context
 */
export const optionalUserAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (token && !isTokenExpired(token)) {
            try {
                const decoded = validateUserToken(token);
                req.authUser = decoded;
                req.authToken = token;
                req.tokenType = 'user';
            } catch {
                // Invalid token, but it's optional so we continue without user
            }
        }
        
        next();
    } catch {
        // Any error in optional auth should not stop the request
        next();
    }
};

/**
 * 🔐 General Authentication Middleware
 * Accepts both user and system tokens
 * Use for: Endpoints that can be accessed by both frontend users and internal services
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('Authentication token required');
        }

        // Check if token is expired before validation
        if (isTokenExpired(token)) {
            throw HttpError.unauthorized('Token has expired');
        }

        // Validate token and determine type
        const decoded = validateToken(token);
        
        if (isUserToken(decoded)) {
            req.authUser = decoded;
            req.tokenType = 'user';
        } else if (isSystemToken(decoded)) {
            req.authSystem = decoded;
            req.tokenType = 'system';
        } else {
            throw HttpError.unauthorized('Invalid token type');
        }
        
        req.authToken = token;
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Authentication failed').sendError(res);
        }
    }
};

/**
 * 👤 Get User Helper
 * Extract user from request (for use in controllers)
 */
export const getUser = (req: Request): DecodedUserToken | null => {
    return req.authUser || null;
};

/**
 * 🔧 Get System Helper
 * Extract system info from request (for use in controllers)
 */
export const getSystem = (req: Request): DecodedSystemToken | null => {
    return req.authSystem || null;
};

/**
 * 🔍 Get Token Helper
 * Extract token from request (for use in controllers)
 */
export const getToken = (req: Request): string | null => {
    return req.authToken || null;
};

/**
 * 🏷️ Get Token Type Helper
 * Get the type of token used in the request
 */
export const getTokenType = (req: Request): 'user' | 'system' | null => {
    return req.tokenType || null;
};

/**
 * ✅ Check if request has user token
 */
export const hasUserToken = (req: Request): boolean => {
    return req.tokenType === 'user';
};

/**
 * 🔧 Check if request has system token
 */
export const hasSystemToken = (req: Request): boolean => {
    return req.tokenType === 'system';
};

/**
 * ⚠️ Token Expiry Check Middleware
 * Warns if token expires soon (useful for frontend to refresh)
 */
export const checkTokenExpiry = (thresholdMinutes: number = 15) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if ((req.authUser || req.authSystem) && req.authToken) {
            const decoded = decodeJWT(req.authToken);
            if (decoded && decoded.exp) {
                const currentTime = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = decoded.exp - currentTime;
                const thresholdSeconds = thresholdMinutes * 60;
                
                if (timeUntilExpiry <= thresholdSeconds) {
                    res.setHeader('X-Token-Expiry-Warning', 'true');
                    res.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
                    res.setHeader('X-Token-Type', req.tokenType || 'unknown');
                }
            }
        }
        next();
    };
};
