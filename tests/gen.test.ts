import {buildGenStack, GenMiddleware, GenStack} from "../src/gen";

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



const logger: GenMiddleware<
    {base: string},
    {base: string},
    withUpdatesEvents,
    withUpdatesEvents
> = async (details,next,  resolve)=>{
    console.log("1_0::Starting!", {details});
    next(details, (output)=>{
        console.log("1_1::Resolving!", {output})
        resolve(output);
        console.log("1_2::Resolved!", {output})
    });
    console.log("1_3::Done!")

}
const withUpdate: GenMiddleware<
    {base: string},     //MyArg
    fetchedArgs,        //NextArg
    fetchedData,      //NextResponse
    withUpdatesEvents  //MyResolved
            //NextResult
> = async (details,next,  resolve)=>{

    console.log("2_0::initialize, resolving with tmp data:", {details})
    //initialize that we started processing
    resolve({
        status: "processing",
    });
    console.log("2_1::initialized, resolved with tmp data.")

    console.log("2_2::calling next:", {details})
    //start processing
    next({
        url: details.base,
    }, (output)=>{

        console.log("2_3::Resolving inner call with", {output}, 'but will add 1');
        //execute when processing is done, or we have updates
        resolve({
            status: 'done',
            output: (output.output ?? -1)+1
        });
        console.log("2_4::Resolved inner call. ",{output},",Added 1 to result");
    });
    console.log("2_5::End. Called next.")
}


// '?answer=42'
const fetcher: GenMiddleware<
    fetchedArgs,     //MyArg
    never,           //NextArg
    never,           //NextResponse
    fetchedData     //MyResolved
> = async (
    details,
    _next,
    resolve
)=> {
    console.log("3_0::first call, calling fetch", {details})
    // const response = await next(details, (output)=>{});
    const response = await fetch(details.url+"?answer=42");
    console.log("3_1::fetch executed", {details})
    const r = await response.json() as unknown as {parsedQueryParams:{answer?:number}};
    if(r.parsedQueryParams.answer){
        console.log("3_2::Resolving, success:")
        resolve({
            output:  r.parsedQueryParams.answer
        });
        console.log("3_3::Resolved, success.")
    }else{
        console.log("3_2a::Resolving, no answer:")
        resolve({
            error: 'no answer',
        })
        console.log("3_3a::Resolved, no answer.")
    }
    console.log("3_4::Finished.")
}



const callstack: GenStack = [logger, withUpdate, fetcher];




console.log("0_0 starting");
const s = buildGenStack(callstack);
s({base: 'https://echo.free.beeceptor.com'}, (result)=>{
    console.log("0_1 The effect in outermost layer is", result);
});
