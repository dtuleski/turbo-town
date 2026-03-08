import { gql } from '@apollo/client';

export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession($input: CreateCheckoutSessionInput!) {
    createCheckoutSession(input: $input) {
      sessionId
      url
    }
  }
`;

export const CREATE_PORTAL_SESSION = gql`
  mutation CreatePortalSession {
    createPortalSession {
      url
    }
  }
`;
