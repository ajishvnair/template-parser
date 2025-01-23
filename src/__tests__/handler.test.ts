import { handler } from '../handler';
import { S3 } from 'aws-sdk';
import { TemplateValidator } from '../validator';
import { TemplateCache } from '../cache';

jest.mock('aws-sdk');
jest.mock('../validator');
jest.mock('../cache');

describe('Template Parser Lambda', () => {
    const mockS3GetObject = jest.fn();
    const validTemplate = '<h1>{{title}}</h1><p>{{user.name}} ({{user.role}})</p>';

    beforeEach(() => {
        jest.clearAllMocks();
        (S3 as jest.MockedClass<typeof S3>).prototype.getObject = mockS3GetObject;
        jest.spyOn(TemplateValidator, 'validate').mockImplementation((html: string) => Promise.resolve(html));
    });

    const createEvent = (body: any) => ({
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '',
            apiId: '',
            protocol: 'HTTP/1.1',
            httpMethod: 'POST',
            authorizer: {},
            identity: {
                accessKey: null,
                accountId: null,
                apiKey: null,
                apiKeyId: null,
                caller: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                principalOrgId: null,
                sourceIp: '',
                user: null,
                userAgent: null,
                userArn: null,
                clientCert: null
            },
            path: '/',
            stage: 'test',
            requestId: '',
            requestTimeEpoch: 0,
            resourceId: '',
            resourcePath: ''
        },
        resource: ''
    });

    describe('Input Validation', () => {
        test('validates template key format', async () => {
            const event = createEvent({
                templateKey: 'template/test.txt', // Changed to match validation
                variables: {}
            });

            const result = await handler(event);
            expect(result.statusCode).toBe(400);
        });

        test('requires request body', async () => {
            const result = await handler(createEvent(''));
            expect(result.statusCode).toBe(500);
        });
    });

    describe('Template Processing', () => {
        test('successfully renders template', async () => {
            mockS3GetObject.mockReturnValue({
                promise: () => Promise.resolve({
                    Body: Buffer.from(validTemplate),
                    ContentLength: validTemplate.length
                })
            });

            const event = createEvent({
                templateKey: 'template/test.hbs',
                variables: { title: 'Hello', user: { name: 'John', role: 'Admin' } }
            });

            const result = await handler(event);
            expect(result.statusCode).toBe(200);
            expect(result.body).toBe('<h1>Hello</h1><p>John (Admin)</p>');
        });

        test('handles template size limit', async () => {
            mockS3GetObject.mockReturnValue({
                promise: () => Promise.resolve({
                    Body: Buffer.from('x'.repeat(2 * 1024 * 1024)),
                    ContentLength: 2 * 1024 * 1024
                })
            });

            const result = await handler(createEvent({
                templateKey: 'template/large.hbs',
                variables: {}
            }));
            expect(result.statusCode).toBe(500);
        });
    });

    describe('Caching', () => {
        test('uses cached template when available', async () => {
            const mockCache = jest.mocked(TemplateCache.prototype);
            mockCache.get.mockReturnValue(() => 'cached template');

            const event = createEvent({
                templateKey: 'template/cached.hbs',
                variables: {}
            });

            await handler(event);
            expect(mockS3GetObject).not.toHaveBeenCalled();
        });
    });

    describe('Security', () => {
        test('validates template for unsafe content', async () => {
            // Setup validator spy before mocking S3
            const validateSpy = jest.spyOn(TemplateValidator, 'validate');
            validateSpy.mockImplementation((html: string) => Promise.resolve(html));

            // Mock S3 response
            mockS3GetObject.mockReturnValue({
                promise: () => Promise.resolve({
                    Body: Buffer.from('<script>alert("xss")</script>'),
                    ContentLength: 100
                })
            });

            const event = createEvent({
                templateKey: 'template/unsafe.hbs',
                variables: {}
            });

            // Mock Cache to return null to force template fetch
            const mockCache = jest.mocked(TemplateCache.prototype);
            mockCache.get.mockReturnValue(null);

            await handler(event);
            expect(validateSpy).toHaveBeenCalledWith('<script>alert("xss")</script>');
        });

    });
});
