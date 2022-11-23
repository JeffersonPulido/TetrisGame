const calcularPuntaje = require('./tetris');
test('calculo de puntaje para mostrar al usuario', () => {
  expect(calcularPuntaje(1, 15)).toBe(15);
});