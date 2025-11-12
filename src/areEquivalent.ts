import {type ZodSchema} from 'zod';

interface SchemaWithDef {
    _def?: {
        typeName?: string; //zod3
        type?: string; //zod4
    };
}

/**
 * Check if A is superset of B. So: B contains all keys of A. Default implementation assumes that:
 * A superset of B => true
 * A subset of B => false
 * A same as B => true
 * A undefined and B undefined => true
 * A undefined, B defined => false
 * A defined, B undefined => true
 * but you can provide your own validator if you dont want to rely on Zod but have your own type validation library
 *
 * Depends on Zod `shape` property for object schemas and `_def.typeName` for primitive schemas.
 */
export function areTypesEquivalent<T, U>(
    a: ZodSchema<T> | undefined,
    b: ZodSchema<U> | undefined
): boolean {
    // Handle both undefined case
    if (a === undefined && b === undefined) {
        return true;
    }

    // Handle mismatched undefined cases
    if ((a === undefined) !== (b === undefined)) {
        return false;
    }

    // Both are defined at this point
    if (a && b && 'shape' in a && 'shape' in b) {
        //we want to avoid using zod as runtime dependency
        const shapeA = a.shape as Record<string,never>;
        const shapeB = b.shape as Record<string,never>;

        const keysA = Object.keys(shapeA!);
        const keysB = Object.keys(shapeB!);

        try {

            for (const key of keysA) {
                if (!keysB.includes(key) || !areTypesEquivalent(shapeA[key], shapeB[key])) {
                    return false;
                }
            }

            return true;
        }catch(e){
            console.error('Type validation failed',e);
            return false;
        }
    }

    // Compare type names for non-object schemas
    try {
        const aSchema = a as SchemaWithDef;
        const bSchema = b as SchemaWithDef;
        //zod3
        if('typeName' in aSchema._def! && 'typeName' in bSchema._def!){
            return bSchema._def?.typeName === aSchema._def?.typeName;
        }

        //zod4
        if('type' in aSchema._def! && 'type' in bSchema._def!){
            return bSchema._def?.type === aSchema._def?.type;
        }
        //failed to determine type with zod?!
        return false;
    } catch {
        return false;
    }
}
