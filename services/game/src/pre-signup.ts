/**
 * Cognito Pre Sign-Up Lambda Trigger
 * 
 * When a user signs up with an external provider (Google) and a Cognito user
 * with the same email already exists, this trigger links the external provider
 * to the existing account instead of creating a duplicate.
 */

import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export async function handler(event: any) {
  console.log('Pre Sign-Up trigger:', JSON.stringify({
    triggerSource: event.triggerSource,
    userName: event.userName,
    email: event.request?.userAttributes?.email,
  }));

  // Only handle external provider sign-ups (Google, Facebook, etc.)
  if (event.triggerSource !== 'PreSignUp_ExternalProvider') {
    // For regular sign-ups, auto-confirm email if provided
    event.response.autoConfirmUser = false;
    event.response.autoVerifyEmail = false;
    return event;
  }

  const email = event.request?.userAttributes?.email;
  if (!email) return event;

  const userPoolId = event.userPoolId;

  try {
    // Check if a user with this email already exists
    const existingUsers = await cognito.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }));

    // Find a native (non-external) user with this email
    const nativeUser = existingUsers.Users?.find(u => 
      u.UserStatus !== 'EXTERNAL_PROVIDER' && 
      u.Username !== event.userName
    );

    if (nativeUser) {
      // Link the external provider to the existing native user
      const [providerName, providerUserId] = event.userName.split('_');
      
      console.log('Linking external provider to existing user:', {
        existingUsername: nativeUser.Username,
        provider: providerName,
        providerUserId,
      });

      await cognito.send(new AdminLinkProviderForUserCommand({
        UserPoolId: userPoolId,
        DestinationUser: {
          ProviderName: 'Cognito',
          ProviderAttributeValue: nativeUser.Username,
        },
        SourceUser: {
          ProviderName: providerName,
          ProviderAttributeName: 'Cognito_Subject',
          ProviderAttributeValue: providerUserId,
        },
      }));

      console.log('Successfully linked provider to existing user');
      
      // Auto-confirm and verify since the external provider already verified the email
      event.response.autoConfirmUser = true;
      event.response.autoVerifyEmail = true;
    } else {
      // No existing native user — allow the new external user to be created
      event.response.autoConfirmUser = true;
      event.response.autoVerifyEmail = true;
    }
  } catch (error) {
    console.error('Error in Pre Sign-Up trigger:', error);
    // Don't block sign-up on errors — let it proceed normally
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
}
