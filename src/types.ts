import { z } from 'zod';

export const RequestSchema = z.object({
    templateKey: z.string().startsWith('template').endsWith('.hbs'),
    variables: z.record(z.unknown())
});

export type LambdaRequest = z.infer<typeof RequestSchema>;

export interface LambdaResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string | undefined;
    isBase64Encoded?: boolean;
}
