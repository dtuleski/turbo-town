import { Link } from 'react-router-dom'
import LegalLayout, { LEGAL_CONTACT_EMAIL } from './LegalLayout'

const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>

/** Public support page (App Store "Support URL"); no sign-in needed. */
export default function SupportPage() {
  return (
    <LegalLayout title="Support">
      <p>
        Need help with DashDen? Write to {mail}. We usually answer within two business days. Please include the email
        address of your DashDen account.
      </p>

      <h2>Signing in</h2>
      <ul>
        <li>Forgot your password? On the sign-in screen, tap "Forgot password" and follow the code we email you.</li>
        <li>Signed up with Google or Apple? Use the same button again to sign in.</li>
        <li>Didn't get the confirmation email? Check your spam folder, then use "Resend code".</li>
      </ul>

      <h2>Plans and billing</h2>
      <ul>
        <li>
          Bought in the iPhone app: manage or cancel in iPhone Settings, under your name, Subscriptions. Refunds for
          App Store purchases are handled by Apple at reportaproblem.apple.com.
        </li>
        <li>Bought on dashden.app: manage or cancel from the Plans page on the website.</li>
        <li>A plan works on both the iPhone app and the website.</li>
      </ul>

      <h2>Notifications and emails</h2>
      <p>
        Turn the morning summary email and all notifications on or off in Profile, under "Daily emails and
        notifications".
      </p>

      <h2>Deleting your account</h2>
      <p>
        In the iPhone app, open Profile and tap Delete account. This deletes your account and game data at once and
        cancels a plan bought on dashden.app. A plan bought in the App Store must be cancelled in iPhone Settings. You can
        also ask us by email from your account's address.
      </p>

      <p>
        See also our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link>.
      </p>
    </LegalLayout>
  )
}
