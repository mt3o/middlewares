import {ZodSchema} from "zod";

type Validation<
    MyArg,
    NextArg,
    NextResponse,
    MyResolved
> = {
    MyArg: ZodSchema<MyArg>,
    NextArg: ZodSchema<NextArg>,
    NextResponse: ZodSchema<NextResponse>,
    MyResolved: ZodSchema<MyResolved>,
    Name?: string;
}

export type NextGen<Request, Response> = (
    arg: Request,
    resolve: (arg: Response)=>void
) => void

type GenMiddlewareCallable<
    MyArg,
    NextArg,
    NextResponse,
    MyResolved,
> = (
    details: MyArg,
    next: NextGen<
        NextArg,
        NextResponse
    >,
    resolve: (resolved: MyResolved)=>void
) => Promise<void>;

export type GenMiddleware <MyArg, NextArg, NextResponse, MyResolved>
    = GenMiddlewareCallable<MyArg, NextArg, NextResponse, MyResolved>
    & Validation<MyArg, NextArg, NextResponse, MyResolved>
    ;

export type GenStackItem<Request=any,Response=any> = GenMiddleware<Request, any, any, Response> | GenMiddleware<Request, never, never, Response>;

export type GenMiddlewareStack<Request=any,Response=any> = [GenStackItem<Request, Response>, ...GenStackItem[]];

export type ExecutableGenStack<Request, Response> = (initialRequest:Request, resolve: (resolved: Response)=>void) => void;


export type GenMiddlewareRegistry = Record<string, GenMiddlewareProvider>;

export type GenMiddlewareProvider = () => Promise<GenMiddleware<any,any,any,any>>;

export function buildGenStack<Request,Response>(callstack: GenMiddlewareStack<Request,Response>): ExecutableGenStack<Request,Response>{

    type localnext = NextGen<any, any> & NextGen<never, never>;

    const exe = callstack.reduceRight<NextGen<Request, Response>>(
        (next, middleware) => async (details, resolve) => await middleware(details, next as localnext , resolve),
        async (_req: Request) => {return {} as Response}
    );

    return (argument,apply)=>exe(argument,apply);
}
