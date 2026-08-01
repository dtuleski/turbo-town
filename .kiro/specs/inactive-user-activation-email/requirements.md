# Requirements Document

## Introduction

DashDen needs a daily activation email system that targets inactive users — those who signed up but have never played a game (gamesPlayed === 0). The email should be friendly, compelling, and kid/family-oriented, with a clear call-to-action button linking directly to dashden.app where they can pick a game. The system sends daily at 8am EST until the user plays their first game, at which point they are no longer considered inactive and stop receiving these emails. The system must include an unsubscribe mechanism for CAN-SPAM compliance.

## Glossary

- **Activation_Email_Service**: The Lambda function responsible for identifying inactive users and sending activation emails via the email provider
- **Inactive_User**: A user in the Cognito user pool whose gamesPlayed count equals zero in the DynamoDB game records table
- **Activation_Email**: The HTML email sent to inactive users containing a friendly message and a call-to-action button linking to dashden.app
- **Email_Provider**: The email sending service (Resend API) used to deliver emails from the dashden.app domain
- **Games_Table**: The DynamoDB table (memory-game-games-prod) storing game records used to determine user activity
- **Email_Preferences_Table**: The DynamoDB table (memory-game-email-prefs-prod) storing user email opt-in/out preferences
- **Unsubscribe_Mechanism**: The system allowing users to opt out of receiving activation emails

## Requirements

### Requirement 1: Identify Inactive Users

**User Story:** As a platform operator, I want to identify users who signed up but never played a game, so that I can target them with activation emails.

#### Acceptance Criteria

1. WHEN the Activation_Email_Service runs, THE Activation_Email_Service SHALL query the Cognito user pool to retrieve all registered users with verified email addresses
2. WHEN determining inactive status, THE Activation_Email_Service SHALL classify a user as inactive when that user has zero game records in the Games_Table
3. WHEN a user has one or more game records in the Games_Table, THE Activation_Email_Service SHALL exclude that user from the inactive user list
4. WHEN a user has opted out of activation emails via the Unsubscribe_Mechanism, THE Activation_Email_Service SHALL exclude that user from the inactive user list

### Requirement 2: Schedule Daily Execution

**User Story:** As a platform operator, I want the activation email to send daily at 8am EST, so that users receive it at a consistent and reasonable time.

#### Acceptance Criteria

1. THE Activation_Email_Service SHALL execute once daily at 8:00 AM Eastern Standard Time (UTC-5) / Eastern Daylight Time (UTC-4) depending on the current date
2. WHEN the scheduled trigger fires, THE Activation_Email_Service SHALL process all eligible inactive users in a single execution run
3. IF the Activation_Email_Service fails during execution, THEN THE Activation_Email_Service SHALL log the error with details including the number of users processed and the number of failures

### Requirement 3: Send Activation Email

**User Story:** As a platform operator, I want to send a compelling and kind email to inactive users, so that they are encouraged to come back and play their first game.

#### Acceptance Criteria

1. WHEN an inactive user is identified for emailing, THE Activation_Email_Service SHALL send one Activation_Email to that user's verified email address via the Email_Provider
2. THE Activation_Email SHALL include the user's first name or username in the greeting to personalize the message
3. THE Activation_Email SHALL contain a prominent call-to-action button with text "Play Now" or equivalent that links directly to https://dashden.app
4. THE Activation_Email SHALL use a friendly, encouraging, and kid/family-appropriate tone
5. THE Activation_Email SHALL mention at least one specific game available on DashDen (e.g., Space Entry, Code-a-Bot, Math Challenge) to give the user a concrete reason to engage
6. THE Activation_Email SHALL render correctly on mobile and desktop email clients using responsive HTML design
7. THE Activation_Email SHALL be sent from the verified dashden.app domain (no-reply@dashden.app)

### Requirement 4: Stop Sending After Activation

**User Story:** As a user, I want to stop receiving activation emails once I play my first game, so that I am not bothered by emails that no longer apply to me.

#### Acceptance Criteria

1. WHEN a user plays their first game (gamesPlayed transitions from 0 to 1), THE Activation_Email_Service SHALL exclude that user from all subsequent activation email runs
2. WHEN the Activation_Email_Service checks user eligibility, THE Activation_Email_Service SHALL verify the user's current game count at execution time to ensure the most up-to-date status is used

### Requirement 5: Unsubscribe Mechanism

**User Story:** As a parent or user, I want to opt out of activation emails without needing to log in, so that I can stop receiving them if I choose.

#### Acceptance Criteria

1. THE Activation_Email SHALL include a visible unsubscribe link in the email footer
2. WHEN a user clicks the unsubscribe link, THE Unsubscribe_Mechanism SHALL record the user's opt-out preference in the Email_Preferences_Table
3. WHEN a user has opted out, THE Activation_Email_Service SHALL not send any further activation emails to that user
4. THE Unsubscribe_Mechanism SHALL comply with CAN-SPAM requirements by processing unsubscribe requests within 10 business days
5. THE Activation_Email SHALL include the physical mailing address or business contact information as required by CAN-SPAM

### Requirement 6: Email Content Quality

**User Story:** As a platform operator, I want the activation email to be compelling and visually consistent with DashDen branding, so that users recognize the email and feel motivated to engage.

#### Acceptance Criteria

1. THE Activation_Email SHALL use the DashDen brand colors (purple/pink gradient) and visual style consistent with the existing daily digest email
2. THE Activation_Email SHALL include the DashDen name and a game-related emoji in the subject line to improve open rates
3. THE Activation_Email SHALL keep the body content concise — no more than 150 words of text content excluding footer
4. THE Activation_Email SHALL communicate a sense of fun and adventure appropriate for the target audience of kids and families
5. THE Activation_Email SHALL include a brief statement explaining why the user is receiving this email (e.g., "You signed up for DashDen but haven't played yet")

### Requirement 7: Operational Monitoring

**User Story:** As a platform operator, I want visibility into the activation email system performance, so that I can monitor delivery success and identify issues.

#### Acceptance Criteria

1. WHEN the Activation_Email_Service completes a run, THE Activation_Email_Service SHALL log the total number of inactive users found, emails sent successfully, and emails that failed to send
2. IF an individual email fails to send, THEN THE Activation_Email_Service SHALL log the failure with the user identifier and error details without halting processing of remaining users
3. WHEN the Activation_Email_Service completes, THE Activation_Email_Service SHALL return a summary response including counts of processed, sent, and failed emails
