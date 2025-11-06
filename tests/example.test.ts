import {describe, it, expect, vi} from 'vitest';
import {z} from 'zod';
import {type Middleware, type MiddlewareStack} from "../src";
import {validateStack} from "../src";
import {composeStack} from "../src";

const logger = vi.fn()

// Define the domain object
const DomainRequestSchema = z.object({
    text: z.string(),
});
type DomainRequest = z.infer<typeof DomainRequestSchema>;

const DomainResponseSchema = z.object({
    userQuery: z.string(),
    highlightedText: z.string(),
    responseText: z.string(),
});
type DomainResponse = z.infer<typeof DomainResponseSchema>;

const TranslateResponseSchema = z.union([
    z.object({
        status: z.literal('OK'),
        highlightedText: z.string(),
        responseText: z.string(),
    }), z.object({
        status: z.literal('ERROR')
    }), z.object({
        status: z.literal('EXCEPTION'),
        message: z.string(),
    })
]);
type TranslateResponse = z.infer<typeof TranslateResponseSchema>;

// Define the API request and response types
const ApiRequestSchema = z.object({
    query: z.string(),
});
type ApiRequest = z.infer<typeof ApiRequestSchema>;

const ApiResponseSchema = z.object({
    httpCode: z.number(),
    result: z.object({
        q: z.string(),
    }),
});
type ApiResponse = z.infer<typeof ApiResponseSchema>;


// Middleware to create a domain object and add highlighting
const CreateDomainObjectMiddleware: Middleware<DomainRequest, DomainRequest, TranslateResponse, DomainResponse> = async (input, next) => {

    const resp = await next({
        text: input.text,
    });
    switch ((resp).status) {
        case 'ERROR':
            return {
                userQuery: input.text ?? '',
                highlightedText: '',
                responseText: 'FAILURE',
            }
        case 'EXCEPTION':
            return {
                userQuery: input.text ?? '',
                highlightedText: '',
                responseText: 'EXCEPTION',
            }
        case 'OK':
            return {
                userQuery: input.text ?? '',
                highlightedText: resp.highlightedText,
                responseText: resp.responseText
            }
    }
};

CreateDomainObjectMiddleware.MyArgType = DomainRequestSchema;
CreateDomainObjectMiddleware.NextMiddlewareArg = DomainRequestSchema;
CreateDomainObjectMiddleware.NextMiddlewareReturnType = TranslateResponseSchema;
CreateDomainObjectMiddleware.MyReturnType = DomainResponseSchema;
CreateDomainObjectMiddleware.Name = "CreateDomainObjectMiddleware";


// Middleware to log request and response
const LoggingMiddleware: Middleware<DomainRequest, DomainRequest, TranslateResponse, TranslateResponse> = async (input, next) => {
    logger('LOGGING Request:', input);
    const response = await next(input);
    logger('LOGGING Response:', response);
    return response;
};
LoggingMiddleware.MyArgType = DomainRequestSchema;
LoggingMiddleware.NextMiddlewareArg = DomainRequestSchema;
LoggingMiddleware.NextMiddlewareReturnType = TranslateResponseSchema;
LoggingMiddleware.MyReturnType = TranslateResponseSchema;
LoggingMiddleware.Name = "LoggingMiddleware";

// Middleware to build API request and translate response
const TranslateDomainToApiMiddleware: Middleware<DomainRequest, ApiRequest, ApiResponse, TranslateResponse> = async (input, next) => {
    const apiRequest: ApiRequest = {query: input.text};
    const apiResponse = await next(apiRequest);

    try {
        const result = ApiResponseSchema.parse(apiResponse);
        if (result.httpCode !== 200) {
            return {
                status: 'ERROR',
            }
        }
        return {
            status: 'OK',
            highlightedText: `<highlight>${apiResponse.result.q}</highlight>`,
            responseText: apiResponse.result.q,
        };
    } catch (e) {
        console.error('Error parsing response:', e);
        return {
            status: 'EXCEPTION',
            message: (e as Error).message,
        }
    }
};
TranslateDomainToApiMiddleware.MyArgType = DomainRequestSchema;
TranslateDomainToApiMiddleware.NextMiddlewareArg = ApiRequestSchema;
TranslateDomainToApiMiddleware.NextMiddlewareReturnType = ApiResponseSchema;
TranslateDomainToApiMiddleware.MyReturnType = TranslateResponseSchema;
TranslateDomainToApiMiddleware.Name = "TranslateDomainToApiMiddleware";

// Middleware to fetch data from the API
const FetchApiDataMiddleware: Middleware<ApiRequest, never, never, ApiResponse> = async (input) => {
    const url = new URL('https://echo.free.beeceptor.com/sample-request');
    url.search = new URLSearchParams({q: input.query}).toString();

    const response = await fetch(url.toString());
    const data = await response.json();
    return {
        httpCode: response.status,
        result: data.parsedQueryParams
    };
};
FetchApiDataMiddleware.MyArgType = ApiRequestSchema;
FetchApiDataMiddleware.MyReturnType = ApiResponseSchema;
FetchApiDataMiddleware.Name = "FetchApiDataMiddleware";


// Create a middleware stack
const stack: MiddlewareStack = [
    CreateDomainObjectMiddleware,
    LoggingMiddleware,
    TranslateDomainToApiMiddleware,
    FetchApiDataMiddleware
];

describe('Middleware Stack Example: Validation', () => {
    it('builds and executes the stack', async () => {
// Validate the stack
        const errors = validateStack(stack);

        expect(errors.length).toBe(0)
        //else: console.error('Stack validation failed:', errors);

        // Compose and execute the stack
        const composed = composeStack<DomainRequest, DomainResponse>(stack);

        /**** Calling the stack ***");*/
        const c = await composed({text: 'example'});
        /**** Called the stack ***\n");*/

        expect(c.highlightedText).toBe("<highlight>example</highlight>");
        expect(c.responseText).toBe("example");
        expect(c.userQuery).toBe("example");

        expect(logger).toBeCalledTimes(2);
        expect(logger).toBeCalledWith("LOGGING Request:", {
            "text": "example"
        });
        expect(logger).toBeCalledWith("LOGGING Response:", {
            "highlightedText": "<highlight>example</highlight>",
            "responseText": "example",
            "status": "OK",
        },);


    })
})
