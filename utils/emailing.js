const { makeResetEmailHTML } = require("./htmlTemplates");
const sendSmtpEmail = require("./smtp.util");

const sendPasswordReset = async (user, token) => {
  const html = makeResetEmailHTML(user, token);
  const emailSent = await sendSmtpEmail(
    "Dosshouse Password Reset",
    html,
    user.email
  );
  return emailSent.accepted;
};

module.exports.sendPasswordReset = sendPasswordReset;
