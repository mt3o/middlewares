import type {ExecutableStack, Middleware, MiddlewareCall, MiddlewareRegistry, MiddlewareStack} from "./types";



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
export async function getFromRegistry<Request,Response>(stack: string[], registry:MiddlewareRegistry){

    const haystack = Object.keys(registry);

    if(!stack.every(el=>haystack.includes(el))){
        const missing = stack.filter(el=>!haystack.includes(el));
        throw new Error(`Missing middlewares in registry: ${missing.join(', ')}`);
    }

    // Extract middlewares from registry
    const middlewares = stack.map(el=>registry[el]);
    return (await Promise.all(middlewares)) as unknown as MiddlewareStack<Request,Response>;
};

export function composeStack<Request, Response>(
    stack: MiddlewareStack<Request,Response>,
) : ExecutableStack<Request, Response> {


    const composed = stack.reduceRight<MiddlewareCall<Request, Response>>(
        (next, middleware) => async (req: Request) => await middleware(
            req,
            next as MiddlewareCall<any, Promise<any>> & MiddlewareCall<never, Promise<never>>
        ),
        async (_req: Request) => {return {} as Response},
    ) as unknown as ExecutableStack<Request, Response>;

    return (req)=>composed(req);
}
