import type { APIRoute } from 'astro';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();

  // Honeypot filled in → pretend success, store nothing.
  if (form.get('website')) return redirect('/?subscribed=1#newsletter', 303);
  if (!EMAIL_RE.test(email) || email.length > 200) return redirect('/?subscribed=0#newsletter', 303);

  await locals.runtime.env.DB.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').bind(email).run();
  return redirect('/?subscribed=1#newsletter', 303);
};
