import test from 'node:test';
import assert from 'node:assert/strict';
import { availableQuizHeight, fieldScrollDelta } from '../showcase/assets/quiz-viewport.mjs';

test('Мобильный квиз не увеличивается при скрытии адресной строки, но освобождает место клавиатуре', () => {
  assert.equal(availableQuizHeight(740, 800), 740);
  assert.equal(availableQuizHeight(740, 360), 360);
  assert.equal(availableQuizHeight(740, 740), 740);
});

test('Прокрутка поля минимальна и не дёргает уже видимое поле', () => {
  const area = { top: 100, bottom: 400 };
  assert.equal(fieldScrollDelta({ top: 150, bottom: 194 }, area), 0);
  assert.equal(fieldScrollDelta({ top: 370, bottom: 414 }, area), 26);
  assert.equal(fieldScrollDelta({ top: 90, bottom: 134 }, area), -22);
});
