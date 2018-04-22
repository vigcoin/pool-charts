import { ValueHandler } from '../src/value-handler';
test('Should have member', () => {
  expect(ValueHandler.avg).toBeTruthy();
  expect(ValueHandler.max).toBeTruthy();
  expect(ValueHandler.avgRound).toBeTruthy();
});

test('Should have member', () => {
  ValueHandler.max([1, 99], 100);
  ValueHandler.max([1, 100], 100);
  ValueHandler.max([1, 101], 100);
});
