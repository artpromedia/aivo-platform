declare module 'swagger-ui-react' {
  import type { ComponentType } from 'react';

  export interface SwaggerUIProps {
    url?: string;
    spec?: object;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    persistAuthorization?: boolean;
    displayOperationId?: boolean;
    filter?: boolean | string;
    tryItOutEnabled?: boolean;
    requestInterceptor?: (req: object) => object;
    responseInterceptor?: (res: object) => object;
    onComplete?: () => void;
    presets?: unknown[];
    plugins?: unknown[];
    supportedSubmitMethods?: string[];
    deepLinking?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    layout?: string;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
