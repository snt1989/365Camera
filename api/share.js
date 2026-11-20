// POST a JPEG (raw body) -> stored as a public file -> returns a shareable viewer link.
const MAX = 4.4 * 1024 * 1024;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  try {
    const chunks = []; let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > MAX) { res.status(413).json({ error: "too large" }); return; }
      chunks.push(c);
    }
    const buf = Buffer.concat(chunks);
    if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) { res.status(400).json({ error: "not a JPEG" }); return; }
    const kind = req.headers["x-kind"] === "360" ? "360" : "photo";
    const { put } = await import("@vercel/blob");
    const blob = await put("shared/" + kind + ".jpg", buf, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
    const origin = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
    res.status(200).json({ url: blob.url, view: origin + "/view.html?k=" + kind + "&u=" + encodeURIComponent(blob.url) });
  } catch (e) {
    res.status(500).json({ error: "upload failed" });
  }
};
