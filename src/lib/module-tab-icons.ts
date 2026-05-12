export const moduleTabIcons = {
  "/bookings": "/icons/tab-bookings.png",
  "/sessions": "/icons/tab-sessions.png",
  "/students": "/icons/tab-students.png",
  "/revenue": "/icons/tab-revenue.png",
  "/settings": "/icons/tab-settings.png",
} as const;

export type ModuleTabHref = keyof typeof moduleTabIcons;
