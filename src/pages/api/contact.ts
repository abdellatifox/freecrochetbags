import type { APIRoute } from 'astro';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim().slice(0, 100);
  const email = String(form.get('email') ?? '').trim().slice(0, 200);
  const body = String(form.get('body') ?? '').trim().slice(0, 5000);

  if (form.get('website')) return redirect('/contact?sent=1', 303);
  if (!name || !body || !EMAIL_RE.test(email)) return redirect('/contact?sent=0', 303);

  await locals.runtime.env.DB.prepare('INSERT INTO messages (name, email, body) VALUES (?, ?, ?)')
    .bind(name, email, body)
    .run();
  return redirect('/contact?sent=1', 303);
};
