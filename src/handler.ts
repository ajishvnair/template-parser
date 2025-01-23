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
        if (!event.body) {
            throw new Error('Missing request body');
        }

        const request = RequestSchema.parse(JSON.parse(event.body));
        let template = cache.get(request.templateKey);

        console.log(request);

        if (!template) {
            const content = await getTemplate(request.templateKey);
            TemplateValidator.validate(content);
            template = Handlebars.compile(content);
            cache.set(request.templateKey, template);
        }

        const html = template(request.variables);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
                'Content-Security-Policy': "default-src 'self'",
                'X-Content-Type-Options': 'nosniff'
            },
            body: html
        };

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