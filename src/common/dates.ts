// "Today" as a YYYY-MM-DD string in the app's time zone (default Philippines),
// so a date entered late at night is not wrongly rejected as "in the future".
export function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: process.env.APP_TZ || 'Asia/Manila' });
}
