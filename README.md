# Misty II Covid Screening

By Hunter Giannini, Cody Hungerford, Michael Reynolds, and Shawn Ramos For CIS 497 - Senior Project at the University of South Alabama, Fall 2020

## API and Data Setup
At the top of the program, you will notice a code block containing places for API keys for various services
```js
//API Keys and Sendgrid Template Keys
misty.Set("imgurClientID", "INSERT_IMGUR_API_KEY_HERE", false)
misty.Set("sendGridKey", "INSERT_SENDGRID_API_KEY_HERE", false)
misty.Set("adminAlertTemplate", "INSERT_SENDGRID_TEMPLATE_ID_HERE", false)
misty.Set("adminLogTemplate",   "INSERT_SENDGRID_TEMPLATE_ID_HERE", false)
misty.Set("userReceiptTemplate","INSERT_SENDGRID_TEMPLATE_ID_HERE", false)

// Email Accounts Associated with Misty
misty.Set("userList", 'INSERT_REGISTERED_USERS_HERE')
misty.Set("adminEmail", "INSERT_ADMIN_EMAIL_HERE", false)
misty.Set("sendingEmail", "INSERT_SENDER_EMAIL_HERE", false)
```
Going through each of those keys:

`imgurClientID` - Used to anonymously upload images to the image hosting service Imgur. You can get your own API key by signing up at https://api.imgur.com/oauth2/addclient

`sendGridKey` - Main API Key for the emailing service SendGrid. You can sign up at app.sendgrid.com and read their API documentation for more information

`adminAlertTemplate` - The ID for the SendGrid template used for alert emails sent to the admin. You can design it however you want, but there is an example in the Template Examples directory.

`adminLogTemplate` - The ID for the SendGrid template used for log emails sent to the admin. You can design it however you want, but there is an example in the Template Examples directory.

`userReceiptTemplate` - The ID for the SendGrid template used for emails sent to the end user. You can design it however you want, but there is an example in the Template Examples directory.

There is also a number of emails that are associated with the service:

`userList` - A string containing JSON object with the names of user's who Misty is face trained on with their corresponding emails, set up the following way:
```js
{"Hunter": "hunter@whatever.com", "Bob": "bob@bob.com", "Misty": "misty@misty.com"}
```
`adminEmail`  - The email to which all alerts and logs are sent to.

`sendingEmail` - The email associated with sent emails. Try not to let this be a standard gmail, yahoo, or any other free account, as it can more likely for it to be marked as spam in the receiver's inbox.
