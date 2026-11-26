import { Link } from 'react-router-dom'
import LegalLayout, { LEGAL_CONTACT_EMAIL, LEGAL_PUBLISHER } from './LegalLayout'

const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms cover your use of DashDen, the website at dashden.app and the DashDen app for iPhone, published by{' '}
        {LEGAL_PUBLISHER} in the United States ("we", "us"). By creating an account or using DashDen you agree to them.
        Our <Link to="/privacy">Privacy Policy</Link> explains how we handle your data.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must be 18 or older to create an account.</li>
        <li>
          You may let children in your care play under your account. You are responsible for their use of DashDen and
          for any purchase made with your account.
        </li>
        <li>Keep your sign-in details safe and tell us at {mail} if you think someone else is using your account.</li>
        <li>You can delete your account at any time in the app (Profile, Delete account).</li>
      </ul>

      <h2>Plans and billing</h2>
      <ul>
        <li>DashDen has a free plan and paid monthly plans that unlock more games and plays.</li>
        <li>
          Paid plans renew every month until you cancel. You can cancel at any time; the plan stays active until the end
          of the period you paid for.
        </li>
        <li>
          Plans bought on dashden.app are billed by Stripe and managed on the website. Plans bought in the iPhone app
          are billed by Apple to your Apple Account and managed in iPhone Settings, under Apple Account, Subscriptions.
          Apple's{' '}
          <a href={APPLE_EULA} target="_blank" rel="noreferrer">
            standard license agreement
          </a>{' '}
          also applies to purchases in the app, and refunds for them are handled by Apple.
        </li>
        <li>Prices are shown before you buy. If a price changes, we will tell you before it applies to you.</li>
        <li>You cannot have a paid plan through both the website and the App Store at the same time.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please do not:</p>
      <ul>
        <li>cheat, automate play, or tamper with scores or leaderboards;</li>
        <li>use offensive display names or reviews;</li>
        <li>try to break into, overload or reverse engineer the service;</li>
        <li>use DashDen in a way that breaks the law or harms others.</li>
      </ul>
      <p>We may remove content, reset scores, or suspend accounts that break these rules.</p>

      <h2>Our content</h2>
      <p>
        The games, artwork, text and software in DashDen belong to us or our licensors. You may use them for personal,
        non-commercial play. Reviews you submit remain yours; you allow us to show them in DashDen.
      </p>

      <h2>Educational content</h2>
      <p>
        We work to keep facts, translations and lessons accurate, but DashDen is for practice and fun and is not a
        replacement for school or professional advice.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We may change, add or remove games and features. We aim to keep DashDen running but cannot promise it will
        always be available or error-free.
      </p>

      <h2>Disclaimers and limits</h2>
      <p>
        DashDen is provided "as is". To the extent the law allows, we are not liable for indirect or incidental damages,
        and our total liability to you is limited to the amount you paid us in the 12 months before the claim. Some
        places do not allow these limits, so they may not apply to you.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using DashDen and delete your account at any time. We may end or suspend accounts that break these
        terms.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of the United States and of the state where the publisher resides.</p>

      <h2>Changes to these terms</h2>
      <p>
        We will update the effective date above when these terms change, and tell you in the app or by email when the
        change is significant. Continuing to use DashDen after a change means you accept it.
      </p>

      <h2>Contact</h2>
      <p>{mail}</p>
    </LegalLayout>
  )
}
