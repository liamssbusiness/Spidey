import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url =
      'https://oauth2.googleapis.com/token?' +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      })

    const res = await fetch(url, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw data

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
        }
      }
      if (Date.now() < (token.accessTokenExpires as number)) return token
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: { signIn: '/' },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: { sameSite: 'lax', path: '/', secure: false },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    state: {
      name: 'next-auth.state',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    nonce: {
      name: 'next-auth.nonce',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
  },
}
