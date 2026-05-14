/** @type {import('jest').Config} */
module.exports = {
  // Ejecuta proyectos de a uno para no saturar las conexiones a Supabase.
  // Los tests de integración comparten la misma BD remota; la concurrencia
  // provoca timeouts y errores de rate-limiting.
  maxWorkers: 1,
  testTimeout: 30000,
  projects: [
    '<rootDir>/apps/app-admin',
    '<rootDir>/apps/app-auth',
    '<rootDir>/apps/app-chat',
    '<rootDir>/apps/app-events',
    '<rootDir>/apps/app-places',
    '<rootDir>/apps/app-profile',
    '<rootDir>/apps/app-saved',
  ],
}
