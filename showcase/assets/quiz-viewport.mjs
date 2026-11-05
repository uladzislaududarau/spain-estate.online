// Открытая клавиатура уменьшает доступную область, но не меняет исходную высоту окна.
export function availableQuizHeight(baseline, visible) {
  return Math.max(1, Math.floor(Math.min(baseline, visible)));
}

// Двигаем только внутренний список, если активное поле скрыто клавиатурой.
export function fieldScrollDelta(field, area, gap = 12) {
  if (field.bottom > area.bottom - gap) return field.bottom - area.bottom + gap;
  if (field.top < area.top + gap) return field.top - area.top - gap;
  return 0;
}
