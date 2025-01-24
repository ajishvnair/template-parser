import { S3 } from 'aws-sdk';
import * as Handlebars from 'handlebars';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { RequestSchema, LambdaResponse } from './types';
import { CONFIG } from './config';
import { TemplateCache } from './cache';
import { TemplateValidator } from './validator';

const s3 = new S3({
    httpOptions: { timeout: CONFIG.S3_TIMEOUT }
});

const cache = new TemplateCache();

async function getTemplate(key: string): Promise<string> {
    try {
        const response = await s3.getObject({
            Bucket: CONFIG.BUCKET_NAME,
            Key: key,
        }).promise();
        console.log(response.Body, response.ContentLength, CONFIG.MAX_TEMPLATE_SIZE)
        if (!response.Body || (response?.ContentLength || 0) > CONFIG.MAX_TEMPLATE_SIZE) {
            throw new Error('Template size exceeds limit');
        }

        return response.Body.toString('utf-8');
    } catch (error) {
        console.error('S3 error:', error);
        throw new Error('Template not found or inaccessible');
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<LambdaResponse> {
    try {
        const path = event.rawPath || event.path;

        // Handle favicon.ico requests explicitly
        if (path === '/favicon.ico') {
            return {
                statusCode: 204, // No content
                headers: {
                    'Content-Type': 'image/x-icon',
                },
                body: '', // No body for favicon
            };
        }

        // Handle GET requests for assets
        if (event.httpMethod === 'GET' && path && path.includes('assets')) {
            const assetKey = path.startsWith('/') ? path.slice(1) : path;
            const asset = await s3.getObject({
                Bucket: CONFIG.BUCKET_NAME,
                Key: assetKey
            }).promise();

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': asset.ContentType || 'application/octet-stream'
                },
                body: asset.Body?.toString('base64'),
                isBase64Encoded: true
            };
        }
        
        if (event.httpMethod === 'GET' && event.queryStringParameters) {
            const templateKey = event.queryStringParameters.templateKey;
            const variables = event.queryStringParameters.variables
                ? JSON.parse(event.queryStringParameters.variables)
                : {};

            if (!templateKey) {
                throw new Error('Missing templateKey in query parameters');
            }

            let template = cache.get(templateKey);

            if (!template) {
                const content = await getTemplate(templateKey);
                TemplateValidator.validate(content);
                template = Handlebars.compile(content);
                cache.set(templateKey, template);
            }

            const html = template(variables);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Security-Policy': "default-src 'self'",
                    'X-Content-Type-Options': 'nosniff'
                },
                body: html
            };
        }

        throw new Error('Unsupported HTTP method or missing parameters');

    } catch (error: any) {
        console.error('Error:', error);
        return {
            statusCode: error.name === 'ZodError' ? 400 : 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: error.name === 'ZodError' ? 'Invalid input format' : 'Internal server error',
                details: error.message
            })
        };
    }
}
