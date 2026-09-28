// cPanel / Passenger production startup entry.
// Run `npm run build` before starting the application.
import('./dist/server.js').catch((error) => {
  console.error(error);
  process.exit(1);
});
