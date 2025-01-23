import { handler } from './handler';

async function test() {
    const result = await handler({
        body: JSON.stringify({
            templateKey: 'templates/sample.hbs',
            variables: {
                title: 'Welcome',
                user: { name: 'John', role: 'Admin' }
            }
        })
    } as any);

    console.log(result);
}

test();