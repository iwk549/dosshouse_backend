const nodemailer = require("nodemailer");
const config = require("config");
const logger = require("../startup/logging")();

const { makeResetEmailHTML } = require("./htmlTemplates");

const credentials = {
  host: "mail.privateemail.com",
  port: 465,
  secure: true,
  auth: {
    user: config.resetEmail,
    pass: config.resetEmailPassword,
  },
  tls: {
    secureProtocol: "TLSv1_method",
    rejectUnauthorized: false,
  },
};

const sendEmail = async (subject, html, to) => {
  let transporter = nodemailer.createTransport(credentials);
  try {
    return await transporter.sendMail({
      from: `'Dosshouse' <${credentials.auth.user}>`,
      to,
      subject,
      text: subject,
      html,
    });
  } catch (ex) {
    logger.log("error", ex);
  }
};

const sendPasswordReset = async (user, token) => {
  const html = makeResetEmailHTML(user, token);
  const emailSent = await sendEmail(
    "Dosshouse Password Reset",
    html,
    user.email
  );
  return emailSent.accepted?.length === 1;
};

module.exports.sendPasswordReset = sendPasswordReset;
