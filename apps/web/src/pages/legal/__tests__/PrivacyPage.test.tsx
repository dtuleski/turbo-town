import { describe, expect, it } from 'vitest'
import PrivacyPage from '../PrivacyPage'
import { decode, renderMarkup } from '@/test/renderWithProviders'

/** NFR-DC-2: the policy covers the Daily Challenge and push data (application design plan Q9). */
const text = decode(renderMarkup(<PrivacyPage />))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')

describe('PrivacyPage daily challenge and push text', () => {
  it.each([
    ['push token and time zone', "if you allow notifications in the iPhone app, a push token for your device, the device's time zone and language"],
    ['time zone use', 'so the daily summary and the challenge reminder arrive at the right local time'],
    ['use', 'To send the morning summary and the daily challenge reminder when "Daily emails and notifications" is on.'],
    ['challenge leaderboard', 'Your username and your best score on the daily challenge leaderboard, shown to other signed-in players.'],
    ['SNS and APNs', 'Amazon Web Services (Amazon SNS) and Apple (Apple Push Notification service): delivery of push notifications.'],
    ['token retention', 'A push token until you sign out on that device, delete your account, or Apple reports it as no longer valid.'],
    ['score retention', 'Daily challenge scores as long as your account exists.'],
    ['deletion', 'Deleting your account also removes your devices and your daily challenge scores.'],
  ])('covers %s', (_, sentence) => {
    expect(text).toContain(sentence)
  })
})
