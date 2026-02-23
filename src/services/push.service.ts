import webpush from "web-push";
import { User } from "../models/user.model";
import { env } from "../config/env";

// Generate these once via: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: env.VAPID_PUBLIC_KEY!,
  privateKey: env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  "mailto:admin@yourdomain.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * Send Web Push to a specific user's subscriptions
 */
export const sendWebPush = async (
  userId: string,
  title: string,
  body: string,
  data: any = {}
) => {
  const user = await User.findById(userId).select("webPushSubscriptions");
  if (!user || !user.webPushSubscriptions) return;

  const notifications = user.webPushSubscriptions.map((sub: any) =>
    webpush.sendNotification(
      sub,
      JSON.stringify({
        title,
        body,
        data,
        icon: "/logo192.png", // Path to your web icon
      })
    ).catch(async (err) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Token expired or unsubscribed, remove it from DB
        await User.updateOne(
          { _id: userId },
          { $pull: { webPushSubscriptions: { endpoint: sub.endpoint } } }
        );
      }
    })
  );

  await Promise.all(notifications);
};