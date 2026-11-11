// English messages: notifications. Keys are "notifications.<name>"; {param}
// placeholders.
export default {
  "notifications.title": "Notifications",
  "notifications.description":
    "Send this site's traffic alerts and scheduled summaries to Slack, Discord, Telegram or a webhook.",
  "notifications.back": "Settings",
  "notifications.settingsDescription":
    "Traffic alerts and summaries for chat apps and webhooks.",
  "notifications.open": "Manage channels",
  "notifications.listTitle": "Channels",
  "notifications.listDescription": "Where alerts and summaries for {site} go.",
  "notifications.empty": "No channels",
  "notifications.emptyDescription":
    "Add a channel to send alerts and summaries outside email.",
  "notifications.unavailableTitle": "Channels unavailable",
  "notifications.unavailable":
    "Storage is unavailable, so channels cannot be read or changed. Retry in a moment.",
  "notifications.typeSlack": "Slack",
  "notifications.typeDiscord": "Discord",
  "notifications.typeTelegram": "Telegram",
  "notifications.typeWebhook": "Webhook (JSON)",
  "notifications.alertEither":
    "Alerts when pageviews change {threshold}% or more",
  "notifications.alertIncrease":
    "Alerts when pageviews rise {threshold}% or more",
  "notifications.alertDecrease":
    "Alerts when pageviews fall {threshold}% or more",
  "notifications.lastSent": "Last sent {date}.",
  "notifications.lastFailed":
    "Last delivery failed {date}. gtcd retries later.",
  "notifications.failedBadge": "Failed",
  "notifications.nothingSent": "Nothing sent yet.",
  "notifications.sendTest": "Send test message",
  "notifications.delete": "Delete",
  "notifications.addTitle": "Add a channel",
  "notifications.addDescription":
    "gtcd shows webhook URLs and bot tokens masked after saving.",
  "notifications.type": "Channel type",
  "notifications.name": "Name",
  "notifications.nameHelp": "Shown in this list, e.g. #analytics.",
  "notifications.url": "Webhook URL",
  "notifications.urlHelpSlack": "The https:// URL of a Slack incoming webhook.",
  "notifications.urlHelpDiscord":
    "The https:// URL from the Discord channel's Integrations settings.",
  "notifications.urlHelpWebhook":
    'gtcd POSTs JSON with "event", "site" and "text" to this https:// URL.',
  "notifications.botToken": "Bot token",
  "notifications.chatId": "Chat ID",
  "notifications.telegramHelp":
    "Use the token from @BotFather and a numeric chat ID or @channelname. Add the bot to the chat first.",
  "notifications.receives": "Sends",
  "notifications.alerts": "Daily traffic alerts",
  "notifications.summaries": "Scheduled summaries",
  "notifications.receivesHelp":
    "Messages follow your language and number settings. Alerts check the previous day; summaries cover the last full period.",
  "notifications.add": "Add channel",
  "notifications.limit": "A site can have up to 10 channels. Delete one first.",
  "notifications.added": "Channel added. Messages start with the next period.",
  "notifications.deleted": "Channel deleted.",
  "notifications.testSent": "Test message delivered.",
  "notifications.testText":
    "Test message from gtcd for {site}. Traffic alerts and summaries for this site will arrive here.",
  "notifications.invalid": "Check the channel fields and try again.",
  "notifications.nameInvalid": "Enter a name of up to 80 characters.",
  "notifications.receivesInvalid":
    "Choose traffic alerts, scheduled summaries or both.",
  "notifications.telegramInvalid":
    "Enter a bot token from @BotFather and a numeric chat ID or @channelname.",
  "notifications.urlInvalid": "Enter a valid URL.",
  "notifications.urlProtocol": "Use an https:// URL.",
  "notifications.urlCredentials":
    "Remove the user name and password from the URL.",
  "notifications.urlPrivate":
    "This URL points to a private, local or reserved address. gtcd sends only to public hosts.",
  "notifications.urlUnresolved":
    "gtcd could not find this host. Check the URL and try again.",
  "notifications.saveFailed": "The channel was not saved. Retry in a moment.",
  "notifications.notFound": "This channel no longer exists. Reload the page.",
  "notifications.testRefused":
    "The receiver rejected the test message (HTTP {status}). Check the URL or token.",
  "notifications.testFailed":
    "The test message could not be delivered. Check that the receiver is reachable and answers within 10 seconds.",
} as const satisfies Record<`notifications.${string}`, string>;
