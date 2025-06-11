import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up", "/api/webhooks/stripe", "/api/webhooks/stripe", "/game", "/api/game/crash"],
  ignoredRoutes: ["/api/webhooks/stripe"]
});
 
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};