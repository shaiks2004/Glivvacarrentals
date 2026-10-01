# Needs Human (External Credentials, Accounts & Real Assets)

This document tracks items that require human action, account provisioning, physical keys, or business decisions outside the autonomous agent environment.

---

## 1. Production API Credentials & Secrets
- [ ] **Production Supabase Project**: Provision remote Supabase project, configure project URL and restricted browser `anon` key in `glivva-react/.env.local`. Keep `service_role` key in server-side Edge Functions only.
- [ ] **WhatsApp Business API**: Account provisioning & Meta template approvals for transactional booking notifications.
- [ ] **SMS Gateway (India)**: DLT registration and approved SMS templates (e.g. Twilio / Textlocal / Msg91).
- [ ] **Transactional Email**: Resend / SendGrid / Postmark domain verification (SPF, DKIM, DMARC) and production API key.

## 2. Business Assets & Media
- [ ] **Real Vehicle Photography**: High-resolution exterior/interior photos for fleet cars (Swift, Creta, XUV700, Innova) to populate `storage.buckets['car-photos']` and replace `ImageSlot` placeholders.
- [ ] **Official Vehicle Compliance Documents**: Real scanned RC, Insurance policies, PUC certificates, Fitness certificates, and Road tax receipts for fleet compliance records.

## 3. Financial & Legal
- [ ] **Payment Gateway**: Production Razorpay / Stripe India account keys (live API keys and webhook signing secret).
- [ ] **Terms & Cancellation Policy**: Legal review of final rental agreement terms and security deposit refund SLAs.
