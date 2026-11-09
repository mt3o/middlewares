import type {
    ComposeGenOptions,
    ComposeOptions,
    ExecutableGenStack,
    ExecutableStack,
    GenMiddlewareRegistry, GenMiddlewareStack, MiddlewareCall, MiddlewareRegistry, MiddlewareStack, NextGen
} from "./types.js";
import {MiddlewareChainEndError, middlewareName} from "./errors.js";



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

    // Invoke each provider so the stack holds middlewares, not the providers themselves
    const middlewares = stack.map((el) => registry[el]());
    return (await Promise.all(middlewares)) as unknown as MiddlewareStack<Request, Response>;
}

/**
 * Folds a stack into one function. Calling `next()` from the last middleware rejects with
 * `MiddlewareChainEndError`, unless `options.terminal` handles the end of the chain.
 */
export function composeStack<Request, Response>(
    stack: MiddlewareStack<Request, Response>,
    options: ComposeOptions = {}
): ExecutableStack<Request, Response> {

    type LocalCall = MiddlewareCall<unknown, Promise<unknown>> & MiddlewareCall<never, Promise<never>>;

    const {terminal} = options;
    const lastName = middlewareName(stack[stack.length - 1]);

    const composed = stack.reduceRight<MiddlewareCall<Request, Response>>(
        (next, middleware) =>
            async (req: Request) =>
                await middleware(
                    req,
                    next as LocalCall
                ),
        terminal
            ? async (req: Request) => (await terminal(req as never)) as Response
            : async (_req: Request): Promise<Response> => {
                throw new MiddlewareChainEndError(lastName);
            }
    ) as unknown as ExecutableStack<Request, Response>;

    return (req: Request): Promise<Response> => composed(req);
}



/**
 * Folds a callback stack into one function returning a promise. The promise resolves with the
 * value passed to the outermost `resolve`, and rejects with the first error from any layer,
 * including layers reached through a `next()` that nobody awaited.
 * Calling `next()` from the last middleware rejects with `MiddlewareChainEndError`,
 * unless `options.terminal` handles the end of the chain.
 */
export function composeGenStack<Request, Response>(
    callstack: GenMiddlewareStack<Request, Response>,
    options: ComposeGenOptions = {}
): ExecutableGenStack<Request, Response> {

    type LocalNext = NextGen<unknown, unknown> & NextGen<never, never>;
    type Link = (details: unknown, resolve: (resolved: unknown) => void) => Promise<void>;

    const {terminal} = options;
    const lastName = middlewareName(callstack[callstack.length - 1]);

    return (argument, apply) => new Promise<Response>((resolveRun, rejectRun) => {
        let settled = false;
        const fail = (error: unknown) => {
            if (settled) {
                // Too late to reject the run; rethrow so it surfaces as an unhandled rejection
                throw error;
            }
            settled = true;
            rejectRun(error);
        };

        // Every link runs as a promise whose failure is routed to the run, so an error is caught
        // even when the middleware above called next() without awaiting it.
        const guard = (step: (details: unknown, resolve: (resolved: unknown) => void) => unknown): Link =>
            (details, resolve) => {
                const run = (async () => {
                    await step(details, resolve);
                })();
                run.catch(fail);
                return run;
            };

        const end = guard(terminal
            ? (details, resolve) => terminal(details as never, resolve)
            : () => {
                throw new MiddlewareChainEndError(lastName);
            });

        const composed = callstack.reduceRight<Link>(
            (next, middleware) => guard((details, resolve) =>
                middleware(
                    details as never,
                    next as unknown as LocalNext,
                    resolve as (resolved: unknown) => void
                )),
            end
        );

        void composed(argument, (resolved) => {
            // apply runs first, so an error it throws still rejects the run
            apply?.(resolved as Response);
            if (!settled) {
                settled = true;
                resolveRun(resolved as Response);
            }
        });
    });
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

    // Invoke each provider so the stack holds middlewares, not the providers themselves
    const middlewares = stack.map((el) => registry[el]());
    return (await Promise.all(middlewares)) as unknown as GenMiddlewareStack<Request, Response>;
}
