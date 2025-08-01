import jwt from 'jsonwebtoken';
import { 
    UserTokenPayload, 
    SystemTokenPayload, 
    JWTPayload, 
    JWTOptions, 
    DecodedToken,
    DecodedUserToken,
    DecodedSystemToken,
    isUserToken,
    isSystemToken
} from '../interfaces';
import { ENV } from '../config/constants';
import HttpError from './httpError';

/**
 * 🔐 Simplified Token Utilities
 * JWT token management for frontend user tokens and internal system tokens
 */

/**
 * Generate JWT token
 * @param payload - Data to encode in the JWT
 * @param options - JWT options (expiry, issuer, etc.)
 * @returns Signed JWT token string
 */
export const generateJWT = (
    payload: JWTPayload,
    options: JWTOptions = {}
): string => {
    if (!ENV.JWT.SECRET) {
        throw HttpError.internalServerError('JWT secret not configured');
    }

    const finalOptions: JWTOptions = {
        expiresIn: ENV.JWT.EXPIRES_IN || '1h',
        algorithm: 'HS256',
        ...options,
    };

    try {
        return jwt.sign(payload, ENV.JWT.SECRET, finalOptions);
    } catch (error) {
        throw HttpError.internalServerError('Failed to generate JWT token');
    }
};

/**
 * 👤 Generate User Token (for frontend React app)
 * @param payload - User data to encode
 * @returns User token string
 */
export const generateUserToken = (payload: UserTokenPayload): string => {
    return generateJWT(payload, {
        expiresIn: ENV.JWT.EXPIRES_IN || '1h',
    });
};

/**
 * 🔧 Generate System Token (for service-to-service communication)
 * @param serviceName - Name of the service
 * @returns System token string
 */
export const generateSystemToken = (serviceName: string): string => {
    const systemPayload: SystemTokenPayload = {
        system: true,
        service: serviceName,
    };

    return generateJWT(systemPayload, {
        expiresIn: '24h', // Long-lived for services
    });
};

/**
 * Validate and decode JWT token
 * @param token - JWT token to validate
 * @returns Decoded token payload
 */
export const validateToken = (token: string): DecodedToken => {
    if (!ENV.JWT.SECRET) {
        throw HttpError.internalServerError('JWT secret not configured');
    }

    if (!token?.trim()) {
        throw HttpError.unauthorized('Token is required');
    }

    try {
        const decoded = jwt.verify(token, ENV.JWT.SECRET) as DecodedToken;
        
        // Validate token structure
        if (!isUserToken(decoded) && !isSystemToken(decoded)) {
            throw HttpError.unauthorized('Invalid token structure');
        }
        
        return decoded;
    } catch (error) {
        const jwtError = error as jwt.JsonWebTokenError;

        if (jwtError.name === 'TokenExpiredError') {
            throw HttpError.unauthorized('Token has expired');
        } else if (jwtError.name === 'JsonWebTokenError') {
            throw HttpError.unauthorized('Malformed token');
        } else if (jwtError.name === 'NotBeforeError') {
            throw HttpError.unauthorized('Token not active yet');
        }

        throw HttpError.unauthorized('Invalid token');
    }
};

/**
 * ✅ Validate User Token specifically
 * @param token - User token to validate
 * @returns Decoded user token payload
 */
export const validateUserToken = (token: string): DecodedUserToken => {
    const decoded = validateToken(token);
    
    if (!isUserToken(decoded)) {
        throw HttpError.unauthorized('Invalid token type - user token required');
    }
    
    // Ensure userId field is present
    if (!decoded.userId) {
        throw HttpError.unauthorized('Token missing required userId field');
    }
    
    return decoded;
};

/**
 * 🔧 Validate System Token specifically
 * @param token - System token to validate
 * @returns Decoded system token payload
 */
export const validateSystemToken = (token: string): DecodedSystemToken => {
    const decoded = validateToken(token);
    
    if (!isSystemToken(decoded)) {
        throw HttpError.unauthorized('Invalid token type - system token required');
    }
    
    return decoded;
};

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Extracted token or null
 */
export const extractToken = (authHeader: string): string | null => {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.slice(7).trim();
    return token || null;
};

/**
 * Check if token is expired
 * @param token - JWT token to check
 * @returns True if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = jwt.decode(token) as DecodedToken;
        if (!decoded?.exp) return true;
        
        return decoded.exp < Math.floor(Date.now() / 1000);
    } catch {
        return true;
    }
};

/**
 * Extract Bearer token from Express request (helper for route handlers)
 * @param req - Express request object
 * @returns Extracted token or undefined
 */
export const extractTokenFromRequest = (req: any): string | undefined => {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return undefined;
};

/**
 * Add Bearer token to request headers (for API clients)
 * @param headers - Existing headers object
 * @param token - Token to add
 * @returns Headers with Authorization bearer token
 */
export const addBearerToken = (
    headers: Record<string, string> = {},
    token: string
): Record<string, string> => {
    return {
        ...headers,
        Authorization: `Bearer ${token}`
    };
};

/**
 * Decode JWT token without verification
 * @param token - JWT token to decode
 * @returns Decoded token payload or null
 */
export const decodeJWT = (token: string): DecodedToken | null => {
    try {
        return jwt.decode(token) as DecodedToken;
    } catch {
        return null;
    }
};