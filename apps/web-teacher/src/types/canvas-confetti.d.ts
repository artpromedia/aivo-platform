declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    flat?: boolean;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: ('square' | 'circle' | 'star')[];
    zIndex?: number;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
    resize?: boolean;
    canvas?: HTMLCanvasElement | null;
    scalar?: number;
  }

  interface GlobalOptions {
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
    resize?: boolean;
  }

  type ConfettiFunction = {
    (options?: Options): Promise<null>;
    reset: () => void;
    create: (canvas: HTMLCanvasElement | null, globalOptions?: GlobalOptions) => ConfettiFunction;
  };

  const confetti: ConfettiFunction;
  export = confetti;
}
