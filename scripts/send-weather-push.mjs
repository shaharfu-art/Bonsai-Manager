// Send a simulated weather alert push notification
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = 'BNgLKEnbLJXHHRMZfy-ax8J4cOPGMNSsGOShxIo_E0yQ3osJBRe37PWkQ5O_2HJw66PKD5PnXE5GFHVsxKF5cBM'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (!VAPID_PRIVATE_KEY) {
  console.error('Set VAPID_PRIVATE_KEY env var')
  process.exit(1)
}

webpush.setVapidDetails(
  'mailto:shaharfu@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/cLrBRgpvylo:APA91bHWw5fP3V-W8c5idK4TDSsgUOHoftsDoKpVfxm8w63KpTm139mEs5cvRamajuf09D13mxqz7XGT9a46eZgUDnVCDHbXHCcPc7Kn80YNNiYfB45mGrLnCxjrtAxrl0njNvnpZbVX',
  keys: {
    p256dh: 'BC50x8Cl_6bfrG9C-WrwGS-o97gYrepTFWdj_l1l36D1g3FSHsrBcsA0_9nj4ONg0D6pT1wNubSjZVWkTRmtbZA',
    auth: 'Yad2IQ6MNlyBpja-nM3X7w'
  }
}

const payload = JSON.stringify({
  title: '🔥 התראת חמסין!',
  body: 'מחר צפויות טמפרטורות של 42°C. העבר את העצים לצל והשקה כפולה בבוקר המוקדם!',
  icon: '/pwa-192x192.png',
  data: { url: '/dashboard' }
})

try {
  const result = await webpush.sendNotification(subscription, payload)
  console.log('Push sent successfully:', result.statusCode)
} catch (err) {
  console.error('Push failed:', err.message)
}
