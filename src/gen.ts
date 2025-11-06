import type {ZodSchema} from "zod";

type Validation<MyArg, NextArg, NextResponse, MyResolved> = {
    MyArg: ZodSchema<MyArg>;
    NextArg: ZodSchema<NextArg>;
    NextResponse: ZodSchema<NextResponse>;
    MyResolved: ZodSchema<MyResolved>;
    Name?: string;
};

export type NextGen<Request, Response> = (
    arg: Request,
    resolve: (arg: Response) => void
) => void;

type GenMiddlewareCallable<MyArg, NextArg, NextResponse, MyResolved> = (
    details: MyArg,
    next: NextGen<NextArg, NextResponse>,
    resolve: (resolved: MyResolved) => void
) => Promise<void>;

export type GenMiddleware<MyArg, NextArg, NextResponse, MyResolved> = GenMiddlewareCallable<
    MyArg,
    NextArg,
    NextResponse,
    MyResolved
> &
    Validation<MyArg, NextArg, NextResponse, MyResolved>;

export type GenStackItem<Request = unknown, Response = unknown> =
    | GenMiddleware<Request, unknown, unknown, Response>
    | GenMiddleware<Request, never, never, Response>;

export type GenMiddlewareStack<Request = unknown, Response = unknown> = [
    GenStackItem<Request, Response>,
    ...GenStackItem[]
];

export type ExecutableGenStack<Request, Response> = (
    initialRequest: Request,
    resolve: (resolved: Response) => void
) => void;

export type GenMiddlewareRegistry = Record<string, GenMiddlewareProvider>;

export type GenMiddlewareProvider = () => Promise<GenMiddleware<unknown, unknown, unknown, unknown>>;

export function buildGenStack<Request, Response>(
    callstack: GenMiddlewareStack<Request, Response>
): ExecutableGenStack<Request, Response> {
    type LocalNext = NextGen<unknown, unknown> & NextGen<never, never>;

    const exe = callstack.reduceRight<NextGen<Request, Response>>(
        (next, middleware) => (details, resolve) =>
            middleware(details, next as LocalNext, resolve as (resolved: unknown) => void),
        async (_req: Request): Promise<Response> => ({} as Response)
    );

    return (argument, apply): void => {
        void exe(argument, apply);
    };
}
