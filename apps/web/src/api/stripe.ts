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

export const VERIFY_CHECKOUT_SESSION = gql`
  mutation VerifyCheckoutSession($sessionId: String!) {
    verifyCheckoutSession(sessionId: $sessionId) {
      success
      tier
    }
  }
`;

export const CHANGE_PLAN = gql`
  mutation ChangePlan($input: ChangePlanInput!) {
    changePlan(input: $input) {
      success
      tier
    }
  }
`;
