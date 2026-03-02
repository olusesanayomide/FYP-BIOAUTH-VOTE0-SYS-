declare module 'csv-parse/sync' {
    export function parse(input: any, options?: any): any;
}

declare module 'xlsx' {
    export const utils: {
        sheet_to_json: (sheet: any, options?: any) => any;
    };
    export function read(data: any, options?: any): any;
    export function write(data: any, options?: any): any;
}
