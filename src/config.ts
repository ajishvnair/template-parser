export const CONFIG = {
    BUCKET_NAME: process.env.TEMPLATE_BUCKET || '',
    MAX_TEMPLATE_SIZE: 1024 * 1024, // 1MB
    CACHE_TTL: 300000, // 5 minutes
    S3_TIMEOUT: 2000, // 2 seconds
};
