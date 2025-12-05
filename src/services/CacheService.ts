import NodeCache from "node-cache";

// Cache configurations
const CLASSIFICATION_CACHE_TTL = 86400; // 24 hours
const FORECAST_CACHE_TTL = 86400; // 24 hours
const TRANSACTION_HASH_TTL = 86400; // 24 hours - store hash for 24 hours

interface CacheConfig {
  stdTTL: number;
  checkperiod: number;
}

export class CacheService {
  // Separate cache instances for different data types
  private static classificationCache = new NodeCache({ stdTTL: CLASSIFICATION_CACHE_TTL, checkperiod: 60 });
  private static forecastCache = new NodeCache({ stdTTL: FORECAST_CACHE_TTL, checkperiod: 60 });
  private static transactionHashCache = new NodeCache({ stdTTL: TRANSACTION_HASH_TTL, checkperiod: 60 });

  /**
   * Generate a hash of transactions to detect changes
   * Returns a simple hash based on transaction count, dates, and amounts
   */
  static generateTransactionHash(transactions: any[]): string {
    if (!transactions || transactions.length === 0) return "empty";
    
    // Create a hash from transaction data
    const data = transactions
      .map(t => `${t.id}|${t.transaction_date}|${t.debit}|${t.credit}`)
      .join("|");
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Check if transaction data has changed
   */
  static hasTransactionChanged(userId: string, transactions: any[]): boolean {
    const cacheKey = `tx_hash_${userId}`;
    const currentHash = this.generateTransactionHash(transactions);
    const cachedHash = this.transactionHashCache.get(cacheKey) as string | undefined;

    console.log(`[CacheService] User ${userId} - Current hash: ${currentHash}, Cached hash: ${cachedHash}`);

    // If no cached hash, this is first time - store and return true
    if (!cachedHash) {
      console.log(`[CacheService] No cached hash found, storing new hash`);
      this.transactionHashCache.set(cacheKey, currentHash);
      return true; // Transactions changed (first load)
    }

    // Compare hashes
    const changed = currentHash !== cachedHash;
    
    if (changed) {
      console.log(`[CacheService] ⚠️ Transaction hash changed! Invalidating cache`);
      this.transactionHashCache.set(cacheKey, currentHash);
    } else {
      console.log(`[CacheService] ✅ Transaction hash unchanged, cache is valid`);
    }

    return changed;
  }

  /**
   * Get classification from cache
   */
  static getClassification(userId: string): any {
    const cacheKey = `classification_${userId}`;
    return this.classificationCache.get(cacheKey);
  }

  /**
   * Set classification in cache
   */
  static setClassification(userId: string, data: any): void {
    const cacheKey = `classification_${userId}`;
    this.classificationCache.set(cacheKey, data);
    console.log(`✅ Cached classification for user ${userId}`);
  }

  /**
   * Invalidate classification cache
   */
  static invalidateClassification(userId: string): void {
    const cacheKey = `classification_${userId}`;
    this.classificationCache.del(cacheKey);
    console.log(`🗑️ Invalidated classification cache for user ${userId}`);
  }

  /**
   * Get forecast from cache
   */
  static getForecast(userId: string, days: number): any {
    const cacheKey = `forecast_${userId}_${days}`;
    return this.forecastCache.get(cacheKey);
  }

  /**
   * Set forecast in cache
   */
  static setForecast(userId: string, days: number, data: any): void {
    const cacheKey = `forecast_${userId}_${days}`;
    this.forecastCache.set(cacheKey, data);
    console.log(`✅ Cached forecast for user ${userId} (${days} days)`);
  }

  /**
   * Invalidate forecast cache for a user
   */
  static invalidateForecast(userId: string): void {
    // Delete all forecast entries for this user
    const allKeys = this.forecastCache.keys();
    allKeys.forEach((key) => {
      if (key.startsWith(`forecast_${userId}_`)) {
        this.forecastCache.del(key);
      }
    });
    console.log(`🗑️ Invalidated all forecast caches for user ${userId}`);
  }

  /**
   * Clear all caches (use with caution)
   */
  static clearAll(): void {
    this.classificationCache.flushAll();
    this.forecastCache.flushAll();
    this.transactionHashCache.flushAll();
    console.log("🗑️ Cleared all caches");
  }

  /**
   * Get cache stats
   */
  static getStats(): { classification: any; forecast: any; transactionHash: any } {
    return {
      classification: this.classificationCache.getStats(),
      forecast: this.forecastCache.getStats(),
      transactionHash: this.transactionHashCache.getStats(),
    };
  }
}
