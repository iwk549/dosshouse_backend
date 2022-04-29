const config = require("config");
const { url } = require("./allowables");

function makeEmailHeader(subject) {
  return `
      <!DOCTYPE html>
      <head>
      <title>${subject}</title>
      <meta http–equiv=“Content-Type” content=“text/html; charset=UTF-8” />
      <meta http–equiv=“X-UA-Compatible” content=“IE=edge” />
      <meta name=“viewport” content=“width=device-width, initial-scale=1.0 “ />
      </head>`;
}

function bodyStyle() {
  return `style="background-color:#f3e9fc; padding: 15px; border-radius: 5px;"`;
}

function makeEmailTextLinkFooter(link) {
  return `
      <br/>
      <br/>
      <hr/>
      <p><b>Some email providers automatically disable links from unknown senders</b></p>
      <p>If your link does not work you can copy the text below and paste it in your browser. 
      Please add ${config.resetEmail} to your contacts to enable future links.</p>
      <p>${link}</p>
      `;
}

function makeResetEmailHTML(user, token) {
  const link = `${url}/login?email=${user.email}&token=${token}`;
  return `${makeEmailHeader("Password Reset")}
    <body ${bodyStyle()}>
    <p>Hello ${user.name},</p>
      
  <p>A request was made to reset your Dosshouse password. Please click the link below to reset your password.</p>
  <a href="${link}" style="font-size: 25px;">Click here to reset your password</a>
    <br/>
    <br/>
    <p>If you did not make this request please sign in with your email and password to cancel the request.</p>
    <a href="${url}/login">Log In</a>
    ${makeEmailTextLinkFooter(link)}
    </body>
    `;
}

module.exports.makeResetEmailHTML = makeResetEmailHTML;
