import {buildGenStack, type GenMiddleware, type GenMiddlewareStack} from "../src/gen";

type fetchedResult = {
    output: number;
}
type fetchedData = {
    error?: string,
} & Partial<fetchedResult>;

type fetchedArgs = {
    url: string,
}


type withUpdatesEvents = {
    status: string;

} & fetchedData;
