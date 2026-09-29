/**
 * Pages are static, so form results (?subscribed=1, ?sent=0 …) are shown in the browser:
 * every element with data-notice="key=value" is revealed when the URL has that query value.
 */
export function showNotices() {
  const params = new URLSearchParams(location.search);
  for (const el of document.querySelectorAll<HTMLElement>('[data-notice]')) {
    const [key, value] = (el.dataset.notice ?? '').split('=');
    if (key && params.get(key) === value) el.hidden = false;
  }
}
