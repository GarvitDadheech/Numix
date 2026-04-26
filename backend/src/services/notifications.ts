export async function sendPushNotification(
  nullifier_hash: string,
  title: string,
  message: string
): Promise<unknown> {
  const response = await fetch(
    'https://developer.worldcoin.org/api/v2/minikit/send-notification',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEV_PORTAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id:              process.env.APP_ID,
        external_nullifier:  nullifier_hash,
        title,
        message,
      }),
    }
  );
  return response.json();
}
