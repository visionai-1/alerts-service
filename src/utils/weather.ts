/**
 * 🌤️ Shared Weather Utilities
 * Common logic and helpers for weather operations
 */

import { WeatherData, Location, LocationQuery } from '../interfaces/weather';

/**
 * Weather code descriptions mapping
 */
export const WEATHER_CODES: Record<number, string> = {
    0: 'Unknown',
    1000: 'Clear',
    1100: 'Mostly Clear',
    1101: 'Partly Cloudy',
    1102: 'Mostly Cloudy',
    1001: 'Cloudy',
    2000: 'Fog',
    2100: 'Light Fog',
    4000: 'Drizzle',
    4001: 'Rain',
    4200: 'Light Rain',
    4201: 'Heavy Rain',
    5000: 'Snow',
    5001: 'Flurries',
    5100: 'Light Snow',
    5101: 'Heavy Snow',
    6000: 'Freezing Drizzle',
    6001: 'Freezing Rain',
    6200: 'Light Freezing Rain',
    6201: 'Heavy Freezing Rain',
    7000: 'Ice Pellets',
    7101: 'Heavy Ice Pellets',
    7102: 'Light Ice Pellets',
    8000: 'Thunderstorm'
};

/**
 * Get weather description from weather code
 */
export const getWeatherDescription = (code: number): string => {
    return WEATHER_CODES[code] || 'Unknown';
};

/**
 * Validate coordinate ranges
 */
export const validateCoordinates = (lat: number, lon: number): boolean => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Validate location query
 */
export const validateLocationQuery = (location: LocationQuery): { isValid: boolean; error?: string } => {
    // Check if coordinates are provided
    if (location.lat !== undefined && location.lon !== undefined) {
        if (!validateCoordinates(location.lat, location.lon)) {
            return { isValid: false, error: 'Invalid coordinates: latitude must be -90 to 90, longitude must be -180 to 180' };
        }
        return { isValid: true };
    }

    // Check if city is provided
    if (location.city && typeof location.city === 'string' && location.city.trim().length > 0) {
        if (location.city.trim().length < 2) {
            return { isValid: false, error: 'City name must be at least 2 characters long' };
        }
        return { isValid: true };
    }

    return { isValid: false, error: 'Location must include either lat/lon coordinates or city name' };
};

/**
 * Normalize location name for consistent display
 */
export const normalizeLocationName = (location: Location): string => {
    if (location.name) {
        return location.country ? `${location.name}, ${location.country}` : location.name;
    }
    return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
};

/**
 * Format temperature with unit
 */
export const formatTemperature = (temp: number, unit: 'metric' | 'imperial' = 'metric'): string => {
    const symbol = unit === 'metric' ? '°C' : '°F';
    return `${Math.round(temp)}${symbol}`;
};

/**
 * Format wind speed with unit
 */
export const formatWindSpeed = (speed: number, unit: 'metric' | 'imperial' = 'metric'): string => {
    const unitSymbol = unit === 'metric' ? 'km/h' : 'mph';
    return `${Math.round(speed)} ${unitSymbol}`;
};

/**
 * Get wind direction name from degrees
 */
export const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
};

/**
 * Check if weather data is recent (within threshold)
 */
export const isWeatherDataRecent = (timestamp: Date, thresholdMinutes: number = 30): boolean => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= thresholdMinutes;
};

/**
 * Get weather condition category
 */
export const getWeatherCategory = (weatherCode: number): 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'unknown' => {
    if ([1000, 1100].includes(weatherCode)) return 'clear';
    if ([1101, 1102, 1001].includes(weatherCode)) return 'cloudy';
    if ([4000, 4001, 4200, 4201, 6000, 6001, 6200, 6201].includes(weatherCode)) return 'rain';
    if ([5000, 5001, 5100, 5101].includes(weatherCode)) return 'snow';
    if ([8000].includes(weatherCode)) return 'storm';
    if ([2000, 2100].includes(weatherCode)) return 'fog';
    return 'unknown';
};

/**
 * Sanitize weather data for consistent output
 */
export const sanitizeWeatherData = (data: WeatherData): WeatherData => {
    return {
        ...data,
        location: {
            ...data.location,
            lat: Number((data.location.lat ?? 0).toFixed(4)),
            lon: Number((data.location.lon ?? 0).toFixed(4)),
            name: data.location.name?.trim() || normalizeLocationName(data.location)
        },
        temperature: Number((data.temperature ?? 0).toFixed(1)),
        humidity: Number((data.humidity ?? 0).toFixed(1)),
        windSpeed: Number((data.windSpeed ?? 0).toFixed(1)),
        windDirection: Number((data.windDirection ?? 0).toFixed(0)),
        precipitation: {
            intensity: Number((data.precipitation.intensity ?? 0).toFixed(2)),
            probability: Number((data.precipitation.probability ?? 0).toFixed(0))
        },
        visibility: Number((data.visibility ?? 0).toFixed(1)),
        uvIndex: Number((data.uvIndex ?? 0).toFixed(1)),
        cloudCover: Number((data.cloudCover ?? 0).toFixed(0)),
        pressure: Number((data.pressure ?? 0).toFixed(1)),
        description: getWeatherDescription(data.weatherCode ?? 1000)
    };
};
