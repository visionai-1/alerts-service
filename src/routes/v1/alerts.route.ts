import express from 'express';
import { CreateAlertRequest, AlertResponse, BulkUpdateResponse } from '../../interfaces/weather';
import { alertSchema, alertUpdateSchema, alertQuerySchema, alertParamsSchema, alertBulkUpdateSchema } from '../../schemas/alertSchemas';
import { validateJoi } from '../../middlewares/validations';
import { Alert } from '../../models/Alert';
import HttpError from '../../utils/httpError';
import { Logging } from '../../utils/logging';


/**
 * 🚨 Weather Alerts Routes
 * Simple CRUD operations for weather alert management using MongoDB
 */

const router = express.Router();

/**
 * POST /api/v1/alerts
 * Create a new weather alert
 */
router.post('/', validateJoi({ body: alertSchema }), async (req, res, next) => {
    try {
        Logging.info('Creating new alert in database');
        const alertData: CreateAlertRequest = req.body;
        
        // Create new alert using mongoose model
        const newAlert = new Alert(alertData);
        await newAlert.save();

        const response: AlertResponse = {
            success: true,
            data: newAlert.toObject(),
            message: 'Weather alert created successfully'
        };

        Logging.info("Sending response from create alert route");
        res.status(201).json(response);
    } catch (error) {
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err: any) => err.message);
            throw HttpError.badRequest(`Validation failed: ${errorMessages.join(', ')}`);
        }
        next(error);
    }
});

/**
 * GET /api/v1/alerts
 * Retrieve weather alerts with optional filtering and pagination
 */
router.get('/', validateJoi({ query: alertQuerySchema }), async (req, res, next) => {
    try {
        Logging.info("Fetching alerts from database");
        const { type, parameter, limit, page, sortBy, sortOrder } = req.query;
        
        // Build query filters
        const query: any = {};
        if (type) query.type = type;
        if (parameter) query.parameter = parameter;
        
        // Calculate skip for pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sort: any = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
        
        // Execute query with pagination
        const alerts = await Alert.find(query)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        
        // Get total count for pagination
        const total = await Alert.countDocuments(query);
        
        const response: AlertResponse = {
            success: true,
            data: alerts,
            message: `Retrieved ${alerts.length} alerts`
        };
        
        // Add pagination metadata
        (response as any).pagination = {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
        };

        Logging.info("Sending response from get alerts route");
        res.json(response);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/alerts/:id
 * Retrieve a specific weather alert by ID
 */
router.get('/:id', validateJoi({ params: alertParamsSchema }), async (req, res, next) => {
    try {
        Logging.info("Fetching alert by ID from database");
        const { id } = req.params;
        
        const alert = await Alert.findById(id).lean();
        
        if (!alert) {
            throw HttpError.notFound(`Alert with ID ${id} not found`);
        }

        const response: AlertResponse = {
            success: true,
            data: alert
        };

        Logging.info("Sending response from get alert by id route");
        res.json(response);
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            throw HttpError.badRequest('Invalid alert ID format');
        }
        next(error);
    }
});

/**
 * PUT /api/v1/alerts/:id
 * Update a weather alert
 */
router.put('/:id', validateJoi({ params: alertParamsSchema, body: alertUpdateSchema }), async (req, res, next) => {
    try {
        Logging.info("Updating alert in database");
        const { id } = req.params;
        const updateData = req.body;
        
        const updatedAlert = await Alert.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean();
        
        if (!updatedAlert) {
            throw HttpError.notFound(`Alert with ID ${id} not found`);
        }

        const response: AlertResponse = {
            success: true,
            data: updatedAlert,
            message: 'Alert updated successfully'
        };

        Logging.info("Sending response from update alert route");
        res.json(response);
    } catch (error) {
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err: any) => err.message);
            throw HttpError.badRequest(`Validation failed: ${errorMessages.join(', ')}`);
        }
        if (error.name === 'CastError') {
            throw HttpError.badRequest('Invalid alert ID format');
        }
        next(error);
    }
});

/**
 * DELETE /api/v1/alerts/:id
 * Delete a weather alert
 */
router.delete('/:id', validateJoi({ params: alertParamsSchema }), async (req, res, next) => {
    try {
        Logging.info("Deleting alert from database");
        const { id } = req.params;
        
        const deletedAlert = await Alert.findByIdAndDelete(id).lean();
        
        if (!deletedAlert) {
            throw HttpError.notFound(`Alert with ID ${id} not found`);
        }

        const response: AlertResponse = {
            success: true,
            data: deletedAlert,
            message: 'Alert deleted successfully'
        };

        Logging.info("Sending response from delete alert route");
        res.json(response);
    } catch (error) {
        // Handle invalid ObjectId format
        if (error.name === 'CastError') {
            throw HttpError.badRequest('Invalid alert ID format');
        }
        next(error);
    }
});

/**
 * PUT /api/v1/alerts/bulk-update
 * Update multiple alerts at once using updateMany
 * Best practices: atomic operations, proper filtering, transaction-like behavior
 */
router.patch('/bulk-update', validateJoi({ body: alertBulkUpdateSchema }), async (req, res, next) => {
    try {
        Logging.info("Starting bulk update operation");
        const { filter, update } = req.body;
        
        // Build MongoDB filter query
        const mongoFilter: any = {};
        
        // Filter by specific IDs
        if (filter.ids && filter.ids.length > 0) {
            mongoFilter._id = { $in: filter.ids };
        }
        
        // Filter by alert type
        if (filter.type) {
            mongoFilter.type = filter.type;
        }
        
        // Filter by parameter
        if (filter.parameter) {
            mongoFilter.parameter = filter.parameter;
        }
        
        // Prepare update data with automatic timestamp
        const updateData = {
            ...update,
            lastEvaluated: update.lastEvaluated || new Date(),
            updatedAt: new Date()
        };
        
        Logging.info(`Executing bulk update with filter: ${JSON.stringify(mongoFilter)}`);
        
        // Use updateMany for atomic bulk update with best practices
        const result = await Alert.updateMany(
            mongoFilter,
            { $set: updateData },
            { 
                runValidators: true,  // Run schema validation
                upsert: false,        // Don't create new documents
                multi: true           // Update multiple documents
            }
        );
        
        // Check if any documents were found
        if (result.matchedCount === 0) {
            throw HttpError.notFound('No alerts found matching the specified criteria'); 
        }
        
        // Prepare response with detailed results
        const response: BulkUpdateResponse = {
            success: true,
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                acknowledged: result.acknowledged,
                filter: filter,
                update: updateData
            },
            message: `Bulk update completed: ${result.modifiedCount} of ${result.matchedCount} alerts updated`
        };
        
        Logging.info(`Bulk update completed: ${result.modifiedCount}/${result.matchedCount} alerts updated`);
        res.json(response);
        
    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map((err: any) => err.message);
            throw HttpError.badRequest(`Bulk update validation failed: ${errorMessages.join(', ')}`);
        }
        
        // Handle cast errors (invalid ObjectId in filter)
        if (error.name === 'CastError') {
            throw HttpError.badRequest('Invalid ObjectId format in filter criteria');
        }
        
        next(error);
    }
});

export { router as alertsRouter };
