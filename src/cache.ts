import { CONFIG } from './config';

export class TemplateCache {
    private cache: Map<string, { template: HandlebarsTemplateDelegate; timestamp: number }>;

    constructor() {
        this.cache = new Map();
    }

    get(key: string): HandlebarsTemplateDelegate | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.template;
    }

    set(key: string, template: HandlebarsTemplateDelegate): void {
        this.cache.set(key, { template, timestamp: Date.now() });
    }
}
