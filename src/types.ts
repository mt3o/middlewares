import {type ZodSchema} from "zod";



export type MiddlewareCall<Request, Response> = (req: Request) => Promise<Response>;

type MiddlewareValidation<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType> = {
    MyArgType?: ZodSchema<MyArgType>;
    NextMiddlewareArg?: ZodSchema<NextMiddlewareArg>;
    NextMiddlewareReturnType?: ZodSchema<NextMiddlewareReturnType>;
    MyReturnType?: ZodSchema<MyReturnType>;
    Name?: string;
};

type MiddlewareCallable<
    MyArgType,
    NextMiddlewareArg,
    NextMiddlewareReturnType,
    MyReturnType
> = (
    input: MyArgType,
    next: MiddlewareCall<NextMiddlewareArg, Promise<NextMiddlewareReturnType>>
) => Promise<MyReturnType> | MyReturnType;

export type Middleware<
    MyArgType,
    NextMiddlewareArg,
    NextMiddlewareReturnType,
    MyReturnType
> = MiddlewareCallable<
    MyArgType,
    NextMiddlewareArg,
    NextMiddlewareReturnType,
    MyReturnType
> & MiddlewareValidation<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType>;

export type MiddlewareStackItem<Request=any,Response=any> = Middleware<Request, any, any, Response> | Middleware<Request, never, never, Response>;

export type MiddlewareStack<Request=any,Response=any> = [MiddlewareStackItem<Request, Response>, ...MiddlewareStackItem[]];

export type ExecutableStack<Request, Response> = (initialRequest:Request) => Promise<Response>;

export type MiddlewareRegistry = Record<string, MiddlewareProvider>;

export type MiddlewareProvider = () => Promise<Middleware<any,any,any,any>>;







export type NextGen<Request, Response> = (
    arg: Request,
    resolve: (arg: Response) => void
) => void;

type GenMiddlewareCallable<MyArg, NextArg, NextResponse, MyResolved> = (
    details: MyArg,
    next: NextGen<NextArg, NextResponse>,
    resolve: (resolved: MyResolved) => void
) => Promise<void>;

/**
 * A generic middleware type that processes an argument of type `MyArg`, calls the next middleware with an argument of type `NextArg`, and resolves with a value of type `MyResolved`.
 *
 * @template MyArg - The type of the argument passed to this middleware.
 * @template NextArg - The type of the argument passed to the next middleware.
 * @template NextResponse - The type of the response returned by the next middleware.
 * @template MyResolved - The type of the resolved value from this middleware.
 *
 * @example
 * ```ts
 * import { GenMiddleware } from './gen';
 *
 * // Example middleware logs request details
 *    const requestLogger: GenMiddleware<
 *       InitialRequest,
 *       LoggerOutput,
 *       ValidatorOutput,
 *       LoggerOutput
 *     > = async (
 *         details:InitialRequest,
 *         next: NextGen<LoggerOutput, ValidatorOutput>,
 *         resolve: (arg:LoggerOutput)=>void
 *     ) => {
 *       executionOrder.push('logger-start');
 *       const withTimestamp: LoggerOutput = {
 *         ...details,
 *         timestamp: Date.now(),
 *       };
 *
 *       next(withTimestamp, (_response) => {
 *         executionOrder.push('logger-resolve');
 *         resolve(withTimestamp);
 *       });
 *     };
 * ```
 */
export type GenMiddleware<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType> =
    GenMiddlewareCallable<
        MyArgType,
        NextMiddlewareArg,
        NextMiddlewareReturnType,
        MyReturnType
    > &
        MiddlewareValidation<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType>

;



export type GenStackItem<Request = any, Response = any> =
    GenMiddleware<Request, any, any, Response>
    | GenMiddleware<Request, never, never, Response>;

export type GenMiddlewareStack<Request = any, Response = any> = [
    GenStackItem<Request, Response>,
    ...GenStackItem[]
];

export type ExecutableGenStack<Request, Response> = (
    initialRequest: Request,
    resolve: (resolved: Response) => void
) => void;

export type GenMiddlewareRegistry = Record<string, GenMiddlewareProvider>;

export type GenMiddlewareProvider = () => Promise<GenMiddleware<unknown, unknown, unknown, unknown>>;
