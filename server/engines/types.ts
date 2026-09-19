export interface BaseGameEngine {
  readonly id: string;
  readonly name: string;
  getStatus(): Record<string, any>;
  start(): void;
  stop(): void;
}
