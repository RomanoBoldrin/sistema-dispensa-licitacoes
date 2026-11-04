function getOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel (Preview or Production)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development / tests fallback
  return "http://localhost:3000";
}

const webserver = {
  origin: getOrigin(),
};

export default webserver;
