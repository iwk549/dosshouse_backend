const logger = require("../startup/logging")();
const fs = require("fs");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { smtpEmail } = require("./allowables");

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendSmtpEmail(
  subject,
  html,
  to,
  replyTo,
  bcc,
  overrideEnvironment
) {
  if (process.env.NODE_ENV !== "production" && !overrideEnvironment) {
    if (!process.env.ALLOW_EMAILING || process.env.ALLOW_EMAILING !== "true") {
      // eslint-disable-next-line no-console
      console.log("Email not sent, in non-production environment.");
      let dir = "./tmp";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFileSync(
        `${dir}/${bcc ? "bccs" : to}.email.html`,
        html || "no html created",
        () => {}
      );

      return { accepted: true };
    }
  }

  if (!replyTo) replyTo = smtpEmail;
  const params = {
    Source: `'Dosshouse' <${smtpEmail}>`,
    ReplyToAddresses: [replyTo],
    Destination: {
      ToAddresses: [to],
      BccAddresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        Text: { Data: html.replaceAll(/<[^>]+>/g, "") },
      },
    },
  };

  try {
    const result = await sesClient.send(new SendEmailCommand(params));
    return { ...result, accepted: result.$metadata?.httpStatusCode === 200 };
  } catch (error) {
    logger.log("error", error.message);
    return { accepted: false };
  }
}

module.exports = sendSmtpEmail;
