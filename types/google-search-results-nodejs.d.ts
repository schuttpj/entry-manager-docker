declare module 'google-search-results-nodejs' {
  export class getJson {
    constructor(apiKey: string);
    json(
      parameters: Record<string, any>,
      callback: (result: any) => void
    ): void;
  }
} 