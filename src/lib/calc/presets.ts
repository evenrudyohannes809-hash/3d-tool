// Пресеты популярных принтеров для модалки "Добавить свой принтер".
// Перенесены 1:1 из public/calculator.html (массив PRESETS).
// Износ (wear) указан в рублях/час.
export const PRINTER_PRESETS: Array<{
  name: string;
  power: number;
  wear: number;
}> = [
  { name: "Anycubic Kobra 3 / S1 Combo", power: 100, wear: 25 },
  { name: "Bambu Lab P2S", power: 110, wear: 35 },
  { name: "Bambu Lab P1P / P1S", power: 110, wear: 40 },
  { name: "Bambu Lab X1-Carbon", power: 110, wear: 50 },
  { name: "Bambu Lab A1", power: 95, wear: 25 },
  { name: "Bambu Lab A1 mini", power: 80, wear: 25 },
  { name: "Flashforge Adventurer 5M/Pro", power: 150, wear: 25 },
  { name: "Creality K1 / K1 Max / K1C", power: 100, wear: 35 },
  { name: "Creality Ender-3 V3", power: 100, wear: 21 },
  { name: "Anycubic Kobra 2 Neo", power: 100, wear: 21 },
  { name: "Anycubic Kobra 2 Max", power: 600, wear: 45 },
  { name: "Elegoo OrangeStorm Giga", power: 1800, wear: 90 },
  { name: "Elegoo Neptune 4 Max", power: 450, wear: 35 },
  { name: "Flashforge (Универсальный)", power: 130, wear: 25 },
  { name: "Prusa MK4S", power: 80, wear: 28 },
];
