import Joi from 'joi';

/**
 * 🔍 Alert Validation Schemas
 * Joi validation schemas for weather alert endpoints
 */

// Location validation schema
export const locationSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).optional(),
    lon: Joi.number().min(-180).max(180).optional(),
    city: Joi.string().trim().min(1).max(100).optional(),
}).custom((value, helpers) => {
    // Either coordinates (lat + lon) or city must be provided
    const hasCoordinates = value.lat !== undefined && value.lon !== undefined;
    const hasCity = value.city !== undefined;
    
    if (!hasCoordinates && !hasCity) {
        return helpers.error('location.missing', { 
            message: 'Either coordinates (lat + lon) or city must be provided' 
        });
    }
    
    return value;
});

// Weather alert validation schema
export const alertSchema = Joi.object({
    type: Joi.string().valid('realtime', 'forecast').required()
        .messages({
            'any.only': 'Type must be either "realtime" or "forecast"'
        }),
    
    parameter: Joi.string().required()
        .valid(
            'temperature',
            'humidity', 
            'windSpeed',
            'windDirection',
            'precipitation.intensity',
            'precipitation.probability',
            'visibility',
            'uvIndex',
            'cloudCover',
            'pressure',
            'weatherCode'
        )
        .messages({
            'any.only': 'Parameter must be a valid weather parameter'
        }),
    
    operator: Joi.string().valid('>', '<', '>=', '<=', '==', '!=').required()
        .messages({
            'any.only': 'Operator must be one of: >, <, >=, <=, ==, !='
        }),
    
    threshold: Joi.number().required()
        .messages({
            'number.base': 'Threshold must be a number'
        }),
    
    location: locationSchema.required(),
    
    timestep: Joi.string().valid('1h', '1d').optional()
        .when('type', {
            is: 'forecast',
            then: Joi.required().messages({
                'any.required': 'Timestep is required for forecast alerts'
            }),
            otherwise: Joi.forbidden().messages({
                'any.unknown': 'Timestep is only allowed for forecast alerts'
            })
        }),
    
    name: Joi.string().trim().min(1).max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
});

// Alert update schema (partial alert without required fields)
export const alertUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    description: Joi.string().trim().max(500).optional(),
    threshold: Joi.number().optional(),
    operator: Joi.string().valid('>', '<', '>=', '<=', '==', '!=').optional(),
    // Don't allow updating type, parameter, location, timestep after creation
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Query parameters for listing alerts
export const alertQuerySchema = Joi.object({
    type: Joi.string().valid('realtime', 'forecast').optional(),
    parameter: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    page: Joi.number().integer().min(1).optional().default(1),
    sortBy: Joi.string().valid('createdAt', 'name', 'parameter').optional().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
});