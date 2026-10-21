import Homey, { type SimpleClass } from 'homey';

type LogMethod = (...args: unknown[]) => void;

export default class Logger {
  private context?: string = undefined;
  private readonly _log: LogMethod;
  private readonly _error: LogMethod;

  public constructor(instance: SimpleClass, logMethod: LogMethod, errorMethod: LogMethod, context?: string) {
    this._log = logMethod.bind(instance);
    this._error = errorMethod.bind(instance);
    this.setContext(context);
  }

  public setContext(context?: string): void {
    this.context = context ? `[${context}]` : undefined;
  }

  public log(...args: unknown[]): void {
    if (this.context) {
      args.unshift(this.context);
    }

    this._log(...args);
  }

  public error(...args: unknown[]): void {
    if (this.context) {
      args.unshift(this.context);
    }

    this._error(...args);
  }

  public debug(...args: unknown[]): void {
    if (Homey.env.DEBUG !== '1') {
      return;
    }

    this.log('[dbg]', ...args);
  }
}
