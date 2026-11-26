import LegalLayout, { LEGAL_CONTACT_EMAIL, LEGAL_PUBLISHER } from './LegalLayout'

const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        DashDen (the website at dashden.app and the DashDen app for iPhone) is published by {LEGAL_PUBLISHER}, an
        individual based in the United States ("we", "us"). This policy explains what we collect, why, who we share it
        with, and how you can delete it. Questions: {mail}.
      </p>

      <h2>Who DashDen is for</h2>
      <p>
        Accounts are for adults. A parent or guardian creates the account, manages any subscription, and may let
        children in their care play the games under that account. Children under 13 must not create their own account.
        If we learn that a child under 13 created an account, we delete it. A parent or guardian who believes this has
        happened can write to {mail}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> email address, username and display name. Passwords are handled by Amazon
          Cognito; we never see them. If you sign in with Google or Apple, we receive your name and email address (or
          Apple's private relay address) from that provider.
        </li>
        <li>
          <strong>Game activity:</strong> games played, scores, times, progress, achievements, and reviews or ratings
          you submit.
        </li>
        <li>
          <strong>Subscription details:</strong> your plan, its status and renewal dates. Payments are processed by
          Stripe (on the website) or Apple (in the iPhone app). We do not receive or store card numbers.
        </li>
        <li>
          <strong>Messages and preferences:</strong> what you send through the contact form, and your email settings
          (for example the daily summary email).
        </li>
        <li>
          <strong>Technical data:</strong> on the website, your IP address is used once to look up your country, so we
          can offer the right language content. The website uses Vercel Web Analytics, which counts page views without
          cookies and without identifying you.
        </li>
        <li>
          <strong>Voice:</strong> pronunciation games use the speech recognition built into your device or browser.
          Audio is processed by Apple (on iPhone) or your browser's provider; DashDen does not record or store audio.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account, save your progress and show your scores.</li>
        <li>To provide the plan you pay for and handle billing questions.</li>
        <li>To send the emails you choose, and to answer your messages.</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>
      <p>
        We do not sell your data, show ads, or track you across other companies' apps and websites.
      </p>

      <h2>What other people can see</h2>
      <p>Your display name and scores appear on leaderboards that other DashDen users can see.</p>

      <h2>Who we share it with</h2>
      <p>Only the service providers that run DashDen for us, each for its own part:</p>
      <ul>
        <li>Amazon Web Services: hosting, data storage, sign-in (Cognito) and email delivery.</li>
        <li>Stripe: payments on the website.</li>
        <li>Apple: payments in the iPhone app, and Sign in with Apple.</li>
        <li>Google: Sign in with Google.</li>
        <li>Vercel: website hosting and page-view analytics.</li>
        <li>ipapi.co: country lookup from your IP address on the website.</li>
      </ul>
      <p>We may also disclose data when the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account exists. When you delete your account, we delete your account details,
        game activity, reviews, preferences and subscription record, and remove your scores from leaderboards. Stripe
        and Apple keep their own payment records, as tax and accounting rules require.
      </p>

      <h2>Deleting your account</h2>
      <p>
        In the iPhone app, open Profile and tap Delete account. You can also write to {mail} from the email address on
        your account. Deleting your account cancels a subscription bought on dashden.app at once. A subscription bought
        in the App Store must be cancelled by you in iPhone Settings, under Apple Account, Subscriptions.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can see and change your details in the app, turn emails off at any time, and ask us for a copy of your data
        or to correct or delete it by writing to {mail}. Residents of California and other US states with privacy laws
        have these rights by law; we honor them for everyone. We will not treat you differently for using them.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and stored with Amazon Web Services. No system is perfectly secure; if a breach
        affects your data, we will tell you as the law requires.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we will update the effective date above, and tell you in the app or by email when the
        change is significant.
      </p>
    </LegalLayout>
  )
}
