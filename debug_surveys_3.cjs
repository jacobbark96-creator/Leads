const { startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } = require('date-fns');

const currentDate = new Date(); // Aug 31 2026
const monthStart = startOfMonth(currentDate);
const monthEnd = endOfMonth(monthStart);
const gridStart = startOfWeek(monthStart, { weekStarts: 1 });
const gridEnd = endOfWeek(monthEnd, { weekStarts: 1 });

console.log("Current:", currentDate);
console.log("Grid Start:", gridStart);
console.log("Grid End:", gridEnd);

const surveyDateStr = "2026-09-04";
const d = parseISO(surveyDateStr);
console.log("Parsed Date:", d);
console.log("Is between?", d >= gridStart && d <= gridEnd);

