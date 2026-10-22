import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import { authConfig } from './config';
import { eq } from 'drizzle-orm';
import { users, accounts, sessions, verificationTokens } from './db/schema';
// Lazy initialization keeps builds independent of runtime credentials.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const settings = authConfig();
  return {
    adapter: DrizzleAdapter(db(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    secret: settings.AUTH_SECRET,
    logger: {
      error(error) {
        console.error(JSON.stringify({ scope: 'auth', errorType: error.name }));
      },
    },
    providers: [
      Google({ clientId: settings.AUTH_GOOGLE_ID, clientSecret: settings.AUTH_GOOGLE_SECRET }),
    ],
    events: {
      signIn: async ({ user, profile }) => {
        if (user.id && profile?.email_verified === true)
          await db().update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
      },
    },
    pages: { signIn: '/sign-in', error: '/sign-in' },
    session: { strategy: 'database', maxAge: 60 * 60 * 24 * 7 },
    callbacks: {
      signIn: async ({ profile }) => profile?.email_verified === true,
      session: async ({ session, user }) => ({
        ...session,
        user: { ...session.user, id: user.id },
      }),
    },
  };
});
