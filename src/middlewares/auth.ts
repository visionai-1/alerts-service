import { Request, Response, NextFunction } from 'express';
import { 
    extractToken, 
    validateAccessToken, 
    validateRefreshToken, 
    isTokenExpired, 
    decodeJWT 
} from '../utils/token';
import { DecodedToken } from '../interfaces';
import HttpError from '../utils/httpError';

/**
 * 🔐 Authentication Middlewares
 * Clear separation of access tokens vs refresh tokens
 */

// Extend Request interface to include user data
declare global {
    namespace Express {
        interface Request {
            authUser?: DecodedToken;
            authToken?: string;
            tokenType?: 'access' | 'refresh';
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
 * 🎯 Access Token Authentication Middleware
 * Validates access tokens for API access (short-lived)
 * Use for: Protected API endpoints, user operations
 */
export const requireAccessToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('Access token required');
        }

        // Validate specifically as access token
        const decoded = validateAccessToken(token);
        
        // Add user info to request object
        req.authUser = decoded;
        req.authToken = token;
        req.tokenType = 'access';
        
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Invalid access token').sendError(res);
        }
    }
};

/**
 * 🔄 Refresh Token Authentication Middleware
 * Validates refresh tokens for token renewal (long-lived)
 * Use for: Token refresh endpoints only
 */
export const requireRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('Refresh token required');
        }

        // Validate specifically as refresh token
        const decoded = validateRefreshToken(token);
        
        // Add user info to request object
        req.authUser = decoded;
        req.authToken = token;
        req.tokenType = 'refresh';
        
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Invalid refresh token').sendError(res);
        }
    }
};

/**
 * 🔓 Optional Access Token Middleware
 * Adds user data if access token is present and valid
 * Use for: Public endpoints that benefit from user context
 */
export const optionalAccessToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (token && !isTokenExpired(token)) {
            try {
                const decoded = validateAccessToken(token);
                req.authUser = decoded;
                req.authToken = token;
                req.tokenType = 'access';
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
 * 🛡️ Legacy Authentication Middleware (backwards compatibility)
 * Accepts any valid token type
 * @deprecated Use requireAccessToken or requireRefreshToken instead
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

        // Try to validate as access token first, then refresh token
        let decoded: DecodedToken;
        try {
            decoded = validateAccessToken(token);
            req.tokenType = 'access';
        } catch {
            decoded = validateRefreshToken(token);
            req.tokenType = 'refresh';
        }
        
        // Add user info to request object
        req.authUser = decoded;
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
 * 🎭 Get User Helper
 * Extract user from request (for use in controllers)
 */
export const getUser = (req: Request): DecodedToken | null => {
    return req.authUser || null;
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
export const getTokenType = (req: Request): 'access' | 'refresh' | null => {
    return req.tokenType || null;
};

/**
 * ✅ Check if request has access token
 */
export const hasAccessToken = (req: Request): boolean => {
    return req.tokenType === 'access';
};

/**
 * 🔄 Check if request has refresh token
 */
export const hasRefreshToken = (req: Request): boolean => {
    return req.tokenType === 'refresh';
};

/**
 * ⚠️ Token Expiry Check Middleware
 * Warns if token expires soon (useful for frontend to refresh)
 */
export const checkTokenExpiry = (thresholdMinutes: number = 15) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.authUser && req.authToken) {
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
