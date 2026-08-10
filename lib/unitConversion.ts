export class Time {
  private constructor(private ms: number) {}
  public static ms(milliSeconds: number): Time {
    return new Time(milliSeconds);
  }

  public static s(seconds: number): Time {
    return new Time(seconds * 1000);
  }

  public static m(minutes: number): Time {
    return new Time(minutes * 60_000);
  }

  public static h(hours: number): Time {
    return new Time(hours * 3_600_000);
  }

  public toMs(): number {
    return this.ms;
  }

  public toS(): number {
    return this.ms / 1000;
  }

  public toM(): number {
    return this.ms / 60_000;
  }

  public toH(): number {
    return this.ms / 3_600_000;
  }
}
