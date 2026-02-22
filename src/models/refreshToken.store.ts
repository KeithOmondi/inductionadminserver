import { RefreshToken } from "./refreshToken.model";

/**
 * Save a refresh token (Upsert mode to handle race conditions)
 */
export const saveRefreshToken = async (record: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) => {
  return await RefreshToken.findOneAndUpdate(
    { tokenHash: record.tokenHash }, // Filter
    { 
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt 
    }, // Data
    { 
      upsert: true,     // Create if doesn't exist
      new: true,        // Return the updated doc
      runValidators: true 
    }
  );
};

/**
 * Find a refresh token by hash and remove expired ones
 */
export const findRefreshToken = async (tokenHash: string) => {
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) return null;

  // Check if expired
  if (new Date() > record.expiresAt) {
    await deleteRefreshToken(tokenHash);
    return null;
  }

  return record;
};

/**
 * Delete a refresh token by hash
 */
export const deleteRefreshToken = async (tokenHash: string) => {
  return await RefreshToken.deleteOne({ tokenHash });
};

/**
 * Delete all refresh tokens for a user
 */
export const deleteUserTokens = async (userId: string) => {
  return await RefreshToken.deleteMany({ userId });
};