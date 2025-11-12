import type {
    ExecutableGenStack,
    ExecutableStack,
    GenMiddlewareRegistry, GenMiddlewareStack, MiddlewareCall, MiddlewareRegistry, MiddlewareStack, NextGen
} from "./types";



/**
 *
 * @param stack List of middleware names to be extracted from the Registry
 * @param registry Dictionary of registered middlewares
 * @returns List of middlewares in the order of the stack
 *
 * @example
 * ```ts
 * import {CallBackend} from 'backend';
 * const registry: MiddlewareRegistry = {
 *  'CallApi': async ()=>{ return backend;  }, //static import
 *  'log': async ()=>{ return (await import('logging')).logging;  }, //dynamic import
 *  };
 *  const stack = await getFromRegistry(['log','CallApi'], registry);
 *  const executable = composeStack(stack);
 *  const response = await executable(request);
 *  ```
 */
export async function getFromRegistry<Request, Response>(
    stack: string[],
    registry: MiddlewareRegistry
): Promise<MiddlewareStack<Request, Response>> {
    const haystack = Object.keys(registry);

    const missing = stack.filter((el) => !haystack.includes(el));
    if (missing.length > 0) {
        throw new Error(`Missing middlewares in registry: ${missing.join(', ')}`);
    }

    // Extract middlewares from registry
    const middlewares = stack.map((el) => registry[el]);
    return (await Promise.all(middlewares)) as unknown as MiddlewareStack<Request, Response>;
}

export function composeStack<Request, Response>(
    stack: MiddlewareStack<Request, Response>
): ExecutableStack<Request, Response> {

    type LocalCall = MiddlewareCall<unknown, Promise<unknown>> & MiddlewareCall<never, Promise<never>>;

    const composed = stack.reduceRight<MiddlewareCall<Request, Response>>(
        (next, middleware) =>
            async (req: Request) =>
                await middleware(
                    req,
                    next as LocalCall
                ),
        async (_req: Request): Promise<Response> => ({} as Response)
    ) as unknown as ExecutableStack<Request, Response>;

    return (req: Request): Promise<Response> => composed(req);
}



export function composeGenStack<Request, Response>(
    callstack: GenMiddlewareStack<Request, Response>
): ExecutableGenStack<Request, Response> {

    type LocalNext = NextGen<unknown, unknown> & NextGen<never, never>;

    const composed = callstack.reduceRight<NextGen<Request, Response>>(
        (next, middleware) =>
            async (details, resolve) =>
                await middleware(
                    details,
                    next as LocalNext,
                    resolve as (resolved: unknown) => void
                ),
        async (_req: Request): Promise<Response> => ({} as Response)
    );

    return (argument, apply): void => {
        void composed(argument, apply);
    };
}

export async function getGenFromRegistry<Request, Response>(
    stack: string[],
    registry: GenMiddlewareRegistry
): Promise<GenMiddlewareStack<Request, Response>> {
    const haystack = Object.keys(registry);

    const missing = stack.filter((el) => !haystack.includes(el));
    if (missing.length > 0) {
        throw new Error(`Missing middlewares in registry: ${missing.join(', ')}`);
    }

    // Extract middlewares from registry
    const middlewares = stack.map((el) => registry[el]);
    return (await Promise.all(middlewares)) as unknown as GenMiddlewareStack<Request, Response>;
}
