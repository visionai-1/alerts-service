/**
 * 🌤️ Weather Data Interfaces
 * Simplified interfaces for Tomorrow.io API integration
 */

// Location interfaces
export interface Location {
    lat?: number;
    lon?: number;
    name?: string;
    country?: string;
}

export interface LocationQuery {
    lat?: number;
    lon?: number;
    city?: string;
}

export interface WeatherData {
    location: Location;
    timestamp?: Date | string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: {
        intensity: number;
        probability: number;
    };
    visibility: number;
    uvIndex?: number;
    cloudCover?: number;
    pressure?: number;
    weatherCode?: number;
    description?: string;
}

export interface ForecastData {
    location: Location;
    timestep: string;
    intervals: Array<{
        time: Date | string;
        temperature: number;
        humidity: number;
        windSpeed: number;
        windDirection: number;
        precipitation: {
            intensity: number;
            probability: number;
        };
        visibility: number;
        uvIndex: number;
        cloudCover: number;
        pressure: number;
        weatherCode: number;
        description: string;
    }>;
}

// Compact weather response format
export interface CompactWeatherData {
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    timestamp?: Date | string;
}

// API response interfaces
export interface WeatherResponse {
    success: boolean;
    data?: WeatherData | ForecastData | WeatherData[] | CompactWeatherData;
    message?: string;
}

export interface WeatherRequest {
    location: LocationQuery;
    units?: 'metric' | 'imperial';
    format?: 'full' | 'compact';
}

// Weather Alert interfaces
export interface WeatherAlert {
    _id?: string;
    type: 'realtime' | 'forecast';
    parameter: string; // e.g. 'temperature', 'precipitation.probability'
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    location: LocationQuery;
    timestep?: '1h' | '1d'; // only relevant for forecast
    name?: string;
    description?: string;
    createdAt?: Date;
    lastState?: 'triggered' | 'not_triggered';
}

export interface CreateAlertRequest {
    type: 'realtime' | 'forecast';
    parameter: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    location: LocationQuery;
    timestep?: '1h' | '1d';
    name?: string;
    description?: string;
}

export interface AlertResponse {
    success: boolean;
    data?: WeatherAlert | WeatherAlert[];
    message?: string;
} 