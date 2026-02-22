import * as admin from "firebase-admin";
import { User } from "../models/user.model";

// Decode Base64 service account
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, "base64").toString(
    "utf-8",
  ),
);

// Fix potential private key newline issues after base64 decode
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Send push notification via FCM
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data: any = {},
) => {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.entries(data).reduce(
        (acc, [key, val]) => {
          acc[key] = String(val); // FCM data must be strings
          return acc;
        },
        {} as Record<string, string>,
      ),
    });

    console.log("🔔 Push sent to", token);
  } catch (err) {
    console.error("Push error:", err);
  }
};

/**
 * 🔹 FIXED: Get all tokens for a list of users
 * Since fcmTokens is now an array, we flatMap them.
 */
export const getFCMTokensForUsers = async (
  userIds: string[],
): Promise<string[]> => {
  const users = await User.find({
    _id: { $in: userIds },
    "fcmTokens.0": { $exists: true }, // Only find users who have at least 1 token
  })
    .select("fcmTokens")
    .lean();

  // Extract all tokens from all found users into one flat array
  return users.flatMap((u) => u.fcmTokens || []);
};
