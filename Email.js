// Email.gs

function sendEmail_(to, subject, body, senderName) {
  if (!to) throw new Error('mail to is empty');
  if (!subject) throw new Error('mail subject is empty');

  if (isTestMode_()) {
    if (String(to || '').indexOf(TEST_FAIL_EMAIL_ADDRESS) >= 0) {
      throw new Error('mail failed: simulated failure in test mode');
    }
    recordFakeEmailPost_(to, subject, body);
    return;
  }

  GmailApp.sendEmail(
    String(to).trim(),
    String(subject),
    String(body || ''),
    {
      name: senderName || 'すくベビ自動化通知'
    }
  );
}

function sendAdminAlertEmail_(adminEmail, subject, body, senderName) {
  if (!adminEmail) return;

  GmailApp.sendEmail(
    String(adminEmail).trim(),
    String(subject || '障害通知'),
    String(body || ''),
    {
      name: senderName || 'すくベビ自動化通知'
    }
  );
}