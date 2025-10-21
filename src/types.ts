import {ZodSchema} from "zod";

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
