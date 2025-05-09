import { GOOGLE_MAPS_CONFIG } from '@/apiKeys';

interface ApiUsage {
  count: number;
  lastReset: number;
}

type ApiType = 'geocoding' | 'directions' | 'places' | 'javascript';

// Store API usage in localStorage (or memory if localStorage is not available)
class RateLimitManager {
  private storagePrefix = 'api_usage_';
  private inMemoryFallback: Record<string, ApiUsage> = {};
  private isLocalStorageAvailable: boolean;

  constructor() {
    // Check if localStorage is available
    this.isLocalStorageAvailable = typeof window !== 'undefined' && 
      typeof window.localStorage !== 'undefined';
    
    // Initialize or reset counts if needed
    this.checkAndResetDailyCounts();
  }

  /**
   * Get current usage for an API type
   */
  private getUsage(apiType: ApiType): ApiUsage {
    const key = `${this.storagePrefix}${apiType}`;
    
    try {
      if (this.isLocalStorageAvailable) {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
      } else {
        if (this.inMemoryFallback[key]) {
          return this.inMemoryFallback[key];
        }
      }
    } catch (error) {
      console.error('Error reading API usage data:', error);
    }
    
    // Default if not found
    return { count: 0, lastReset: Date.now() };
  }

  /**
   * Save usage for an API type
   */
  private saveUsage(apiType: ApiType, usage: ApiUsage): void {
    const key = `${this.storagePrefix}${apiType}`;
    
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, JSON.stringify(usage));
      } else {
        this.inMemoryFallback[key] = usage;
      }
    } catch (error) {
      console.error('Error saving API usage data:', error);
    }
  }

  /**
   * Check and reset API usage counts if a day has passed
   */
  private checkAndResetDailyCounts(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Check each API type
    ['geocoding', 'directions', 'places', 'javascript'].forEach(apiType => {
      const usage = this.getUsage(apiType as ApiType);
      
      // Reset if more than a day has passed since last reset
      if (now - usage.lastReset > oneDayMs) {
        this.saveUsage(apiType as ApiType, { count: 0, lastReset: now });
      }
    });
  }

  /**
   * Increment usage count for an API type
   * @returns true if under limit, false if limit exceeded
   */
  public incrementUsage(apiType: ApiType): boolean {
    // Skip check if rate limiting is disabled
    if (!GOOGLE_MAPS_CONFIG.rateLimit.enabled) {
      return true;
    }

    // Get current usage
    const usage = this.getUsage(apiType);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Reset if a day has passed
    if (now - usage.lastReset > oneDayMs) {
      this.saveUsage(apiType, { count: 1, lastReset: now });
      return true;
    }
    
    // Check if we're under the limit
    const limit = GOOGLE_MAPS_CONFIG.rateLimit.maxRequests[apiType];
    if (usage.count < limit) {
      // Increment the count
      usage.count += 1;
      this.saveUsage(apiType, usage);
      return true;
    }
    
    // Limit exceeded
    return false;
  }

  /**
   * Get percentage of API quota used
   */
  public getQuotaUsedPercentage(apiType: ApiType): number {
    const usage = this.getUsage(apiType);
    const limit = GOOGLE_MAPS_CONFIG.rateLimit.maxRequests[apiType];
    return Math.round((usage.count / limit) * 100);
  }
}

// Create a singleton instance
export const rateLimitManager = new RateLimitManager();

/**
 * Higher-order function to wrap API calls with rate limiting
 */
export function withRateLimit<T>(
  apiCall: (...args: any[]) => Promise<T>,
  apiType: ApiType
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    // Check if we can make the API call
    const canProceed = rateLimitManager.incrementUsage(apiType);
    
    if (!canProceed) {
      console.warn(`Rate limit exceeded for ${apiType} API calls`);
      throw new Error(`Daily quota exceeded for ${apiType} API calls`);
    }
    
    // Make the API call
    return apiCall(...args);
  };
} 