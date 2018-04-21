import { ValueHandler } from '../src/value-handler';
test('Should have member', () => {
  expect(ValueHandler.avg).toBeTruthy();
  expect(ValueHandler.max).toBeTruthy();
  expect(ValueHandler.avgRound).toBeTruthy();
});
