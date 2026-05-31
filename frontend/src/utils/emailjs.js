import emailjs from '@emailjs/browser'

const SERVICE_ID  = 'service_m8qpurh'
const TEMPLATE_ID = 'template_i30t3qu'
const PUBLIC_KEY  = 'l3V6kGCFtUEsTNGsP'

export const sendOtpEmail = async (email, code) => {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { email, passcode: code },
    PUBLIC_KEY
  )
}
