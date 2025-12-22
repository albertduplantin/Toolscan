import { notFound, redirect } from 'next/navigation';
import { auth, currentUser as getClerkUser } from '@clerk/nextjs/server';
import { getInvitationByToken, acceptInvitation } from '@/lib/actions/invitations';
import { getCurrentDbUser, syncUserFromClerk } from '@/lib/clerk/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();

  // Get invitation
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  // If user is not authenticated, redirect to sign-up with return URL
  if (!userId) {
    // Use redirect_url parameter to return to this page after sign-up
    const returnUrl = encodeURIComponent(`/join/${token}`);
    const signUpUrl = `/sign-up?redirect_url=${returnUrl}`;
    redirect(signUpUrl);
  }

  // User is authenticated, get or create user in database
  let currentUser = await getCurrentDbUser();

  // If user doesn't exist in our DB yet (just signed up), sync from Clerk
  if (!currentUser) {
    try {
      currentUser = await syncUserFromClerk(userId);

      if (!currentUser) {
        return (
          <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Error</CardTitle>
                <CardDescription>
                  There was an error creating your account. Please try again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/sign-in">
                  <Button className="w-full">Try again</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
      }
    } catch (error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : 'An error occurred'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/sign-in">
                <Button className="w-full">Try again</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // If user already has a tenant, they can't accept
  if (currentUser.tenantId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Already in an organization</CardTitle>
            <CardDescription>
              You're already a member of an organization. If you want to join{' '}
              <strong>{invitation.tenant.name}</strong>, please contact your current
              organization administrator to leave first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For email invitations, verify email matches
  if (invitation.type === 'email' && invitation.email !== currentUser.email) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>, but you're
              signed in as <strong>{currentUser.email}</strong>. Please sign in with the
              correct email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sign-in">
              <Button className="w-full">Sign in with different email</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-accept the invitation and redirect
  try {
    await acceptInvitation(token, currentUser.id);
    redirect('/dashboard');
  } catch (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error accepting invitation</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An error occurred'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
}
