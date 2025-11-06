import {ZodObject, ZodSchema} from 'zod';

/**
 * Check if A is superset of B. So: B contains all keys of A. Default implementation assumes that:
 * A superset of B => true
 * A subset of B => false
 * A same as B => true
 * A undefined and B undefined => true
 * A undefined, B defined => false
 * A defined, B undefined => true
 * but you can provide your own validator if you dont want to rely on Zod but have your own type validation library
 */
export function areTypesEquivalent<T, U>(a: ZodSchema<T>|undefined, b: ZodSchema<U>|undefined): boolean {
    if (a instanceof ZodObject && b instanceof ZodObject) {
        const shapeA = a.shape;
        const shapeB = b.shape;

        const keysA = Object.keys(shapeA);
        const keysB = Object.keys(shapeB);

        for (const key of keysA) {
            if (!keysB.includes(key) || !areTypesEquivalent(shapeA[key], shapeB[key])) {
                return false;
            }
        }

        return true;
    }

    if(a == undefined && b != undefined || a != undefined && b == undefined) {
        return false;
    }
    if(a == undefined || b == undefined){
        return true;
    }
    try{
            //@ts-ignore
            return b._def?.typeName == a._def?.typeName;
        }catch(e){
        console.log('Not ZOD type in schema :/',e);
        return false;
    }

}
