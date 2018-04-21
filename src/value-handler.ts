export class ValueHandler {
  public static avg(set: any[], value: any) {
    set[1] = (set[1] * set[2] + value) / (set[2] + 1);
  }
  public static avgRound(set: any[], value: any) {
    ValueHandler.avg(set, value);
    set[1] = Math.round(set[1]);
  }
  public static max(set: any[], value: any) {
    if (value > set[1]) {
      set[1] = value;
    }
  }
}
