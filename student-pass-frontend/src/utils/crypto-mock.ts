// Mock crypto implementation for browser environment
// In a real application, you would use a proper crypto library like crypto-js

export function createHash(algorithm: string) {
  return {
    update(data: string) {
      return this;
    },
    digest(encoding: string) {
      // Simple hash function for demo purposes
      // In production, use a proper cryptographic hash
      let hash = 0;
      const str = data || '';
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  };
}